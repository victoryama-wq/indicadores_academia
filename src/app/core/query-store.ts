import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { ACADEMIC_DATA, countRecords, Snapshot } from './models';
import { NavigationContext } from './navigation-context';

interface QueryResult {
  status: 'loading' | 'ready' | 'error';
  snapshot: Snapshot | null;
}
@Injectable({ providedIn: 'root' })
export class QueryStore {
  private readonly source = inject(ACADEMIC_DATA);
  readonly nav = inject(NavigationContext);
  private readonly retry = signal(0);
  private readonly request = computed(() => ({ context: this.nav.context(), retry: this.retry() }));
  readonly result = toSignal(
    toObservable(this.request).pipe(
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      switchMap(({ context }) =>
        this.source.query(context).pipe(
          map((snapshot) => ({ status: 'ready', snapshot }) as QueryResult),
          startWith({ status: 'loading', snapshot: null } as QueryResult),
          catchError(() => of({ status: 'error', snapshot: null } as QueryResult)),
        ),
      ),
    ),
    { initialValue: { status: 'loading', snapshot: null } as QueryResult },
  );
  readonly data = computed(() => this.result().snapshot);
  readonly counts = computed(() => countRecords(this.data()?.records ?? []));
  reload() {
    this.retry.update((v) => v + 1);
  }
}
