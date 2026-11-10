import { UiIcon } from '../ui-icon/ui-icon';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QueryStore } from '../../core/query-store';
import { NavigationContext } from '../../core/navigation-context';
@Component({
  selector: 'app-metrics',
  imports: [UiIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.data()?.status === 'incomplete') {
      <div class="notice warning" role="status">
        <strong>Información incompleta</strong>
        <p>
          Este corte simulado no tiene evidencia suficiente. Los indicadores no son calculables; la
          ausencia de información no significa incumplimiento.
        </p>
      </div>
    } @else {
      <div class="metrics-grid grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        @for (item of items(); track item.label) {
          <a
            class="metric"
            [class.metric-alert]="item.state === 'pendiente'"
            routerLink="/actividades/a01"
            (click)="nav.setStudentSearch('')"
            [queryParams]="nav.query({ estado: item.state, pagina: 0 })"
            ><div class="metric-label">{{ item.label }}<app-ui-icon name="arrowRight" /></div>
            <strong>{{ item.value }}</strong
            ><span class="metric-caption">{{ item.note }}</span></a
          >
        }
      </div>
    }
  `,
})
export class Metrics {
  readonly store = inject(QueryStore);
  readonly nav = inject(NavigationContext);
  readonly items = computed(() => {
    const c = this.store.counts();
    return [
      {
        label: 'estudiantes únicos',
        value: c.students,
        note: 'Personas en el ámbito',
        state: 'todos',
      },
      {
        label: 'registros esperados',
        value: c.expected,
        note: 'Pares estudiante · actividad',
        state: 'todos',
      },
      {
        label: 'entregas recibidas',
        value: c.received,
        note: c.expected
          ? c.received + ' de ' + c.expected + ' esperadas'
          : 'Sin registros en esta selección',
        state: 'recibida',
      },
      {
        label: 'calificadas',
        value: c.graded,
        note: c.received ? c.graded + ' de ' + c.received + ' recibidas' : 'Sin entregas recibidas',
        state: 'calificada',
      },
      {
        label: 'pendientes de calificar',
        value: c.pending,
        note: c.overdue + ' vencidos · ' + c.within + ' en plazo',
        state: 'pendiente',
      },
      {
        label: 'sin entrega',
        value: c.missing,
        note: 'Sin evidencia de entrega',
        state: 'sin-entrega',
      },
    ];
  });
}
