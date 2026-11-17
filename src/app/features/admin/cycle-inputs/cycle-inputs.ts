import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NavigationContext } from '../../../core/navigation-context';
import { CycleInputStore } from '../../../core/reporting/cycle-input-store';
import {
  CYCLES,
  INPUT_LABELS,
  INPUT_TYPES,
  InputType,
  Validation,
} from '../../../core/reporting/report-models';
import { validateInput } from '../../../core/reporting/input-validation';
import { sampleBatch } from '../../../core/reporting/report-fixtures';
import { populationSample } from '../../../core/reporting/population-fixtures';
import { PopulationView } from '../../../shared/population-view';
import { CalendarScheduleView } from '../../../shared/calendar-schedule-view/calendar-schedule-view';

interface Draft {
  text: string;
  filename: string;
  reading: boolean;
  validation: Validation | null;
  message: string;
  activated: boolean;
  imported?: Validation;
}

@Component({
  selector: 'app-cycle-inputs',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    CalendarScheduleView,
    PopulationView,
  ],
  templateUrl: './cycle-inputs.html',
  styleUrl: './cycle-inputs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CycleInputs {
  readonly nav = inject(NavigationContext);
  readonly store = inject(CycleInputStore);
  readonly cycles = CYCLES;
  readonly types = INPUT_TYPES;
  readonly labels = INPUT_LABELS;
  private readonly drafts = signal<Readonly<Record<string, Draft>>>({});
  private readonly reads = new Map<string, number>();
  readonly current = computed(() => this.store.population(this.nav.context().periodo));
  readonly previews = computed(() =>
    Object.fromEntries(
      (['saeko', 'spai'] as const).map((t) => {
        const d = this.draft(t),
          b = d?.validation?.batch;
        return [
          t,
          b && !d?.activated && (b.tipo === 'saeko' || (b.tipo === 'spai' && b.imparticiones))
            ? this.store.population(this.nav.context().periodo, b)
            : null,
        ];
      }),
    ),
  );
  draft(type: InputType) {
    return this.drafts()[this.nav.context().periodo + ':' + type];
  }
  schedule(validation: Validation) {
    return validation.batch?.tipo === 'calendario' ? validation.batch.programacion : undefined;
  }
  async selectFile(type: InputType, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const key = this.nav.context().periodo + ':' + type;
    const cycle = this.nav.context().periodo;
    const token = (this.reads.get(key) ?? 0) + 1;
    this.reads.set(key, token);
    const draft: Draft = {
      text: '',
      filename: file?.name ?? '',
      reading: !!file,
      validation: null,
      message: '',
      activated: false,
    };
    this.drafts.update((v) => ({ ...v, [key]: draft }));
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Límite de la demo: 2 MiB por archivo.');
      if (
        file.name.toLowerCase().endsWith('.xlsx') &&
        (type === 'calendario' || type === 'saeko' || type === 'spai')
      ) {
        let imported: Validation;
        if (type === 'calendario') {
          const { readCalendarXlsx } = await import('../../../core/reporting/calendar-xlsx');
          imported = await readCalendarXlsx(file, cycle);
        } else {
          const { default: read } = await import('read-excel-file/universal');
          const { parsePopulationSheets } =
            await import('../../../core/reporting/population-import');
          imported = parsePopulationSheets(
            await read(await file.arrayBuffer(), { trim: false }),
            type,
            cycle,
          );
        }
        if (this.reads.get(key) === token)
          this.drafts.update((v) => ({
            ...v,
            [key]: {
              ...draft,
              reading: false,
              imported,
              text: imported.batch ? JSON.stringify(imported.batch) : '',
              message: 'XLSX leído. Valida para revisar las filas e incidencias.',
            },
          }));
        return;
      }
      if (!file.name.toLowerCase().endsWith('.json'))
        throw new Error('Usa XLSX de calendario, Saeko o SPAI, o una plantilla JSON del insumo.');
      const text = await file.text();
      if (!text.trim()) throw new Error('El archivo está vacío. Se conserva la versión vigente.');
      if (this.reads.get(key) === token)
        this.drafts.update((v) => ({ ...v, [key]: { ...draft, reading: false, text } }));
    } catch (error) {
      if (this.reads.get(key) === token)
        this.drafts.update((v) => ({
          ...v,
          [key]: {
            ...draft,
            reading: false,
            message: error instanceof Error ? error.message : 'No se pudo leer el archivo.',
          },
        }));
    }
  }
  validate(type: InputType) {
    const d = this.draft(type);
    if (!d || d.reading) return;
    const validation = d.imported ?? validateInput(d.text, type, this.nav.context().periodo);
    this.setDraft(type, {
      ...d,
      validation,
      message: validation.errors.length
        ? 'Validación rechazada. La versión vigente no cambia.'
        : 'Validación correcta. Revisa la vista previa antes de activar.',
      activated: false,
    });
  }
  activate(type: InputType) {
    const d = this.draft(type);
    if (!d?.validation?.batch || d.reading || d.activated) return;
    const error = this.store.activate(type, this.nav.context().periodo, d.text, d.filename);
    this.setDraft(type, {
      ...d,
      activated: !error,
      message: error ?? 'Activación simulada completada. Nueva versión vigente en esta pestaña.',
    });
  }
  setCutoff(value: string) {
    const d = this.draft('saeko'),
      b = d?.imported?.batch;
    if (!d || b?.tipo !== 'saeko') return;
    const text = JSON.stringify({ ...b, fechaCorte: value || null });
    this.setDraft('saeko', {
      ...d,
      text,
      imported: validateInput(text, 'saeko', b.ciclo),
      validation: null,
      activated: false,
      message: 'Valida el padrón con su fecha de corte.',
    });
  }
  sample(type: InputType, assignment = false) {
    const cycle = this.nav.context().periodo;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            assignment ? populationSample('spai', cycle) : sampleBatch(type, cycle),
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assignment ? 'asignaciones-spai' : type}-${cycle}-ficticio.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  private setDraft(type: InputType, draft: Draft) {
    this.drafts.update((v) => ({ ...v, [this.nav.context().periodo + ':' + type]: draft }));
  }
}
