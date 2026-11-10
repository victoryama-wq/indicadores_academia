import { UiIcon } from '../../../shared/ui-icon/ui-icon';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { Metrics } from '../../../shared/metrics/metrics';
import { RecordList } from '../../../shared/record-list/record-list';
import { QueryStore } from '../../../core/query-store';
import { NavigationContext } from '../../../core/navigation-context';
@Component({
  selector: 'app-activity-detail',
  imports: [UiIcon, RouterLink, MatButton, Metrics, RecordList, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <a routerLink="/inicio" [queryParams]="nav.query()">Inicio</a><span>/</span
      ><a routerLink="/grupos/g01" [queryParams]="nav.query()">ENF-301</a><span>/</span
      ><a routerLink="/asignaturas/i01" [queryParams]="nav.query()">Enfermería Clínica</a
      ><span aria-hidden="true">/</span>Actividad
    </nav>
    <a mat-button routerLink="/asignaturas/i01" [queryParams]="nav.query()"
      ><app-ui-icon name="arrowLeft" /> Volver a Enfermería Clínica</a
    >
    @if (activity(); as a) {
      <section class="panel detail-hero">
        <div>
          <span class="eyebrow">ACTIVIDAD · {{ a.type }} · {{ a.unit }}</span>
          <h1>{{ a.name }}</h1>
          <p>Caso clínico de demostración · ENF-301 · Escolarizada</p>
          <div class="detail-meta">
            <span><small>Docente responsable</small><strong>Docente Demo A</strong></span
            ><span
              ><small>Fecha de entrega simulada</small
              ><strong>{{ a.dueAt | date: 'dd MMM yyyy, HH:mm' : '-0500' }}</strong></span
            >
          </div>
        </div>
        <div class="detail-stamp">
          <span class="eyebrow">CORTE ACTIVO</span><strong>{{ nav.cutLabel() }}</strong
          ><span>Estados precargados</span>
        </div>
      </section>
      <app-metrics />
      @if (store.data()?.status === 'complete') {
        <div class="notice warning mt-5">
          <strong
            >{{ store.counts().overdue }} pendientes vencidos · {{ store.counts().within }} en
            plazo</strong
          >
          <p>
            Clasificación simulada. No implica un plazo institucional aprobado ni envía
            notificaciones.
          </p>
        </div>
        <nav class="state-links" aria-label="Filtrar registros por estado">
          <a
            mat-button
            routerLink="."
            [queryParams]="nav.query({ estado: 'todos', pagina: 0 })"
            [attr.aria-current]="nav.state() === 'todos' ? 'true' : null"
            >Todos ({{ store.counts().expected }})</a
          ><a
            mat-button
            routerLink="."
            [queryParams]="nav.query({ estado: 'pendiente', pagina: 0 })"
            [attr.aria-current]="nav.state() === 'pendiente' ? 'true' : null"
            >Pendientes ({{ store.counts().pending }})</a
          ><a
            mat-button
            routerLink="."
            [queryParams]="nav.query({ estado: 'vencido', pagina: 0 })"
            [attr.aria-current]="nav.state() === 'vencido' ? 'true' : null"
            >Vencidos ({{ store.counts().overdue }})</a
          ><a
            mat-button
            routerLink="."
            [queryParams]="nav.query({ estado: 'en-plazo', pagina: 0 })"
            [attr.aria-current]="nav.state() === 'en-plazo' ? 'true' : null"
            >En plazo ({{ store.counts().within }})</a
          >
        </nav>
        <app-record-list [records]="records()" />
      }
    } @else {
      <section class="panel empty">
        <h1>Recurso no disponible</h1>
        <p>La actividad no existe en esta selección de filtros.</p>
        <button type="button" mat-button (click)="nav.reset()">Volver a Inicio</button>
      </section>
    }
  `,
})
export class ActivityDetail {
  readonly store = inject(QueryStore);
  readonly nav = inject(NavigationContext);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly activity = computed(() =>
    this.store.data()?.activities.find((a) => a.id === this.params()?.get('actividadId')),
  );
  readonly records = computed(
    () => this.store.data()?.records.filter((r) => r.activityId === this.activity()?.id) ?? [],
  );
}
