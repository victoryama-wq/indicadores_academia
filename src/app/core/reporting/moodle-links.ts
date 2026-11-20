import { Injectable, signal } from '@angular/core';
import { excludedCourse } from './population';
import type { InputVersion } from './report-models';

export interface CourseLink {
  row: number;
  status: 'linked' | 'missing' | 'review';
  courseId?: number;
  fullname?: string;
  reason?: string;
}
interface LinkResult {
  version: number;
  links?: CourseLink[];
  message?: string;
}
export async function localQuery<T>(
  path: string,
  key: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    cache: 'no-store',
    redirect: 'error',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la lectura.');
  return data;
}

@Injectable({ providedIn: 'root' })
export class MoodleLinks {
  readonly local = location.origin === 'http://127.0.0.1:4380';
  private readonly storage = 'academia-vinculos-spai';
  private readonly results = signal<Record<string, LinkResult>>(this.restore());
  private readonly attempts = new Map<string, number>();

  private restore(): Record<string, LinkResult> {
    try {
      return JSON.parse(sessionStorage.getItem(this.storage) ?? '{}') ?? {};
    } catch {
      return {};
    }
  }
  result(cycle: string): LinkResult | undefined {
    return this.results()[cycle];
  }

  path(cycle: string, version: number) {
    const name = 'academia-pestana-spai';
    let tab = sessionStorage.getItem(name);
    if (!tab) {
      tab = crypto.randomUUID();
      sessionStorage.setItem(name, tab);
    }
    return '/api/moodle/vinculos/' + tab + '/' + cycle + '/' + version;
  }
  private save(cycle: string, value: LinkResult) {
    this.results.update((all) => ({ ...all, [cycle]: value }));
    try {
      sessionStorage.setItem(this.storage, JSON.stringify(this.results()));
    } catch {
      /* El resultado sigue disponible durante esta sesión de la aplicación. */
    }
  }
  async activate(input: InputVersion, key: string) {
    const { batch, version } = input;
    if (batch.tipo !== 'spai') return;
    const cycle = batch.ciclo;
    const attempt = (this.attempts.get(cycle) ?? 0) + 1;
    this.attempts.set(cycle, attempt);
    const enrollmentOnly =
      'La versión vigente contiene inscripciones. Carga y activa el archivo de asignaciones SPAI con número, materia y grupo base para vincular cursos Moodle.';
    if (!batch.imparticiones && (!this.local || !key)) {
      this.save(cycle, { version, message: enrollmentOnly });
      return;
    }
    if (!this.local || !key.trim()) {
      this.save(cycle, {
        version,
        message: 'Vinculación pendiente. Abre Insumos en el piloto local e introduce su clave.',
      });
      return;
    }
    const offerings = (batch.imparticiones ?? []).flatMap((r, row) =>
      excludedCourse(r) ? [] : [{ row, numero: r.numero, materia: r.materia }],
    );
    this.save(cycle, { version, message: 'Consultando el catálogo visible de Moodle…' });
    try {
      const links = await localQuery<CourseLink[]>(this.path(cycle, version), key.trim(), {
        method: 'POST',
        body: JSON.stringify(offerings),
      });
      if (this.attempts.get(cycle) === attempt)
        this.save(
          cycle,
          batch.imparticiones ? { version, links } : { version, message: enrollmentOnly },
        );
    } catch (error) {
      if (this.attempts.get(cycle) === attempt)
        this.save(cycle, {
          version,
          message:
            'Búsqueda no completada. ' +
            (error instanceof Error ? error.message : 'Revisa la conexión al piloto.'),
        });
    }
  }
}
