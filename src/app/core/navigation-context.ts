import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Params, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import {
  DEFAULT_CONTEXT,
  TEACHER_CONTEXT,
  Profile,
  QueryContext,
  STATE_LABELS,
  StateFilter,
} from './models';

@Injectable({ providedIn: 'root' })
export class NavigationContext {
  private readonly router = inject(Router);
  readonly params = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.parseUrl(this.router.url).queryParams),
    ),
    { initialValue: {} as Params },
  );
  readonly context = computed<QueryContext>(() => {
    const p = this.params();
    return Object.fromEntries(
      Object.entries(
        /^\/(docentes|reportes|admin\/insumos)/.test(this.router.url)
          ? TEACHER_CONTEXT
          : DEFAULT_CONTEXT,
      ).map(([key, value]) => [key, String(p[key] ?? value)]),
    ) as unknown as QueryContext;
  });
  readonly profile = signal<Profile>(this.readProfile());
  readonly profileLabel = computed(
    () =>
      ({ coordinacion: 'Coordinación', direccion: 'Dirección', sistemas: 'Sistemas' })[
        this.profile()
      ],
  );
  readonly periodLabel = computed(() =>
    this.context().periodo === 'p01'
      ? '27-1 · Sep–Dic 2026'
      : this.context().periodo === 'p02'
        ? '27-2 · Preparación'
        : 'Periodo no disponible',
  );
  readonly cutLabel = computed(
    () =>
      ({
        c01: this.context().periodo === 'p02' ? '06 mar 2027 · 23:59 h' : '06 nov 2026 · 23:59 h',
        c00: 'Corte incompleto',
        error: 'Error simulado',
      })[this.context().corte] ?? 'Corte no disponible',
  );
  readonly state = computed<StateFilter>(() =>
    Object.hasOwn(STATE_LABELS, this.params()['estado'])
      ? (this.params()['estado'] as StateFilter)
      : 'todos',
  );
  readonly canPreview = computed(() => this.profile() !== 'direccion');
  private readonly studentSearches = signal<ReadonlyMap<string, string>>(new Map());
  studentSearch(activityId: string): string {
    return (
      this.studentSearches().get(activityId) ??
      this.readStoredSearch('academia-student-search:' + activityId)
    );
  }
  readonly teacherSearch = signal(this.readStoredSearch('academia-teacher-search'));
  readonly originTeacher = computed(() => String(this.params()['origenDocente'] ?? ''));
  setTeacherSearch(value: string) {
    this.teacherSearch.set(value);
    try {
      sessionStorage.setItem('academia-teacher-search', value);
    } catch {
      /* Optional storage. */
    }
  }
  setStudentSearch(value: string, activityId: string) {
    this.studentSearches.update((searches) => new Map(searches).set(activityId, value));
    try {
      sessionStorage.setItem('academia-student-search:' + activityId, value);
    } catch {
      /* Optional storage. */
    }
  }
  query(extra: Params = {}): Params {
    return {
      ...this.context(),
      ...(this.params()['reporte'] ? { reporte: this.params()['reporte'] } : {}),
      ...(this.params()['extemporaneas'] ? { extemporaneas: this.params()['extemporaneas'] } : {}),
      ...(this.originTeacher() ? { origenDocente: this.originTeacher() } : {}),
      ...extra,
    };
  }
  recordQuery(extra: Params = {}): Params {
    return this.query({
      estado: this.state(),
      pagina: this.params()['pagina'] ?? 0,
      tamano: this.params()['tamano'] ?? 10,
      orden: this.params()['orden'] ?? 'asc',
      ...extra,
    });
  }
  update(extra: Params) {
    return this.router.navigate([], {
      queryParams: { ...this.params(), ...this.context(), ...extra },
    });
  }
  setProfile(profile: Profile) {
    this.profile.set(profile);
    try {
      sessionStorage.setItem('academia-profile', profile);
    } catch {
      /* Storage is optional. */
    }
    if (this.router.url.startsWith('/admin') && profile !== 'sistemas')
      void this.router.navigate(['/inicio'], { queryParams: this.query() });
  }
  reset() {
    return this.router.navigate(['/inicio'], { queryParams: DEFAULT_CONTEXT });
  }
  resetFilters() {
    if (this.router.url.startsWith('/reportes'))
      return this.update({
        ...TEACHER_CONTEXT,
        periodo: this.context().periodo,
        extemporaneas: 'todas',
      });
    return this.router.url.startsWith('/docentes') ? this.resetTeachers() : this.reset();
  }
  restoreDemoCut() {
    return /^\/(docentes|reportes|admin\/insumos)/.test(this.router.url)
      ? this.update({ corte: 'c01' })
      : this.reset();
  }
  resetTeachers() {
    this.setTeacherSearch('');
    return this.router.navigate(['/docentes'], { queryParams: TEACHER_CONTEXT });
  }
  private readProfile(): Profile {
    try {
      const v = sessionStorage.getItem('academia-profile');
      return v === 'direccion' || v === 'sistemas' ? v : 'coordinacion';
    } catch {
      return 'coordinacion';
    }
  }
  private readStoredSearch(key: string) {
    try {
      return sessionStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  }
}
