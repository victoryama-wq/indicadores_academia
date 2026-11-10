import { UiIcon } from '../../../shared/ui-icon/ui-icon';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { ContextFilters } from '../../../shared/context-filters/context-filters';
import { QueryStore } from '../../../core/query-store';
import { NavigationContext } from '../../../core/navigation-context';
@Component({
  selector: 'app-groups',
  imports: [UiIcon, RouterLink, MatButton, ContextFilters],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <a routerLink="/inicio" [queryParams]="nav.query()">Inicio</a
      ><span aria-hidden="true">/</span> Grupos
    </nav>
    <div class="page-heading">
      <div>
        <span class="eyebrow">SEGUIMIENTO ACADÉMICO</span>
        <h1>Grupos de tu ámbito</h1>
        <p>Selecciona un grupo para consultar sus asignaturas.</p>
      </div>
    </div>
    <app-context-filters />
    @for (g of groups(); track g.id) {
      <section class="panel group-card">
        <span class="group-monogram" aria-hidden="true">{{ g.name.slice(0, 2) }}</span>
        <div>
          <span class="eyebrow">{{ g.modality }}</span>
          <h2>{{ g.name }}</h2>
          <p>{{ g.program }} · {{ g.subjectCount }} imparticiones incluidas</p>
        </div>
        <a mat-flat-button [routerLink]="['/grupos', g.id]" [queryParams]="nav.query()"
          >Ver grupo <app-ui-icon name="arrowRight"
        /></a>
      </section>
    } @empty {
      <section class="panel empty">
        <h2>No hay grupos para estos filtros</h2>
        <p>Conservamos el periodo y corte seleccionados.</p>
        <button type="button" mat-button (click)="nav.reset()">Restablecer filtros</button>
      </section>
    }
  `,
})
export class Groups {
  readonly store = inject(QueryStore);
  readonly groups = computed(() =>
    (this.store.data()?.groups ?? []).map((g) => ({
      ...g,
      subjectCount: this.store.data()?.subjects.filter((s) => s.groupId === g.id).length ?? 0,
    })),
  );
  readonly nav = inject(NavigationContext);
}
