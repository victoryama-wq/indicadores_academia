import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NavigationContext } from '../../../core/navigation-context';
import { CycleInputStore } from '../../../core/reporting/cycle-input-store';
import {
  CYCLES,
  INPUT_LABELS,
  INPUT_TYPES,
  InputType,
  Validation,
} from '../../../core/reporting/report-models';
import { validateInput } from '../../../core/reporting/input-validation';
import { sampleBatch } from '../../../core/reporting/report-fixtures';
import { CalendarScheduleView } from '../../../shared/calendar-schedule-view/calendar-schedule-view';

interface Draft {
  text: string;
  filename: string;
  reading: boolean;
  validation: Validation | null;
  message: string;
  activated: boolean;
  imported?: Validation;
}

@Component({
  selector: 'app-cycle-inputs',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    CalendarScheduleView,
  ],
  templateUrl: './cycle-inputs.html',
  styleUrl: './cycle-inputs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CycleInputs {
  readonly nav = inject(NavigationContext);
  readonly store = inject(CycleInputStore);
  readonly cycles = CYCLES;
  readonly types = INPUT_TYPES;
  readonly labels = INPUT_LABELS;
  private readonly drafts = signal<Readonly<Record<string, Draft>>>({});
  private readonly reads = new Map<string, number>();
  draft(type: InputType) {
    return this.drafts()[this.nav.context().periodo + ':' + type];
  }
  schedule(validation: Validation) {
    return validation.batch?.tipo === 'calendario' ? validation.batch.programacion : undefined;
  }
  async selectFile(type: InputType, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const key = this.nav.context().periodo + ':' + type;
    const cycle = this.nav.context().periodo;
    const token = (this.reads.get(key) ?? 0) + 1;
    this.reads.set(key, token);
    const draft: Draft = {
      text: '',
      filename: file?.name ?? '',
      reading: !!file,
      validation: null,
      message: '',
      activated: false,
    };
    this.drafts.update((v) => ({ ...v, [key]: draft }));
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Límite de la demo: 2 MiB por archivo.');
      if (type === 'calendario' && file.name.toLowerCase().endsWith('.xlsx')) {
        const { readCalendarXlsx } = await import('../../../core/reporting/calendar-xlsx');
        const imported = await readCalendarXlsx(file, cycle);
        if (this.reads.get(key) === token)
          this.drafts.update((v) => ({
            ...v,
            [key]: {
              ...draft,
              reading: false,
              imported,
              text: imported.batch ? JSON.stringify(imported.batch) : '',
              message: 'XLSX leído. Valida para revisar las incidencias y la programación.',
            },
          }));
        return;
      }
      if (!file.name.toLowerCase().endsWith('.json'))
        throw new Error(
          'Usa .xlsx para el calendario operativo 27-2 o .json para las plantillas ficticias.',
        );
      const text = await file.text();
      if (!text.trim()) throw new Error('El archivo está vacío. Se conserva la versión vigente.');
      if (this.reads.get(key) === token)
        this.drafts.update((v) => ({ ...v, [key]: { ...draft, reading: false, text } }));
    } catch (error) {
      if (this.reads.get(key) === token)
        this.drafts.update((v) => ({
          ...v,
          [key]: {
            ...draft,
            reading: false,
            message: error instanceof Error ? error.message : 'No se pudo leer el archivo.',
          },
        }));
    }
  }
  validate(type: InputType) {
    const d = this.draft(type);
    if (!d || d.reading) return;
    const validation = d.imported ?? validateInput(d.text, type, this.nav.context().periodo);
    this.setDraft(type, {
      ...d,
      validation,
      message: validation.errors.length
        ? 'Validación rechazada. La versión vigente no cambia.'
        : 'Validación correcta. Revisa la vista previa antes de activar.',
      activated: false,
    });
  }
  activate(type: InputType) {
    const d = this.draft(type);
    if (!d?.validation?.batch || d.reading || d.activated) return;
    const error = this.store.activate(type, this.nav.context().periodo, d.text, d.filename);
    this.setDraft(type, {
      ...d,
      activated: !error,
      message: error ?? 'Activación simulada completada. Nueva versión vigente en esta pestaña.',
    });
  }
  sample(type: InputType) {
    const cycle = this.nav.context().periodo;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(sampleBatch(type, cycle), null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-${cycle}-ficticio.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  private setDraft(type: InputType, draft: Draft) {
    this.drafts.update((v) => ({ ...v, [this.nav.context().periodo + ':' + type]: draft }));
  }
}
