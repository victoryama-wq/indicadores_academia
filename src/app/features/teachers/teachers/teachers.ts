import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { ContextFilters } from '../../../shared/context-filters/context-filters';
import { UiIcon } from '../../../shared/ui-icon/ui-icon';
import { QueryStore } from '../../../core/query-store';
import { NavigationContext } from '../../../core/navigation-context';
import { teacherRows } from '../../../core/academic-selectors';
@Component({
  selector: 'app-teachers',
  imports: [
    RouterLink,
    MatButton,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    ContextFilters,
    UiIcon,
  ],
  templateUrl: './teachers.html',
  styleUrl: './teachers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Teachers {
  readonly store = inject(QueryStore);
  readonly nav = inject(NavigationContext);
  readonly rows = computed(() => {
    const normalize = (text: string) =>
      text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es');
    const search = normalize(this.nav.teacherSearch().trim());
    return teacherRows(this.store.data()).filter((t) => normalize(t.name).includes(search));
  });
  readonly columns = ['teacher', 'assignments', 'graded', 'pending', 'overdue', 'within', 'action'];
}
