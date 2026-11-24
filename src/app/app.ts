import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationError, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { ProfileSelector } from './shared/profile-selector/profile-selector';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NavigationContext } from './core/navigation-context';
import { QueryStore } from './core/query-store';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { UiIcon, UiIconName } from './shared/ui-icon/ui-icon';
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButton,
    MatIconButton,
    ProfileSelector,
    MatProgressBarModule,
    CdkTrapFocus,
    UiIcon,
  ],
  templateUrl: './app.html',
  host: {
    '(keydown.escape)': 'closeMenu()',
    '(window:resize)': 'onViewportResize()',
    '[class.mobile-nav-open]': 'menuOpen()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly nav = inject(NavigationContext);
  readonly store = inject(QueryStore);
  readonly groupLabel = computed(
    () =>
      this.store.catalog()?.groups.find((g) => g.id === this.nav.context().grupo)?.name ??
      this.nav.context().grupo,
  );
  readonly menuOpen = signal(false);
  private readonly injector = inject(Injector);
  private readonly menuToggle = viewChild('menuToggle', {
    read: ElementRef<HTMLButtonElement>,
  });
  private readonly mainContent = viewChild<ElementRef<HTMLElement>>('mainContent');
  readonly upcoming: readonly { path: string; label: string; icon: UiIconName }[] = [
    { path: '/docentes', label: 'Seguimiento docente', icon: 'people' },
    { path: '/reportes', label: 'Reportes', icon: 'report' },
    { path: '/historicos', label: 'Históricos', icon: 'history' },
    { path: '/calidad', label: 'Calidad de información', icon: 'check' },
  ];
  readonly failedPage = signal<string | null>(null);

  constructor() {
    const router = inject(Router);
    if (!this.nav.vistaCoordinacion) return;
    let hasOpenedPage = false;
    router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        hasOpenedPage = true;
        this.failedPage.set(null);
      }
      if (!(event instanceof NavigationError)) return;
      const target = new URL(event.url, location.origin);
      if (target.origin !== location.origin) return;
      this.failedPage.set(target.href);
      // Una carga completa permite al servidor volver a comprobar la sesión.
      // Si falla la primera ruta del nuevo documento, queda disponible el reintento manual.
      if (hasOpenedPage) location.assign(target.href);
    });
  }

  closeMenu() {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      afterNextRender(
        () => {
          const target = matchMedia('(min-width: 1024px)').matches
            ? this.mainContent()
            : this.menuToggle();
          target?.nativeElement.focus();
        },
        { injector: this.injector },
      );
    }
  }
  onViewportResize() {
    if (matchMedia('(min-width: 1024px)').matches) this.closeMenu();
  }
}
