import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { NavigationContext } from '../../core/navigation-context';
import { QueryStore } from '../../core/query-store';
import { QueryContext } from '../../core/models';
@Component({
  selector: 'app-context-filters',
  imports: [MatExpansionModule, MatFormFieldModule, MatSelectModule, MatButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <mat-expansion-panel class="filter-panel" [expanded]="desktop">
    <mat-expansion-panel-header
      ><mat-panel-title>Filtros de consulta</mat-panel-title
      ><mat-panel-description
        >Ámbito de la demostración</mat-panel-description
      ></mat-expansion-panel-header
    >
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      @for (field of fields(); track field.key) {
        <mat-form-field appearance="outline" subscriptSizing="dynamic"
          ><mat-label>{{ field.label }}</mat-label
          ><mat-select
            [value]="nav.context()[field.key]"
            (selectionChange)="change(field.key, $event.value)"
          >
            @for (option of field.options; track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
          </mat-select></mat-form-field
        >
      }
    </div>
    <div class="filter-foot">
      <span>Los filtros se aplican al instante y se conservan al navegar.</span
      ><button type="button" mat-button (click)="nav.resetFilters()">Restablecer filtros</button>
    </div>
  </mat-expansion-panel>`,
})
export class ContextFilters {
  readonly nav = inject(NavigationContext);
  readonly desktop = matchMedia('(min-width: 1024px)').matches;
  private readonly store = inject(QueryStore);
  readonly fields = computed<
    {
      key: keyof QueryContext;
      label: string;
      options: { value: string; label: string }[];
    }[]
  >(() => [
    {
      key: 'periodo',
      label: 'Periodo',
      options: [
        { value: 'p01', label: '27-1 · Sep–Dic 2026' },
        { value: 'p02', label: '27-2 · Sin datos demo' },
      ],
    },
    {
      key: 'corte',
      label: 'Corte',
      options: [
        { value: 'c01', label: '06 nov 2026 · 23:59 h' },
        { value: 'c00', label: '30 oct 2026 · Incompleto' },
        { value: 'error', label: 'Simular error de consulta' },
      ],
    },
    {
      key: 'carrera',
      label: 'Carrera',
      options: [
        ...Array.from(
          new Map(
            (this.store.data()?.catalog.groups ?? []).map((g) => [
              g.programId,
              { value: g.programId, label: g.program },
            ]),
          ).values(),
        ),
        { value: 'todas', label: 'Todas en mi ámbito' },
      ],
    },
    {
      key: 'modalidad',
      label: 'Modalidad',
      options: [
        { value: 'escolarizada', label: 'Escolarizada' },
        { value: 'mixta', label: 'Mixta' },
        { value: 'todas', label: 'Todas en mi ámbito' },
      ],
    },
    {
      key: 'grupo',
      label: 'Grupo',
      options: [
        ...(this.store.data()?.catalog.groups ?? []).map((g) => ({ value: g.id, label: g.name })),
        { value: 'todos', label: 'Todos en mi ámbito' },
      ],
    },
    {
      key: 'docente',
      label: 'Docente',
      options: [
        { value: 'todos', label: 'Todos en mi ámbito' },
        ...(this.store.data()?.catalog.teachers ?? []).map((t) => ({ value: t.id, label: t.name })),
      ],
    },
    {
      key: 'asignatura',
      label: 'Asignatura e impartición',
      options: [
        { value: 'todas', label: 'Todas en mi ámbito' },
        ...(this.store.data()?.catalog.subjects ?? []).map((s) => ({
          value: s.id,
          label:
            s.name +
            ' · ' +
            (this.store.data()?.catalog.groups.find((g) => g.id === s.groupId)?.name ?? s.groupId),
        })),
      ],
    },
    {
      key: 'tipo',
      label: 'Tipo de actividad',
      options: [
        { value: 'todos', label: 'Todos los tipos' },
        { value: 'tarea', label: 'Tarea' },
        { value: 'foro', label: 'Foro · Sin datos demo' },
      ],
    },
    {
      key: 'unidad',
      label: 'Unidad',
      options: [
        { value: 'todas', label: 'Todas las unidades' },
        { value: 'u01', label: 'Unidad 1' },
        { value: 'u02', label: 'Unidad 2 · Sin datos demo' },
      ],
    },
  ]);
  change(key: keyof QueryContext, value: string) {
    void this.nav.update({
      [key]: value,
      ...(key === 'periodo' ? { corte: 'c01' } : {}),
      pagina: 0,
    });
  }
}
