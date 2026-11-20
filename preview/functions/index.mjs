import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { previewGateway } from './gateway.mjs';

initializeApp();
const origin = defineString('VISTA_ORIGEN');
const uid = defineString('VISTA_SISTEMAS_UID');
export const vistaAcademia = onRequest(
  { maxInstances: 2 },
  previewGateway({
    auth: getAuth(),
    origin: () => origin.value(),
    systemsUid: () => uid.value(),
    directory: fileURLToPath(new URL('./app/browser/', import.meta.url)),
  }),
);
