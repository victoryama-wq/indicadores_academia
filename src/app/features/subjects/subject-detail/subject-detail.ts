import { UiIcon } from '../../../shared/ui-icon/ui-icon';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { Metrics } from '../../../shared/metrics/metrics';
import { subjectRows } from '../../../core/academic-selectors';
import { countRecords } from '../../../core/models';
import { QueryStore } from '../../../core/query-store';
import { NavigationContext } from '../../../core/navigation-context';
@Component({
  selector: 'app-subject-detail',
  imports: [UiIcon, RouterLink, MatButton, MatTableModule, Metrics],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <a routerLink="/inicio" [queryParams]="nav.query()">Inicio</a><span>/</span
      ><a
        [routerLink]="group() ? ['/grupos', group()?.id] : ['/grupos']"
        [queryParams]="nav.query()"
        >{{ group()?.name ?? 'Grupos' }}</a
      ><span aria-hidden="true">/</span>Asignatura
    </nav>
    <a
      mat-button
      [routerLink]="group() ? ['/grupos', group()?.id] : ['/grupos']"
      [queryParams]="nav.query()"
      ><app-ui-icon name="arrowLeft" /> Volver al grupo {{ group()?.name }}</a
    >
    @if (nav.originTeacher()) {
      <a mat-button [routerLink]="['/docentes', nav.originTeacher()]" [queryParams]="nav.query()"
        >Volver al detalle docente</a
      >
    }
    @if (subject(); as s) {
      <section class="panel detail-hero">
        <div>
          <span class="eyebrow">{{ s.code }} · IMPARTICIÓN</span>
          <h1>{{ s.name }}</h1>
          <p>{{ group()?.program }} · {{ group()?.name }} · {{ group()?.modality }}</p>
          <div class="detail-meta">
            <span
              ><small>Docente responsable</small><strong>{{ s.teacher }}</strong></span
            ><span
              ><small>Actividad incluida</small
              ><strong>{{ activities().length }} actividades</strong></span
            ><span
              ><small>Población ficticia</small
              ><strong>{{
                store.data()?.status === 'complete'
                  ? counts().students + ' estudiantes únicos'
                  : 'No calculable'
              }}</strong></span
            >
          </div>
        </div>
        <div class="detail-stamp">
          <span class="eyebrow">CORTE ACTIVO</span><strong>{{ nav.cutLabel() }}</strong
          ><span>Datos simulados</span>
        </div>
      </section>
      <app-metrics
        [records]="records()"
        [activityId]="activities().length === 1 ? activities()[0].id : undefined"
      />
      <section class="panel mt-5">
        <div class="panel-heading">
          <div>
            <h2>Actividades de la asignatura</h2>
            <p>Estados de entrega y evaluación del corte seleccionado.</p>
          </div>
          <span class="pill">Unidad 1</span>
        </div>
        <div
          class="table-scroll overflow-x-auto"
          tabindex="0"
          role="region"
          aria-label="Tabla: Actividades de la asignatura"
        >
          <table
            mat-table
            [dataSource]="activities()"
            class="responsive-table"
            aria-label="Actividades de la asignatura"
          >
            <ng-container matColumnDef="activity"
              ><th scope="col" mat-header-cell *matHeaderCellDef>Actividad</th>
              <td mat-cell *matCellDef="let a" data-label="Actividad">
                <strong>{{ a.name }}</strong
                ><small>{{ a.type }} · {{ a.unit }}</small>
              </td></ng-container
            >
            <ng-container matColumnDef="received"
              ><th scope="col" mat-header-cell *matHeaderCellDef>Recibidas</th>
              <td mat-cell *matCellDef="let a" data-label="Recibidas">
                {{
                  store.data()?.status === 'complete'
                    ? a.counts.received + ' / ' + a.counts.expected
                    : 'No calculable'
                }}
              </td></ng-container
            >
            <ng-container matColumnDef="graded"
              ><th scope="col" mat-header-cell *matHeaderCellDef>Calificadas</th>
              <td mat-cell *matCellDef="let a" data-label="Calificadas">
                {{
                  store.data()?.status === 'complete'
                    ? a.counts.graded + ' / ' + a.counts.received + ' recibidas'
                    : 'No calculable'
                }}
              </td></ng-container
            >
            <ng-container matColumnDef="pending"
              ><th scope="col" mat-header-cell *matHeaderCellDef>Pendientes de calificar</th>
              <td mat-cell *matCellDef="let a" data-label="Pendientes">
                @if (store.data()?.status === 'complete') {
                  <span class="pill red">{{ a.counts.overdue }} vencidos</span
                  ><small>{{ a.counts.within }} en plazo</small>
                } @else {
                  Información incompleta
                }
              </td></ng-container
            >
            <ng-container matColumnDef="action"
              ><th scope="col" mat-header-cell *matHeaderCellDef>Consulta</th>
              <td mat-cell *matCellDef="let a" data-label="Consulta">
                <a mat-button [routerLink]="['/actividades', a.id]" [queryParams]="nav.query()"
                  >Abrir actividad <app-ui-icon name="arrowRight"
                /></a></td
            ></ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </div>
      </section>
      <div class="notice neutral mt-5">
        <strong>Reglas por definir</strong>
        <p>
          Los plazos, prórrogas y reentregas serán definidos por Academia. Los estados mostrados
          están precargados para esta demostración.
        </p>
      </div>
    } @else {
      <section class="panel empty">
        <h1>Recurso no disponible</h1>
        <p>La impartición no existe en esta selección.</p>
        <button type="button" mat-button (click)="nav.reset()">Volver a Inicio</button>
      </section>
    }
  `,
})
export class SubjectDetail {
  readonly store = inject(QueryStore);
  readonly nav = inject(NavigationContext);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly subject = computed(() =>
    this.store.data()?.subjects.find((s) => s.id === this.params()?.get('imparticionId')),
  );
  readonly row = computed(() =>
    subjectRows(this.store.data()).find((s) => s.id === this.subject()?.id),
  );
  readonly activities = computed(() => this.row()?.activities ?? []);
  readonly group = computed(() => this.row()?.group);
  readonly records = computed(() => this.row()?.records ?? []);
  readonly counts = computed(() => countRecords(this.records()));
  readonly columns = ['activity', 'received', 'graded', 'pending', 'action'];
}
