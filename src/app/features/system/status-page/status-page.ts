import { UiIcon } from '../../../shared/ui-icon/ui-icon';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { NavigationContext } from '../../../core/navigation-context';
@Component({
  selector: 'app-status-page',
  imports: [UiIcon, RouterLink, MatButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel empty status-page">
      <app-ui-icon class="status-art" name="info" />
      @switch (data['kind']) {
        @case ('upcoming') {
          <span class="eyebrow">PRÓXIMAMENTE</span>
          <h1>{{ data['label'] }}</h1>
          <p>Este módulo se desarrollará en una etapa posterior.</p>
          <p>
            La demo actual permite consultar grupos, asignaturas, actividades y fichas de
            seguimiento.
          </p>
        }
        @case ('restricted') {
          <h1>Acceso restringido</h1>
          <p>Esta sección pertenece al perfil simulado de Sistemas.</p>
        }
        @default {
          <h1>Página no encontrada</h1>
          <p>La dirección no corresponde a una pantalla de esta demo.</p>
        }
      }
      <a mat-flat-button routerLink="/inicio" [queryParams]="nav.query()">Volver a Inicio</a>
    </section>
  `,
})
export class StatusPage {
  readonly data = inject(ActivatedRoute).snapshot.data;
  readonly nav = inject(NavigationContext);
}
