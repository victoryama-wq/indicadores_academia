// Moodle format_time muestra la unidad mayor y, si tiene valor, la inmediatamente menor.
const units = [
  [31536000, 'año', 'años'],
  [86400, 'día', 'días'],
  [3600, 'hora', 'horas'],
  [60, 'minuto', 'minutos'],
  [1, 'segundo', 'segundos'],
] as const;

export function moodleDelay(dueDate: number | null | undefined, readAt: string): string {
  if (dueDate == null) return 'Atraso por confirmar';
  if (dueDate === 0) return 'Sin fecha de entrega';
  const seconds = Math.floor(Date.parse(readAt) / 1000) - dueDate;
  if (seconds <= 0) return 'En plazo';
  const first = units.findIndex(([size]) => seconds >= size);
  let remaining = seconds;
  return (
    units
      .slice(first, first + 2)
      .flatMap(([size, one, many]) => {
        const amount = Math.floor(remaining / size);
        remaining %= size;
        return amount ? [amount + ' ' + (amount === 1 ? one : many)] : [];
      })
      .join(' ') + ' de atraso'
  );
}
