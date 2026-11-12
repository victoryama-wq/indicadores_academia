import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { ACADEMIC_DATA, TEACHER_CONTEXT } from '../models';
import { NavigationContext } from '../navigation-context';
import { CYCLES, INPUT_TYPES, InputBatch, InputType, InputVersion } from './report-models';
import { seedBatches } from './report-fixtures';
import { validateInput } from './input-validation';
interface Seed {
  status: 'loading' | 'ready' | 'error';
  batches: InputBatch[];
}

@Injectable({
  providedIn: 'root',
})
export class CycleInputStore {
  private readonly nav = inject(NavigationContext);
  private readonly seed = toSignal(
    inject(ACADEMIC_DATA)
      .query(TEACHER_CONTEXT)
      .pipe(
        map((snapshot): Seed => ({ status: 'ready', batches: seedBatches(snapshot) })),
        catchError(() => of<Seed>({ status: 'error', batches: [] })),
      ),
    { initialValue: { status: 'loading' as const, batches: [] } },
  );
  readonly status = computed(() => this.seed().status);
  readonly storageWarning = signal('');
  private readonly storageKey = 'academia-inputs-demo-v1';
  private readonly overrides = signal<Readonly<Record<string, InputVersion>>>(this.restore());
  version(type: InputType, cycle: string): InputVersion | null {
    const saved = this.overrides()[cycle + ':' + type];
    if (saved) return saved;
    const batch = this.seed().batches.find((b) => b.tipo === type && b.ciclo === cycle);
    return batch
      ? {
          batch,
          version: 1,
          filename: 'Conjunto ficticio precargado',
          activatedAt: '2026-11-06T18:00:00-05:00',
        }
      : null;
  }
  /** Revalidación y reemplazo atómico del tipo/ciclo. */
  activate(type: InputType, cycle: string, text: string, filename: string): string | null {
    if (this.nav.profile() !== 'sistemas')
      return 'Solo el perfil simulado de Sistemas puede activar insumos.';
    const checked = validateInput(text, type, cycle);
    if (!checked.batch) return 'Carga inválida. Se conserva la versión vigente.';
    const version: InputVersion = {
      batch: checked.batch,
      version: (this.version(type, cycle)?.version ?? 0) + 1,
      filename,
      activatedAt: new Date().toISOString(),
    };
    const next = { ...this.overrides(), [cycle + ':' + type]: version };
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(next));
    } catch {
      return 'No se pudo guardar la simulación en esta pestaña. Se conserva la versión anterior.';
    }
    this.overrides.set(next);
    return null;
  }
  private restore(): Record<string, InputVersion> {
    try {
      const raw: unknown = JSON.parse(sessionStorage.getItem(this.storageKey) ?? '{}');
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Formato');
      const restored: Record<string, InputVersion> = {};
      for (const cycle of CYCLES)
        for (const type of INPUT_TYPES) {
          const key = cycle.value + ':' + type;
          const entry: unknown = (raw as Record<string, unknown>)[key];
          if (entry === undefined) continue;
          if (!entry || typeof entry !== 'object') throw new Error('Versión');
          const v = entry as Record<string, unknown>;
          const valid = validateInput(JSON.stringify(v['batch']), type, cycle.value);
          if (
            !valid.batch ||
            typeof v['version'] !== 'number' ||
            !Number.isInteger(v['version']) ||
            v['version'] < 1 ||
            typeof v['filename'] !== 'string' ||
            typeof v['activatedAt'] !== 'string'
          )
            throw new Error('Datos');
          restored[key] = {
            batch: valid.batch,
            version: v['version'],
            filename: v['filename'],
            activatedAt: v['activatedAt'],
          };
        }
      return restored;
    } catch {
      this.storageWarning.set(
        'No se pudo recuperar una simulación guardada. Se muestra el conjunto ficticio inicial.',
      );
      return {};
    }
  }
}
