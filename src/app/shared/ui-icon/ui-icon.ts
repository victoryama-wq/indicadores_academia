import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

// Local SVG paths: no icon font, remote request or HTML sanitization bypass.
const PATHS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  home: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
  book: 'M12 5v16M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-2-1-6-2-10 1Z',
  people:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM17 4a3 3 0 0 1 0 6M22 21v-2a4 4 0 0 0-3-4',
  report: 'M14 2H5v20h14V7l-5-5ZM14 2v5h5M8 12h8M8 16h6',
  history: 'M3 11a9 9 0 1 1 2 7M3 3v8h8M12 7v5l3 2',
  check: 'm9 12 2 2 4-4M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  arrowRight: 'M4 12h16m-6-6 6 6-6 6',
  arrowLeft: 'M20 12H4m6-6-6 6 6 6',
  arrowUpRight: 'M6 18 18 6M6 6h12v12',
  info: 'M12 8h.01M12 11v6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
} as const;
export type UiIconName = keyof typeof PATHS;

@Component({
  selector: 'app-ui-icon',
  imports: [MatIcon],
  host: { 'aria-hidden': 'true' },
  template: `
    <mat-icon fontSet="academia-icons" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        focusable="false"
        aria-hidden="true"
      >
        <path [attr.d]="paths[name()]" />
      </svg>
    </mat-icon>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 1.25rem;
      height: 1.25rem;
      flex: 0 0 auto;
      vertical-align: middle;
    }
    mat-icon,
    svg {
      width: 100%;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiIcon {
  readonly name = input.required<UiIconName>();
  protected readonly paths = PATHS;
}
