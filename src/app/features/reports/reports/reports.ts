import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ContextFilters } from '../../../shared/context-filters/context-filters';
import { NavigationContext } from '../../../core/navigation-context';
import { CycleInputStore } from '../../../core/reporting/cycle-input-store';
import {
  CalendarRow,
  INPUT_LABELS,
  INPUT_TYPES,
  LATE_LABELS,
  TYPE_LABELS,
} from '../../../core/reporting/report-models';
import { reportCut, selectReport } from '../../../core/reporting/report-selectors';

@Component({
  selector: 'app-reports',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    ContextFilters,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reports {
  readonly nav = inject(NavigationContext);
  readonly inputs = inject(CycleInputStore);
  readonly labels = TYPE_LABELS;
  readonly inputLabels = INPUT_LABELS;
  readonly lateOptions = Object.entries(LATE_LABELS).map(([value, label]) => ({ value, label }));
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
  readonly view = computed(() =>
    ['estudiantes', 'entregas', 'docentes'].includes(this.nav.params()['reporte'])
      ? String(this.nav.params()['reporte'])
      : 'entregas',
  );
  readonly report = computed(() =>
    selectReport(
      this.versions().flatMap((v) => (v.version ? [v.version.batch] : [])),
      this.nav.context(),
      this.late(),
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
