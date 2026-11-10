import { firstValueFrom } from 'rxjs';
import { DemoData } from './demo-data';
import { DEFAULT_CONTEXT, countRecords, selectRecords } from './models';
describe('Contrato del conjunto ficticio', () => {
  const source = new DemoData();
  it('concilia población, pares, entregas y estados sin duplicar personas', async () => {
    const data = await firstValueFrom(source.query(DEFAULT_CONTEXT));
    expect(countRecords(data.records)).toEqual({
      students: 30,
      expected: 30,
      received: 24,
      graded: 18,
      pending: 6,
      missing: 6,
      overdue: 4,
      within: 2,
    });
    expect(new Set(data.records.map((r) => r.studentId + ':' + r.activityId)).size).toBe(30);
    expect(selectRecords(data.records, 'pendiente').map((r) => r.id)).toEqual([
      'r019',
      'r020',
      'r021',
      'r022',
      'r023',
      'r024',
    ]);
    expect(data.records.find((r) => r.grade === 0)?.state).toBe('calificada');
  });
  it('separa cortes incompletos de selecciones vacías', async () => {
    const incomplete = await firstValueFrom(source.query({ ...DEFAULT_CONTEXT, corte: 'c00' }));
    expect(incomplete.status).toBe('incomplete');
    expect(incomplete.records).toHaveLength(0);
    expect(incomplete.updatedAt).toBeNull();
    for (const filter of [
      { modalidad: 'mixta' },
      { periodo: 'p02' },
      { tipo: 'foro' },
      { unidad: 'u02' },
      { grupo: 'desconocido' },
    ]) {
      const empty = await firstValueFrom(source.query({ ...DEFAULT_CONTEXT, ...filter }));
      expect(empty.status).toBe('complete');
      expect(empty.groups).toHaveLength(0);
      expect(empty.records).toHaveLength(0);
    }
  });
  it('no mezcla el conjunto válido con un error de consulta', async () => {
    await expect(
      firstValueFrom(source.query({ ...DEFAULT_CONTEXT, corte: 'error' })),
    ).rejects.toThrow('Error simulado');
  });
});
