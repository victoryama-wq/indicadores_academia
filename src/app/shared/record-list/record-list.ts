import { UiIcon } from '../ui-icon/ui-icon';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorIntl, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { NavigationContext } from '../../core/navigation-context';
import { STATE_LABELS, selectRecords, TrackingRecord } from '../../core/models';
import { ExportPreview } from '../export-preview/export-preview';
import { spanishPaginator } from './paginator-intl';
@Component({
  selector: 'app-record-list',
  imports: [
    UiIcon,
    RouterLink,
    MatTableModule,
    MatPaginator,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButton,
    DatePipe,
  ],
  templateUrl: './record-list.html',
  providers: [{ provide: MatPaginatorIntl, useFactory: spanishPaginator }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordList {
  readonly records = input.required<readonly TrackingRecord[]>();
  readonly nav = inject(NavigationContext);
  private readonly dialog = inject(MatDialog);
  readonly labels = STATE_LABELS;
  readonly states = Object.entries(STATE_LABELS).map(([value, label]) => ({ value, label }));
  readonly columns = ['student', 'delivery', 'state', 'grade', 'action'];
  readonly search = this.nav.studentSearch;
  readonly filtered = computed(() =>
    selectRecords(this.records(), this.nav.state())
      .filter((r) =>
        (r.studentName + ' ' + r.registration)
          .toLocaleLowerCase()
          .includes(this.search().trim().toLocaleLowerCase()),
      )
      .sort(
        (a, b) =>
          (this.nav.params()['orden'] === 'desc' ? -1 : 1) *
          a.studentName.localeCompare(b.studentName),
      ),
  );
  readonly pageSize = computed(() =>
    [5, 10, 30].includes(Number(this.nav.params()['tamano']))
      ? Number(this.nav.params()['tamano'])
      : 10,
  );
  readonly pageIndex = computed(() =>
    Math.max(
      0,
      Math.min(
        Math.floor(Number(this.nav.params()['pagina'])) || 0,
        Math.max(0, Math.ceil(this.filtered().length / this.pageSize()) - 1),
      ),
    ),
  );
  readonly page = computed(() =>
    this.filtered().slice(
      this.pageIndex() * this.pageSize(),
      (this.pageIndex() + 1) * this.pageSize(),
    ),
  );
  readonly overdue = computed(
    () => this.filtered().filter((r) => r.deadlineState === 'vencido').length,
  );
  readonly within = computed(
    () => this.filtered().filter((r) => r.deadlineState === 'en-plazo').length,
  );
  setSearch(value: string) {
    this.nav.setStudentSearch(value);
    void this.nav.update({ pagina: 0 });
  }
  stateChange(value: string) {
    void this.nav.update({ estado: value, pagina: 0 });
  }
  paginate(e: PageEvent) {
    void this.nav.update({ pagina: e.pageIndex, tamano: e.pageSize });
  }
  sort(e: Sort) {
    void this.nav.update({ orden: e.direction || 'asc', pagina: 0 });
  }
  preview() {
    if (!this.nav.canPreview()) return;
    this.dialog.open(ExportPreview, {
      width: '720px',
      maxWidth: '95vw',
      data: {
        period: this.nav.periodLabel(),
        cut: this.nav.cutLabel(),
        state: STATE_LABELS[this.nav.state()],
        filters:
          'Enfermería · ' +
          this.nav.context().modalidad +
          ' · ' +
          this.nav.context().tipo +
          ' · ' +
          this.nav.context().unidad +
          ' · ' +
          this.nav.context().docente +
          (this.search() ? ' · Búsqueda: ' + this.search() : ''),
        records: this.filtered(),
      },
    });
  }
}
