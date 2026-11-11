import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { Metrics } from '../../../shared/metrics/metrics';
import { UiIcon } from '../../../shared/ui-icon/ui-icon';
import { QueryStore } from '../../../core/query-store';
import { NavigationContext } from '../../../core/navigation-context';
import { teacherRows } from '../../../core/academic-selectors';
@Component({
  selector: 'app-teacher-detail',
  imports: [RouterLink, MatButton, MatTableModule, Metrics, UiIcon],
  templateUrl: './teacher-detail.html',
  styleUrl: './teacher-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherDetail {
  readonly store = inject(QueryStore);
  readonly nav = inject(NavigationContext);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly teacher = computed(() =>
    this.store.data()?.catalog.teachers.find((t) => t.id === this.params()?.get('docenteId')),
  );
  readonly summary = computed(() =>
    teacherRows(this.store.data()).find((t) => t.id === this.teacher()?.id),
  );
  readonly columns = ['activity', 'graded', 'pending', 'deadline', 'action'];
}
