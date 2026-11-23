import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { NavigationContext } from '../../core/navigation-context';
import { QueryStore } from '../../core/query-store';
import { AcademicCatalog, QueryContext } from '../../core/models';
import { CYCLES, LATE_LABELS, MODALITIES, TYPE_LABELS } from '../../core/reporting/report-models';
@Component({
  selector: 'app-context-filters',
  imports: [NgTemplateOutlet, MatExpansionModule, MatFormFieldModule, MatSelectModule, MatButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './context-filters.html',
})
export class ContextFilters {
  readonly reportMode = input(false);
  readonly catalog = input<AcademicCatalog | null>(null);
  private readonly optionsCatalog = computed(() => this.catalog() ?? this.store.data()?.catalog);
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
      label: this.reportMode() ? 'Ciclo' : 'Periodo',
      options: this.reportMode()
        ? [...CYCLES]
        : [
            { value: 'p01', label: '27-1 · Sep–Dic 2026' },
            { value: 'p02', label: '27-2 · Sin datos demo' },
          ],
    },
    {
      key: 'corte',
      label: this.reportMode() ? 'Información al…' : 'Corte',
      options: [
        {
          value: 'c01',
          label:
            this.reportMode() && this.nav.context().periodo === 'p02'
              ? '06 mar 2027 · 23:59 h'
              : '06 nov 2026 · 23:59 h',
        },
        {
          value: 'c00',
          label: this.reportMode()
            ? 'Corte incompleto de demostración'
            : '30 oct 2026 · Incompleto',
        },
        { value: 'error', label: 'Simular error de consulta' },
      ],
    },
    {
      key: 'carrera',
      label: 'Carrera',
      options: [
        ...Array.from(
          new Map(
            (this.optionsCatalog()?.groups ?? []).map((g) => [
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
      options: this.reportMode()
        ? [
            { value: 'todas', label: 'Todas en mi ámbito' },
            ...MODALITIES.map((value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            })),
          ]
        : [
            { value: 'escolarizada', label: 'Escolarizada' },
            { value: 'mixta', label: 'Mixta' },
            { value: 'todas', label: 'Todas en mi ámbito' },
          ],
    },
    {
      key: 'grupo',
      label: 'Grupo',
      options: [
        ...(this.optionsCatalog()?.groups ?? []).map((g) => ({ value: g.id, label: g.name })),
        { value: 'todos', label: 'Todos en mi ámbito' },
      ],
    },
    {
      key: 'docente',
      label: 'Docente',
      options: [
        { value: 'todos', label: 'Todos en mi ámbito' },
        ...(this.optionsCatalog()?.teachers ?? []).map((t) => ({ value: t.id, label: t.name })),
      ],
    },
    {
      key: 'asignatura',
      label: 'Asignatura e impartición',
      options: [
        { value: 'todas', label: 'Todas en mi ámbito' },
        ...(this.optionsCatalog()?.subjects ?? []).map((s) => ({
          value: s.id,
          label:
            s.name +
            ' · ' +
            (this.optionsCatalog()?.groups.find((g) => g.id === s.groupId)?.name ?? s.groupId),
        })),
      ],
    },
    {
      key: 'tipo',
      label: 'Tipo de actividad',
      options: this.reportMode()
        ? [
            { value: 'todos', label: 'Todos los tipos' },
            ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
          ]
        : [
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
        { value: 'u02', label: this.reportMode() ? 'Unidad 2' : 'Unidad 2 · Sin datos demo' },
        ...(this.reportMode()
          ? [3, 4, 5, 6, 7].map((n) => ({ value: 'u0' + n, label: 'Unidad ' + n }))
          : []),
      ],
    },
  ]);
  readonly primaryKeys = new Set(['periodo', 'corte', 'carrera', 'modalidad', 'grupo']);
  readonly classifications = Object.entries(LATE_LABELS);
  readonly primary = computed(() => this.reportFields().filter((f) => this.primaryKeys.has(f.key)));
  readonly advanced = computed(() =>
    this.reportFields().filter((f) => !this.primaryKeys.has(f.key)),
  );
  readonly reportFields = computed(() => {
    const ctx = this.nav.context();
    const catalog = this.optionsCatalog();
    const groups = (catalog?.groups ?? []).filter(
      (g) =>
        (ctx.carrera === 'todas' || ctx.carrera === g.programId) &&
        (ctx.modalidad === 'todas' || ctx.modalidad === g.modalityId),
    );
    const subjects = (catalog?.subjects ?? []).filter(
      (s) =>
        groups.some((g) => g.id === s.groupId) &&
        (ctx.grupo === 'todos' || ctx.grupo === s.groupId),
    );
    return this.fields().map((f) => {
      const options = f.options.filter((o) => {
        if (['todos', 'todas'].includes(o.value)) return true;
        if (f.key === 'grupo') return groups.some((g) => g.id === o.value);
        if (f.key === 'docente') return subjects.some((s) => s.teacherId === o.value);
        if (f.key === 'asignatura')
          return subjects.some(
            (s) => s.id === o.value && (ctx.docente === 'todos' || ctx.docente === s.teacherId),
          );
        return true;
      });
      return { ...f, options, value: ctx[f.key] };
    });
  });
  readonly active = computed(() => {
    const ctx = this.nav.context();
    const chosen = this.fields()
      .filter((f) => !['todos', 'todas'].includes(ctx[f.key]))
      .map(
        (f) =>
          (f.key === 'corte' ? 'Información al ' : f.label + ' · ') +
          (f.options.find((o) => o.value === ctx[f.key])?.label ?? ctx[f.key]),
      );
    const late = this.classifications.find(([key]) => key === this.nav.params()['extemporaneas']);
    return late ? [...chosen, late[1]] : chosen;
  });
  change(key: keyof QueryContext, value: string) {
    const dependent: Partial<QueryContext> = {};
    if (this.reportMode() && ['carrera', 'modalidad', 'grupo', 'docente'].includes(key)) {
      const ctx = { ...this.nav.context(), [key]: value };
      const groups = (this.optionsCatalog()?.groups ?? []).filter(
        (g) =>
          (ctx.carrera === 'todas' || ctx.carrera === g.programId) &&
          (ctx.modalidad === 'todas' || ctx.modalidad === g.modalityId),
      );
      if (!groups.some((g) => g.id === ctx.grupo)) ctx.grupo = dependent.grupo = 'todos';
      const subjects = (this.optionsCatalog()?.subjects ?? []).filter(
        (s) =>
          groups.some((g) => s.groupId === g.id) &&
          (ctx.grupo === 'todos' || s.groupId === ctx.grupo),
      );
      if (!subjects.some((s) => s.teacherId === ctx.docente))
        ctx.docente = dependent.docente = 'todos';
      if (
        !subjects.some(
          (s) =>
            s.id === ctx.asignatura && (ctx.docente === 'todos' || s.teacherId === ctx.docente),
        )
      )
        dependent.asignatura = 'todas';
    }
    void this.nav.update({
      ...dependent,
      [key]: value,
      ...(key === 'periodo' ? { corte: 'c01' } : {}),
      ...(this.reportMode() && key === 'periodo'
        ? {
            carrera: 'todas',
            modalidad: 'todas',
            grupo: 'todos',
            asignatura: 'todas',
            docente: 'todos',
            tipo: 'todos',
            unidad: 'todas',
            extemporaneas: 'todas',
          }
        : {}),
      pagina: 0,
    });
  }
}
