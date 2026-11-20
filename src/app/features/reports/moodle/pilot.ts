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
import { moodleDelay } from './moodle-delay';
import { MoodleLinks, type CourseLink, localQuery } from '../../../core/reporting/moodle-links';
import { CYCLES } from '../../../core/reporting/report-models';
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
  hasRestrictedActivities: boolean;
}
interface Row {
  registration: string;
  dueDate?: number | null;
  name: string;
  state: State;
  updatedAt: string | null;
}
interface Snapshot {
  courseId: number;
  course: string;
  activity: Activity;
  students: Row[];
  unidentified: number;
  identifiedCount: number;
  expectedCount: number | null;
  scopeReason: string | null;
  readAt: string;
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
  private readonly bindings = inject(MoodleLinks);
  readonly cycles = CYCLES;
  readonly cycle = computed(() => this.params().get('periodo') ?? 'p01');
  readonly bindingResult = computed(() => this.bindings.result(this.cycle()));
  readonly base = computed(() => {
    const cycle = this.cycle(),
      entry = this.bindingResult();
    return entry?.links ? this.bindings.path(cycle, entry.version) : undefined;
  });
  readonly links = resource({
    params: () => {
      const base = this.base(),
        key = this.key();
      return base && key ? { base, key } : undefined;
    },
    loader: ({ params, abortSignal }) =>
      localQuery<CourseLink[]>(params.base, params.key, { signal: abortSignal }),
  });
  readonly linked = computed(() =>
    this.links.hasValue() ? this.links.value().filter((r) => r.status === 'linked') : [],
  );
  readonly selected = computed(() =>
    this.linked().find((r) => String(r.courseId) === this.params().get('curso')),
  );
  readonly coursePath = computed(() => {
    const selected = this.selected();
    return selected ? this.base() + '/' + selected.courseId + '/actividades' : undefined;
  });
  readonly catalog = resource({
    params: () => {
      const path = this.coursePath();
      return path ? { path, key: this.key(), refresh: this.sequence() } : undefined;
    },
    loader: ({ params, abortSignal }) =>
      localQuery<Catalog>(params.path, params.key, { signal: abortSignal }),
  });
  readonly activity = computed(() => {
    if (!this.catalog.hasValue()) return undefined;
    const activities = this.catalog.value().activities;
    const requested = this.params().get('actividad');
    return requested === null
      ? (activities.find((a) => a.supported) ?? activities[0])
      : activities.find((a) => String(a.id) === requested);
  });
  readonly snapshot = resource({
    params: () => {
      const a = this.activity(),
        key = this.key();
      return key && a?.supported ? { path: this.coursePath() + '/' + a.id, key } : undefined;
    },
    loader: ({ params, abortSignal }) =>
      localQuery<Snapshot>(params.path, params.key, { signal: abortSignal }),
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
  readonly moodleDelay = moodleDelay;
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
  scope() {
    return { periodo: this.cycle(), curso: this.selected()?.courseId };
  }
  switchCourse(cycle: string, curso?: string) {
    void this.router.navigate([], { queryParams: { periodo: cycle, curso } });
  }
  choose(id: string) {
    void this.router.navigate([], { queryParams: { ...this.scope(), actividad: id } });
  }
}
