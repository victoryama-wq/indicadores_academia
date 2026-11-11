import { UiIcon } from '../../../shared/ui-icon/ui-icon';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { Metrics } from '../../../shared/metrics/metrics';
import { subjectRows } from '../../../core/academic-selectors';
import { QueryStore } from '../../../core/query-store';
import { NavigationContext } from '../../../core/navigation-context';
@Component({
  selector: 'app-group-detail',
  imports: [UiIcon, RouterLink, MatButton, MatTableModule, Metrics],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <a routerLink="/inicio" [queryParams]="nav.query()">Inicio</a><span>/</span
      ><a routerLink="/grupos" [queryParams]="nav.query()">Grupos</a
      ><span aria-hidden="true">/</span>Detalle
    </nav>
    <a mat-button routerLink="/grupos" [queryParams]="nav.query()"
      ><app-ui-icon name="arrowLeft" /> Volver al listado de grupos</a
    >
    @if (group(); as g) {
      <section class="panel detail-hero">
        <div class="flex gap-4 items-start">
          <span class="group-monogram" aria-hidden="true">{{ g.name.slice(0, 2) }}</span>
          <div>
            <span class="eyebrow">{{ g.modality }} · GRUPO</span>
            <h1>Grupo {{ g.name }}</h1>
            <p>{{ g.program }}</p>
            <p>{{ subjects().length }} imparticiones incluidas · Responsables simulados</p>
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
            <h2>Asignaturas del grupo</h2>
            <p>Consulta la actividad y los registros de cada impartición.</p>
          </div>
          <span class="pill">{{ subjects().length }} asignatura</span>
        </div>
        <div
          class="table-scroll overflow-x-auto"
          tabindex="0"
          role="region"
          aria-label="Tabla: Asignaturas del grupo"
        >
          <table
            mat-table
            [dataSource]="subjects()"
            class="responsive-table"
            aria-label="Asignaturas del grupo"
          >
            <ng-container matColumnDef="subject"
              ><th scope="col" mat-header-cell *matHeaderCellDef>Asignatura</th>
              <td mat-cell *matCellDef="let s" data-label="Asignatura">
                <strong>{{ s.name }}</strong
                ><small>{{ s.code }}</small>
              </td></ng-container
            >
            <ng-container matColumnDef="teacher"
              ><th scope="col" mat-header-cell *matHeaderCellDef>Docente responsable</th>
              <td mat-cell *matCellDef="let s" data-label="Docente">
                {{ s.teacher }}<small>Identidad ficticia</small>
              </td></ng-container
            >
            <ng-container matColumnDef="counts"
              ><th scope="col" mat-header-cell *matHeaderCellDef>Entregas / esperadas</th>
              <td mat-cell *matCellDef="let s" data-label="Entregas">
                {{
                  store.data()?.status === 'complete'
                    ? s.counts.received + ' / ' + s.counts.expected
                    : 'No calculable'
                }}
              </td></ng-container
            >
            <ng-container matColumnDef="pending"
              ><th scope="col" mat-header-cell *matHeaderCellDef>Pendientes</th>
              <td mat-cell *matCellDef="let s" data-label="Pendientes">
                @if (store.data()?.status === 'complete') {
                  <a
                    class="pill red"
                    [routerLink]="['/asignaturas', s.id]"
                    [queryParams]="nav.query({ estado: 'pendiente' })"
                    >{{ s.counts.pending }} pendientes</a
                  >
                } @else {
                  Información incompleta
                }
              </td></ng-container
            >
            <ng-container matColumnDef="action"
              ><th scope="col" mat-header-cell *matHeaderCellDef>Consulta</th>
              <td mat-cell *matCellDef="let s" data-label="Consulta">
                <a mat-button [routerLink]="['/asignaturas', s.id]" [queryParams]="nav.query()"
                  >Abrir asignatura <app-ui-icon name="arrowRight"
                /></a></td
            ></ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </div>
        <div class="panel-note">
          Solo se incluyen las imparticiones ficticias de la selección. No representa todo el plan
          de estudios.
        </div>
      </section>
    } @else {
      <section class="panel empty">
        <h1>Recurso no disponible</h1>
        <p>El grupo no existe en esta selección de periodo, corte y filtros.</p>
        <button type="button" mat-button (click)="nav.reset()">Volver a Inicio</button>
      </section>
    }
  `,
})
export class GroupDetail {
  readonly store = inject(QueryStore);
  readonly nav = inject(NavigationContext);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly group = computed(() =>
    this.store.data()?.groups.find((g) => g.id === this.params()?.get('grupoId')),
  );
  readonly subjects = computed(() =>
    subjectRows(this.store.data()).filter((s) => s.groupId === this.group()?.id),
  );
  readonly records = computed(() => this.subjects().flatMap((s) => s.records));
  readonly activities = computed(() => this.subjects().flatMap((s) => s.activities));
  readonly columns = ['subject', 'teacher', 'counts', 'pending', 'action'];
}
