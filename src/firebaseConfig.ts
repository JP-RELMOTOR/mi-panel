// ============================================================
// CONFIG DE FIREBASE — proyecto real: mi-panel-jp
// ============================================================
// La apiKey de Firebase NO es secreta; la seguridad son las
// REGLAS de la base (candado por UID) + Google Sign-In.
// ============================================================

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAKo_iYXFKFtZV0KGXXz2VYUvhrlD4GDpA',
  authDomain: 'mi-panel-jp.firebaseapp.com',
  databaseURL: 'https://mi-panel-jp-default-rtdb.firebaseio.com',
  projectId: 'mi-panel-jp',
  storageBucket: 'mi-panel-jp.firebasestorage.app',
  messagingSenderId: '395535347465',
  appId: '1:395535347465:web:10e247bdae7edfa3e3edd8',
}

export function nubeConfigurada(): boolean {
  const u = FIREBASE_CONFIG.databaseURL
  return !!u && !u.startsWith('PEGAR')
}
