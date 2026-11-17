import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { canonical, type crossPopulation } from '../core/reporting/population';

type Population = NonNullable<ReturnType<typeof crossPopulation>>;
@Component({
  selector: 'app-population-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <section class="panel p-5 mb-5 break-words">
    <h2>{{ heading() }}</h2>
    <p>
      Padrón activo de Saeko:
      {{ value().hasRoster ? value().active + ' estudiantes únicos' : 'Pendiente de carga' }}. Corte
      del padrón: {{ value().cutoff ?? 'Sin fecha informada' }}.
    </p>
    @if (!ready()) {
      <p>
        Para calcular la cobertura falta
        {{
          value().hasRoster ? 'el catálogo de imparticiones de SPAI' : 'el padrón activo de Saeko'
        }}
        de este ciclo.
      </p>
    } @else {
      <p>
        <strong>Población vinculada: {{ value().covered }} estudiantes únicos</strong> ·
        {{ value().links.length }} vínculos estudiante–asignatura confirmados.
      </p>
      <p>
        Cobertura pendiente: {{ value().uncovered }} estudiantes elegibles sin asignación
        confirmada.
      </p>
      <p>
        Por grupo base o compartido: {{ value().byGroup }} · Por matrícula explícita:
        {{ value().byRegistration }}. Un vínculo puede tener ambas evidencias; solo cuenta una vez.
      </p>
      <p>
        Excluidos por ING o ING-FCS: {{ value().excludedStudents }} estudiantes y
        {{ value().excludedCourses }} imparticiones. Propuestas sin confirmar:
        {{ value().proposed.length }} · Casos por revisar: {{ value().issues.length }}.
      </p>
    }
    @if (details()) {
      <details>
        <summary>Consultar filas y evidencia del cruce</summary>
        <label
          >Detalle del cruce
          <select #select [value]="section()" (change)="section.set(select.value)">
            <option value="personas">Estudiantes activos</option>
            <option value="vinculos">Asignaciones confirmadas</option>
            <option value="propuestas">Coincidencias propuestas</option>
            <option value="incidencias">Casos por revisar</option>
          </select></label
        >
        <ul>
          @for (line of lines(); track $index) {
            <li class="my-2">{{ line }}</li>
          } @empty {
            <li>Sin registros en esta categoría.</li>
          }
        </ul>
        @if (total() > 20) {
          <button
            type="button"
            class="underline p-2"
            [disabled]="offset() === 0"
            (click)="offset.set(offset() - 20)"
          >
            Anterior
          </button>
          {{ offset() + 1 }}–{{ offset() + lines().length }} de {{ total() }}
          <button
            type="button"
            class="underline p-2"
            [disabled]="offset() + 20 >= total()"
            (click)="offset.set(offset() + 20)"
          >
            Siguiente
          </button>
        }
      </details>
    }
  </section>`,
})
export class PopulationView {
  readonly value = input.required<Population>();
  readonly details = input(false);
  readonly heading = input('Población vinculada');
  readonly ready = computed(() => this.value().hasRoster && this.value().hasCourses);
  readonly section = signal('personas');
  readonly offset = linkedSignal(() => {
    this.value();
    this.section();
    return 0;
  });
  readonly total = computed(() => {
    const v = this.value();
    switch (this.section()) {
      case 'personas':
        return v.people.length;
      case 'vinculos':
        return v.links.length;
      case 'propuestas':
        return v.proposed.length;
      default:
        return v.issues.length;
    }
  });
  readonly lines = computed(() => {
    const v = this.value(),
      i = this.offset(),
      end = i + 20;
    switch (this.section()) {
      case 'personas':
        return v.people
          .slice(i, end)
          .map(
            (p) =>
              `${p.source.hoja}, fila ${p.source.fila} · ${p.source.nombre} · ${p.source.matricula} → ${p.id} · grupo ${p.source.grupo} → ${p.group} · plan ${p.source.plan} → ${p.plan}`,
          );
      case 'vinculos':
        return v.links
          .slice(i, end)
          .map(
            (l) =>
              `${l.person.id} (${l.person.source.hoja}, fila ${l.person.source.fila}; grupo ${l.person.group}, plan ${l.person.plan}) → ${l.course.numero} ${l.course.materia} · carrera ${canonical(l.course.carrera)} · ${l.course.hoja}, fila ${l.course.fila} · ${[...l.evidence].join(' + ')}`,
          );
      default:
        return (this.section() === 'propuestas' ? v.proposed : v.issues)
          .slice(i, end)
          .map((r) => `${r.hoja}, fila ${r.fila}: ${r.motivo}`);
    }
  });
}
