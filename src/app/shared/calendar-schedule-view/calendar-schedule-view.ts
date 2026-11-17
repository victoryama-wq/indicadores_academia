import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  CALENDAR_BLOCKS,
  CalendarBlock,
  CalendarScheduleRow,
} from '../../core/reporting/calendar-schedule';

@Component({
  selector: 'app-calendar-schedule-view',
  imports: [DatePipe],
  templateUrl: './calendar-schedule-view.html',
  styleUrl: './calendar-schedule-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarScheduleView {
  readonly rows = input.required<readonly CalendarScheduleRow[]>();
  readonly blocks = computed(() =>
    (Object.keys(CALENDAR_BLOCKS) as CalendarBlock[])
      .map((id) => ({
        id,
        label: CALENDAR_BLOCKS[id],
        rows: this.rows().filter((r) => r.bloque === id),
      }))
      .filter((b) => b.rows.length),
  );
}
