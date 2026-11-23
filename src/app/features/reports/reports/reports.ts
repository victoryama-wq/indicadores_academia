import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  afterRenderEffect,
  DestroyRef,
  ElementRef,
} from '@angular/core';
import { TaskTracking } from '../task-tracking/task-tracking';
import { PopulationView } from '../../../shared/population-view';
import { NgTemplateOutlet, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  columns,
  contributions,
  Contribution,
  indicatorCount,
  indicators,
  Indicator,
  Query,
  queries,
  resultRows,
  ResultRow,
} from '../../../core/reporting/report-breakdown';
import { UiIcon } from '../../../shared/ui-icon/ui-icon';
import { ContextFilters } from '../../../shared/context-filters/context-filters';
import { NavigationContext } from '../../../core/navigation-context';
import { QueryStore } from '../../../core/query-store';
import { CycleInputStore } from '../../../core/reporting/cycle-input-store';
import {
  CalendarRow,
  INPUT_LABELS,
  INPUT_TYPES,
  LATE_LABELS,
  TYPE_LABELS,
} from '../../../core/reporting/report-models';
import { reportCut, selectReport } from '../../../core/reporting/report-selectors';
import { CalendarScheduleView } from '../../../shared/calendar-schedule-view/calendar-schedule-view';

@Component({
  selector: 'app-reports',
  imports: [
    TaskTracking,
    UiIcon,
    NgTemplateOutlet,
    PopulationView,
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    ContextFilters,
    CalendarScheduleView,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reports {
  readonly localDemo = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  readonly nav = inject(NavigationContext);
  readonly inputs = inject(CycleInputStore);
  readonly population = computed(() => this.inputs.population(this.nav.context().periodo));
  readonly labels = TYPE_LABELS;
  readonly inputLabels = INPUT_LABELS;
  readonly versions = computed(() =>
    INPUT_TYPES.map((type) => ({
      type,
      version: this.inputs.version(type, this.nav.context().periodo),
    })),
  );
  readonly late = computed(() =>
    Object.hasOwn(LATE_LABELS, this.nav.params()['extemporaneas'])
      ? String(this.nav.params()['extemporaneas'])
      : 'todas',
  );
  readonly view = computed<Query>(() =>
    ['estudiantes', 'entregas', 'docentes'].includes(this.nav.params()['reporte'])
      ? (this.nav.params()['reporte'] as Query)
      : 'entregas',
  );
  readonly report = computed(() =>
    selectReport(
      this.versions().flatMap((v) => (v.version ? [v.version.batch] : [])),
      this.nav.context(),
      this.late(),
    ),
  );
  readonly consultable = computed(() =>
    this.report().activities.filter(
      (a) =>
        !this.report().needsLinking &&
        !this.report().missingSources.length &&
        (this.late() === 'todas' || a.rows.length > 0),
    ),
  );
  readonly cut = computed(() => reportCut(this.nav.context().periodo));
  readonly missingSourceLabels = computed(() =>
    this.report()
      .missingSources.map((type) => INPUT_LABELS[type])
      .join(', '),
  );
  readonly missingWithdrawals = computed(
    () => !this.inputs.version('bajas', this.nav.context().periodo),
  );
  readonly courses = computed(() => [
    ...new Map(this.report().calendar.map((a) => [a.cursoId, a])).values(),
  ]);
  readonly queries = queries;
  readonly headers = columns;
  readonly summaryKeys = computed<Indicator[]>(() =>
    this.view() === 'docentes'
      ? ['calificada', 'pendiente']
      : this.view() === 'estudiantes'
        ? ['personas', 'calificada']
        : ['personas', 'calificada', 'pendiente'],
  );
  readonly tableName = computed(() =>
    this.view() === 'estudiantes'
      ? 'Estudiantes con tarea calificada'
      : this.view() === 'docentes'
        ? 'Docentes con pendientes'
        : 'Desglose por tipo de actividad',
  );
  uncertain(row: ResultRow) {
    return this.consultable().some(
      (a) =>
        !a.confirmed &&
        row.records.some(
          (r) => r.calendar.cursoId === a.cursoId && r.calendar.actividadId === a.actividadId,
        ),
    );
  }
  openCalendar(a: CalendarRow) {
    void this.nav.updateReportDetail(
      { ...this.clearSelection, cursoDetalle: a.cursoId, actividadDetalle: a.actividadId },
      { fragment: 'activity-heading', fromResult: true },
    );
  }
  readonly titles = indicators;
  readonly count = indicatorCount;
  readonly rows = computed(() => resultRows(this.report(), this.view()));
  readonly global = computed<ResultRow>(() => ({
    id: 'resumen',
    label: 'Resumen del reporte',
    description: '',
    records:
      this.view() === 'entregas' ? this.report().records : this.rows().flatMap((r) => r.records),
  }));
  readonly totals = computed(() => {
    const records = this.global().records;
    const graded = indicatorCount(records, 'calificada'),
      pending = indicatorCount(records, 'pendiente');
    return {
      graded,
      pending,
      progress: graded + pending ? Math.round((100 * graded) / (graded + pending)) : null,
    };
  });
  readonly selection = computed(() => {
    const params = this.nav.params();
    const requested = params['filaReporte'];
    const course =
      params['cursoDetalle'] ??
      (this.nav.context().asignatura === 'todas' ? null : this.nav.context().asignatura);
    const matchesActivity = (a: CalendarRow) =>
      a.actividadId === params['actividadDetalle'] && (!course || a.cursoId === course);
    if (!requested) {
      if (!params['actividadDetalle'] || this.nav.context().corte !== 'c01' || this.population())
        return null;
      const matches = this.consultable().filter(matchesActivity);
      if (matches.length !== 1) return null;
      const [activity] = matches;
      const item = { activity, rows: activity.rows, count: activity.students };
      return { row: null, key: null, items: [item], item };
    }
    const row =
      requested === 'resumen' ? this.global() : this.rows().find((r) => r.id === requested);
    if (!row || !row.records.length) return null;
    const key: Indicator = Object.hasOwn(indicators, params['indicador'])
      ? params['indicador']
      : 'personas';
    const items = contributions(this.consultable(), row, key);
    if (!items.length) return null;
    const chosen = items.filter((i) => matchesActivity(i.activity));
    const item = chosen.length === 1 ? chosen[0] : items.length === 1 ? items[0] : undefined;
    return { row, key, items, item };
  });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly clearSelection = {
    filaReporte: null,
    indicador: null,
    cursoDetalle: null,
    actividadDetalle: null,
    listaDetalle: null,
  };
  constructor() {
    inject(QueryStore).usePageCatalog(
      computed(() => this.report().catalog),
      inject(DestroyRef),
    );
    afterRenderEffect(() => {
      const p = this.nav.params();
      if (this.inputs.status() !== 'ready') return;
      const selected = this.selection();
      if (
        selected?.item &&
        p['filaReporte'] &&
        (p['actividadDetalle'] !== selected.item.activity.actividadId ||
          p['cursoDetalle'] !== selected.item.activity.cursoId)
      ) {
        const a = selected.item.activity;
        void this.nav.updateReportDetail(
          {
            cursoDetalle: a.cursoId,
            actividadDetalle: a.actividadId,
            listaDetalle: selected.key === 'personas' ? null : selected.key,
          },
          { replaceUrl: true },
        );
        return;
      }
      if (
        (p['filaReporte'] || p['actividadDetalle']) &&
        (!selected || (p['actividadDetalle'] && !selected.item))
      ) {
        const clear = selected
          ? { cursoDetalle: null, actividadDetalle: null, listaDetalle: null }
          : this.clearSelection;
        void this.nav.updateReportDetail(clear, { replaceUrl: true });
        return;
      }
      const fragment = this.router.parseUrl(this.router.url).fragment;
      if (!selected && (fragment?.startsWith('resultado-') || fragment?.startsWith('fuente-'))) {
        const target = document.getElementById(fragment);
        if (target && this.el.nativeElement.contains(target)) {
          const sources = target.closest('details');
          if (sources) sources.open = true;
          target.focus({ preventScroll: true });
          const returnY = window.history.state?.reportReturnY;
          if (Number.isFinite(returnY)) window.scrollTo({ top: returnY, behavior: 'instant' });
          else target.scrollIntoView({ block: 'center' });
        }
      }
    });
  }
  setView(view: Query) {
    void this.nav.update({ ...this.clearSelection, reporte: view }, { scroll: 'manual' });
  }
  explore(row: ResultRow, key: Indicator) {
    const items = contributions(this.consultable(), row, key);
    const item = items.length === 1 ? items[0] : undefined;
    void this.nav.updateReportDetail(
      {
        filaReporte: row.id,
        indicador: key,
        cursoDetalle: item?.activity.cursoId ?? null,
        actividadDetalle: item?.activity.actividadId ?? null,
        listaDetalle: item && key !== 'personas' ? key : null,
      },
      {
        fromResult: true,
        fragment: item
          ? key === 'personas'
            ? 'activity-heading'
            : 'list-heading'
          : 'contribution-heading',
      },
    );
  }
  choose(item: Contribution) {
    const key = this.selection()?.key;
    void this.nav.updateReportDetail(
      {
        cursoDetalle: item.activity.cursoId,
        actividadDetalle: item.activity.actividadId,
        listaDetalle: key === 'personas' ? null : key,
      },
      { fragment: key === 'personas' ? 'activity-heading' : 'list-heading' },
    );
  }
  close() {
    const selected = this.selection();
    if (!selected) return;
    void this.nav.updateReportDetail(this.clearSelection, {
      fragment: selected.row
        ? 'resultado-' + selected.row.id + '-' + selected.key
        : 'fuente-' + selected.item.activity.cursoId + '-' + selected.item.activity.actividadId,
    });
  }
  focusBreakdown() {
    this.el.nativeElement.querySelector<HTMLElement>('#breakdown-heading')?.focus();
  }
  action(row: ResultRow, key: Indicator, value: number) {
    const descriptions: Record<Indicator, [string, string]> = {
      personas: ['el estudiante', 'los estudiantes'],
      calificada: ['la entrega calificada', 'las entregas calificadas'],
      pendiente: ['la entrega pendiente', 'las entregas pendientes'],
      recibida: ['la entrega recibida', 'las entregas recibidas'],
      'sin-entrega': ['el registro sin entrega', 'los registros sin entrega'],
      'sin-datos': ['el registro sin evidencia', 'los registros sin evidencia'],
      borrador: ['el borrador', 'los borradores'],
    };
    const phrase = descriptions[key][value === 1 ? 0 : 1];
    const [article, ...words] = phrase.split(' ');
    return `Ver ${article} ${value} ${words.join(' ')} de ${row.label}`;
  }
  weight(a: CalendarRow) {
    return a.pesoTarea === null
      ? 'Sin criterio configurado'
      : `Tarea ${a.pesoTarea}% · Integradora ${a.pesoIntegradora}% · Foro ${a.pesoForo}% · Examen ${a.pesoExamen}%`;
  }
  closingRule(a: CalendarRow) {
    if (a.propedeutico) return 'Calendario pendiente';
    if (
      !a.apertura ||
      !a.corte ||
      a.modalidad === 'mixta' ||
      (a.modalidad === 'escolarizada' && !a.entrega)
    )
      return 'Sin criterio configurado';
    return a.modalidad === 'escolarizada'
      ? 'Entrega y corte distintos'
      : 'Apertura → corte como cierre';
  }
}
