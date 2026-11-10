import { MatPaginatorIntl } from '@angular/material/paginator';

// Keep paginator dependencies with the lazy student list, not in the root bootstrap.
export function spanishPaginator(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  intl.itemsPerPageLabel = 'Registros por página';
  intl.nextPageLabel = 'Página siguiente';
  intl.previousPageLabel = 'Página anterior';
  intl.firstPageLabel = 'Primera página';
  intl.lastPageLabel = 'Última página';
  intl.getRangeLabel = (page, size, total) =>
    total === 0
      ? '0 registros'
      : `${page * size + 1}–${Math.min((page + 1) * size, total)} de ${total}`;
  return intl;
}
