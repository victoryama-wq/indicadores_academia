import { DatePipe } from '@angular/common';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { NavigationContext } from '../../../core/navigation-context';
import type { Contribution, Indicator } from '../../../core/reporting/report-breakdown';
import { UiIcon } from '../../../shared/ui-icon/ui-icon';
import { moodleDelay } from '../moodle/moodle-delay';

const states = [
  { key: 'calificada', label: 'Entregas calificadas', icon: 'check' },
  { key: 'pendiente', label: 'Pendientes de calificar', icon: 'history' },
  { key: 'sin-entrega', label: 'Sin entrega', icon: 'people' },
  { key: 'borrador', label: 'Borradores', icon: 'report' },
  { key: 'sin-datos', label: 'Por revisar', icon: 'info' },
] as const;

@Component({
  selector: 'app-task-tracking',
  imports: [DatePipe, MatButtonModule, UiIcon],
  templateUrl: './task-tracking.html',
  styleUrl: './task-tracking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTracking {
  readonly items = input.required<readonly Contribution[]>();
  readonly activity = input.required<Contribution | undefined>();
  readonly indicator = input.required<Indicator | null>();
  readonly label = input.required<string>();
  readonly person = input(false);
  readonly back = output<void>();
  readonly choose = output<Contribution>();
  readonly uniqueStudents = computed(() => [
    ...new Map(
      this.items()
        .flatMap((item) => item.rows)
        .map((r) => [r.student.estudianteId, r.student]),
    ).values(),
  ]);
  readonly cut = input.required<string>();
  readonly nav = inject(NavigationContext);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  readonly cards = computed(() => {
    const item = this.activity();
    if (!item) return [];
    const activity = item.activity;
    return states.map((state) => ({
      ...state,
      rows:
        state.key === 'sin-entrega' && !activity.confirmed
          ? null
          : item.rows.filter((r) => r.state === state.key),
    }));
  });
  readonly selected = computed(() => {
    const key = this.nav.params()['listaDetalle'];
    if (key === 'recibida')
      return {
        key,
        label: 'Entregas recibidas',
        rows:
          this.activity()?.rows.filter(
            (r) => r.state === 'calificada' || r.state === 'pendiente',
          ) ?? [],
      };
    return this.cards().find((c) => c.key === key);
  });
  delay(date: string | null) {
    return moodleDelay(date ? Date.parse(date) / 1000 : null, this.cut(), 'minutos');
  }
  constructor() {
    // El shell vuelve a montar Reportes cuando cambia el filtro de asignatura.
    afterRenderEffect(() => {
      const activity = this.activity();
      const selected = this.selected();
      const fragment = this.router.parseUrl(this.router.url).fragment;
      if (!fragment) return;
      const valid =
        fragment === 'contribution-heading' ||
        (fragment === 'activity-heading' && activity) ||
        (fragment === 'list-heading' && selected) ||
        this.cards().some((card) => fragment === 'card-' + card.key);
      if (valid) {
        const target = this.host.nativeElement.querySelector<HTMLElement>('#' + fragment);
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({ block: 'center' });
      }
    });
  }
  showList(key: string | null) {
    return this.nav.updateReportDetail(
      { listaDetalle: key },
      { fragment: key ? 'list-heading' : 'card-' + this.selected()?.key },
    );
  }
}
