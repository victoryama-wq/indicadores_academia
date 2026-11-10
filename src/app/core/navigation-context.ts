import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Params, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { DEFAULT_CONTEXT, Profile, QueryContext, STATE_LABELS, StateFilter } from './models';

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
      Object.entries(DEFAULT_CONTEXT).map(([key, value]) => [key, String(p[key] ?? value)]),
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
        ? '27-2 · Sin datos demo'
        : 'Periodo no disponible',
  );
  readonly cutLabel = computed(
    () =>
      ({ c01: '06 nov 2026 · 23:59 h', c00: '30 oct 2026 · Incompleto', error: 'Error simulado' })[
        this.context().corte
      ] ?? 'Corte no disponible',
  );
  readonly state = computed<StateFilter>(() =>
    Object.hasOwn(STATE_LABELS, this.params()['estado'])
      ? (this.params()['estado'] as StateFilter)
      : 'todos',
  );
  readonly canPreview = computed(() => this.profile() !== 'direccion');
  readonly studentSearch = signal(this.readSearch());
  setStudentSearch(value: string) {
    this.studentSearch.set(value);
    try {
      sessionStorage.setItem('academia-search-a01', value);
    } catch {
      /* Optional storage. */
    }
  }
  query(extra: Params = {}): Params {
    return { ...this.context(), ...extra };
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
  private readProfile(): Profile {
    try {
      const v = sessionStorage.getItem('academia-profile');
      return v === 'direccion' || v === 'sistemas' ? v : 'coordinacion';
    } catch {
      return 'coordinacion';
    }
  }
  private readSearch() {
    try {
      return sessionStorage.getItem('academia-search-a01') ?? '';
    } catch {
      return '';
    }
  }
}
