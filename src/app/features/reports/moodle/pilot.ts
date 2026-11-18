import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { UiIcon, type UiIconName } from '../../../shared/ui-icon/ui-icon';
import { MatButtonModule } from '@angular/material/button';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

const states = {
  calificadas: 'Entregas calificadas',
  pendientes: 'Entregas pendientes de calificar',
  'sin-entrega': 'Sin entrega',
  borradores: 'Borradores',
  revisar: 'Por revisar',
} as const;
type State = keyof typeof states;
interface Activity {
  id: number;
  cmid: number;
  name: string;
  supported: boolean;
}
interface Catalog {
  course: string;
  activities: Activity[];
}
interface Row {
  registration: string;
  name: string;
  state: State;
  updatedAt: string | null;
}
interface Snapshot {
  course: string;
  activity: Activity;
  students: Row[];
  unidentified: number;
  identifiedCount: number;
  expectedCount: number | null;
  scopeReason: string | null;
  readAt: string;
}

async function query<T>(path: string, key: string, signal: AbortSignal): Promise<T> {
  const response = await fetch('/api/moodle/actividades' + path, {
    headers: { Authorization: 'Bearer ' + key },
    cache: 'no-store',
    redirect: 'error',
    signal,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'No se pudo completar la lectura.');
  return body;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiIcon],
  template: ` <header class="mast">
      <div class="mast-inner">
        <span class="identity"><app-ui-icon name="book" />TEC PLAYA</span>
        <span class="product">Indicadores de Academia</span>
        <span class="profile"><app-ui-icon name="settings" /> Sistemas</span>
      </div>
    </header>
    <main id="main"><router-outlet /></main>`,
  styles: `
    .mast {
      background: var(--nav);
      color: white;
    }
    .mast-inner,
    main {
      max-width: 76rem;
      margin: auto;
      padding-inline: clamp(1rem, 4vw, 3rem);
    }
    .mast-inner {
      min-height: 3.7rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .identity,
    .profile {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .identity {
      font-weight: 750;
      letter-spacing: 0.04em;
    }
    .product {
      border-left: 1px solid #63758a;
      padding-left: 1rem;
      color: #e1eaf6;
    }
    .profile {
      margin-left: auto;
      font-size: 0.8rem;
    }
    main {
      padding-block: clamp(1.2rem, 3vw, 2.3rem);
    }
    @media (max-width: 36rem) {
      .product {
        display: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PilotShell {}

@Component({
  selector: 'app-moodle-pilot',
  imports: [DatePipe, RouterLink, UiIcon, MatButtonModule],
  templateUrl: './pilot.html',
  styleUrl: './pilot.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoodlePilot {
  private readonly router = inject(Router);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });
  readonly key = signal('');
  readonly sequence = signal(0);
  readonly increment = (value: number) => value + 1;
  readonly catalog = resource({
    params: () => this.key() || undefined,
    loader: ({ params, abortSignal }) => query<Catalog>('', params, abortSignal),
  });
  readonly activity = computed(() => {
    if (!this.catalog.hasValue()) return undefined;
    const activities = this.catalog.value().activities;
    const requested = this.params().get('actividad');
    return requested === null
      ? (activities.find((a) => a.id === 22041) ?? activities[0])
      : activities.find((a) => String(a.id) === requested);
  });
  readonly snapshot = resource({
    params: () => {
      const a = this.activity(),
        key = this.key();
      return key && a?.supported ? { id: a.id, key, refresh: this.sequence() } : undefined;
    },
    loader: ({ params, abortSignal }) => query<Snapshot>('/' + params.id, params.key, abortSignal),
  });
  readonly state = computed(() => {
    const value = this.params().get('estado');
    return value && Object.hasOwn(states, value) ? (value as State) : null;
  });
  readonly icons: Record<State, UiIconName> = {
    calificadas: 'check',
    pendientes: 'history',
    'sin-entrega': 'people',
    borradores: 'report',
    revisar: 'info',
  };
  readonly labels = states;
  readonly keys = Object.keys(states) as State[];
  readonly groups = computed(() => {
    const rows = this.snapshot.hasValue() ? this.snapshot.value().students : [];
    return Object.fromEntries(
      this.keys.map((k) => [k, rows.filter((r) => r.state === k)]),
    ) as Record<State, Row[]>;
  });
  readonly sent = computed(
    () => this.groups().calificadas.length + this.groups().pendientes.length,
  );
  readonly gradedPercent = computed(() =>
    this.sent() ? Math.round((100 * this.groups().calificadas.length) / this.sent()) : null,
  );
  login(input: HTMLInputElement, event: Event) {
    event.preventDefault();
    this.key.set(input.value.trim());
    input.value = '';
  }
  choose(id: string) {
    void this.router.navigate([], { queryParams: { actividad: id } });
  }
}
