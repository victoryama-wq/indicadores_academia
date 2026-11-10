import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { NavigationContext } from '../../core/navigation-context';

/** Secondary demo control, loaded after the application shell has rendered. */
@Component({
  selector: 'app-profile-selector',
  imports: [MatFormField, MatLabel, MatSelect, MatOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field class="profile-select" appearance="outline" subscriptSizing="dynamic">
      <mat-label>Perfil simulado</mat-label>
      <mat-select [value]="nav.profile()" (selectionChange)="nav.setProfile($event.value)">
        <mat-option value="coordinacion">Coordinación</mat-option>
        <mat-option value="direccion">Dirección</mat-option>
        <mat-option value="sistemas">Sistemas</mat-option>
      </mat-select>
    </mat-form-field>
  `,
})
export class ProfileSelector {
  readonly nav = inject(NavigationContext);
}
