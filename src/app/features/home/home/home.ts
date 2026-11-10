import { UiIcon } from '../../../shared/ui-icon/ui-icon';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { Metrics } from '../../../shared/metrics/metrics';
import { ContextFilters } from '../../../shared/context-filters/context-filters';
import { QueryStore } from '../../../core/query-store';
import { NavigationContext } from '../../../core/navigation-context';
@Component({
  selector: 'app-home',
  imports: [UiIcon, RouterLink, MatButton, Metrics, ContextFilters],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  readonly store = inject(QueryStore);
  readonly nav = inject(NavigationContext);
  readonly singleActivity = computed(() =>
    this.store.data()?.activities.length === 1 ? this.store.data()?.activities[0].id : undefined,
  );
  readonly deliveryPercent = computed(() =>
    this.store.counts().expected
      ? Math.round((100 * this.store.counts().received) / this.store.counts().expected)
      : 0,
  );
  readonly gradingPercent = computed(() =>
    this.store.counts().received
      ? Math.round((100 * this.store.counts().graded) / this.store.counts().received)
      : 0,
  );
}
