import { UiIcon } from '../../../shared/ui-icon/ui-icon';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { QueryStore } from '../../../core/query-store';
import { NavigationContext } from '../../../core/navigation-context';
@Component({
  selector: 'app-followup',
  imports: [UiIcon, RouterLink, MatButton, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <a routerLink="/inicio" [queryParams]="nav.query()">Inicio</a><span>/</span
      ><a routerLink="/actividades/a01" [queryParams]="nav.recordQuery()">Plan de cuidados</a
      ><span aria-hidden="true">/</span>Ficha de seguimiento
    </nav>
    <a
      mat-button
      routerLink="/actividades/a01"
      [queryParams]="nav.recordQuery()"
      fragment="estudiantes"
      ><app-ui-icon name="arrowLeft" /> Volver al listado de estudiantes</a
    >
    @if (record(); as r) {
      <section class="panel detail-hero">
        <div>
          <span class="eyebrow">FICHA INDIVIDUAL · DATOS SIMULADOS</span>
          <h1>{{ r.studentName }}</h1>
          <p>{{ r.registration }} · ENF-301 · Licenciatura en Enfermería</p>
        </div>
        <span
          class="pill"
          [class.red]="r.deadlineState === 'vencido'"
          [class.green]="r.state === 'calificada'"
          >{{
            r.state === 'pendiente'
              ? 'Pendiente de calificar'
              : r.state === 'calificada'
                ? 'Calificada'
                : 'Sin entrega'
          }}</span
        >
      </section>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section class="panel p-6">
          <span class="eyebrow">CONTEXTO ACADÉMICO</span>
          <h2>Plan de cuidados</h2>
          <dl class="facts">
            <div>
              <dt>Asignatura</dt>
              <dd>Enfermería Clínica · ENF-304</dd>
            </div>
            <div>
              <dt>Docente responsable</dt>
              <dd>Docente Demo A</dd>
            </div>
            <div>
              <dt>Periodo y modalidad</dt>
              <dd>{{ nav.periodLabel() }} · Escolarizada</dd>
            </div>
            <div>
              <dt>Corte consultado</dt>
              <dd>{{ nav.cutLabel() }} · America/Cancun</dd>
            </div>
          </dl>
        </section>
        <section class="panel p-6">
          <span class="eyebrow">EVIDENCIA DEL REGISTRO</span>
          <h2>Entrega y evaluación</h2>
          <dl class="facts">
            <div>
              <dt>Entrega</dt>
              <dd>
                {{
                  r.submittedAt
                    ? (r.submittedAt | date: 'dd MMM yyyy, HH:mm' : '-0500')
                    : 'Sin evidencia de entrega'
                }}
              </dd>
            </div>
            <div>
              <dt>Calificación</dt>
              <dd>
                {{ r.grade === null ? 'Sin calificación registrada' : r.grade + ' / 100' }}
                @if (r.grade === 0) {
                  <small>El cero sí es una calificación.</small>
                }
              </dd>
            </div>
            <div>
              <dt>Límite de calificación simulado</dt>
              <dd>
                {{
                  r.gradingDueAt
                    ? (r.gradingDueAt | date: 'dd MMM yyyy, HH:mm' : '-0500')
                    : 'Sin fecha determinable'
                }}
              </dd>
            </div>
            <div>
              <dt>Estado del plazo precargado</dt>
              <dd>
                {{
                  r.deadlineState === 'vencido'
                    ? 'Vencido'
                    : r.deadlineState === 'en-plazo'
                      ? 'En plazo'
                      : 'No aplica'
                }}
              </dd>
            </div>
            <div>
              <dt>Publicación al estudiante</dt>
              <dd>Sin información disponible en esta demo</dd>
            </div>
          </dl>
        </section>
      </div>
      <div class="notice info mt-5">
        <strong>Trazabilidad de demostración</strong>
        <p>
          Registro interno {{ r.id }} · Fuente: datos ficticios en memoria. No se consultan archivos
          de tareas ni respuestas. Las fechas no se recalculan según la fecha actual.
        </p>
      </div>
    } @else {
      <section class="panel empty">
        <h1>Recurso no disponible</h1>
        <p>El registro no existe o no tiene información en este corte y ámbito.</p>
        <a mat-button routerLink="/actividades/a01" [queryParams]="nav.recordQuery()"
          >Volver a la actividad</a
        >
      </section>
    }
  `,
})
export class Followup {
  readonly store = inject(QueryStore);
  readonly nav = inject(NavigationContext);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly record = computed(() =>
    this.store.data()?.records.find((r) => r.id === this.params()?.get('registroId')),
  );
}
