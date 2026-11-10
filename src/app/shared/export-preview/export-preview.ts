import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TrackingRecord } from '../../core/models';
export interface PreviewData {
  period: string;
  cut: string;
  state: string;
  filters: string;
  records: readonly TrackingRecord[];
}
@Component({
  selector: 'app-export-preview',
  imports: [MatDialogModule, MatButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="dialog-heading">
      <span class="eyebrow">TEC PLAYA · DATOS SIMULADOS</span>
      <h2 mat-dialog-title>Vista previa de exportación</h2>
    </div>
    <mat-dialog-content tabindex="0" aria-label="Contenido de la vista previa">
      <div class="notice info">
        <strong>Vista previa de la demo</strong>
        <p>
          Los formatos y la descarga se definirán con Academia. Este diálogo no genera un documento
          oficial.
        </p>
      </div>
      <dl class="facts">
        <div>
          <dt>Periodo y corte</dt>
          <dd>{{ data.period }} · {{ data.cut }}</dd>
        </div>
        <div>
          <dt>Ámbito</dt>
          <dd>ENF-301 · Enfermería Clínica · Plan de cuidados</dd>
        </div>
        <div>
          <dt>Selección</dt>
          <dd>{{ data.state }} · {{ data.records.length }} registros</dd>
        </div>
        <div>
          <dt>Filtros activos</dt>
          <dd>{{ data.filters }}</dd>
        </div>
        <div>
          <dt>Cobertura del conjunto simulado</dt>
          <dd>30 de 30 registros con estado conocido · Actualización: 06 nov 2026, 18:00 h</dd>
        </div>
      </dl>
      <h3>Registros de la selección</h3>
      <p>Se incluyen todas las páginas del resultado filtrado.</p>
      <ul class="preview-list">
        @for (r of data.records; track r.id) {
          <li>
            <strong>{{ r.studentName }}</strong
            ><span>{{ r.registration }} · {{ r.state }} {{ r.deadlineState ?? '' }}</span>
          </li>
        }
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button type="button" mat-button mat-dialog-close>Cancelar</button
      ><button type="button" mat-flat-button mat-dialog-close>
        Cerrar vista previa
      </button></mat-dialog-actions
    >`,
})
export class ExportPreview {
  readonly data = inject<PreviewData>(MAT_DIALOG_DATA);
}
