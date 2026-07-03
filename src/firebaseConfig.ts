// ============================================================
// CONFIG DE FIREBASE — pegar aquí la config real del proyecto
// ============================================================
// Pasos (una sola vez, ~10 min):
//  1. console.firebase.google.com → Agregar proyecto (nombre NEUTRO,
//     ej. "mi-panel-jp", sin Analytics).
//  2. Build → Realtime Database → Crear base de datos → modo BLOQUEADO.
//  3. Build → Authentication → Comenzar → habilitar proveedor Google.
//  4. Authentication → Settings → Dominios autorizados → agregar
//     el dominio de GitHub Pages (usuario.github.io).
//  5. ⚙ Configuración del proyecto → Tus apps → app web </> (sin
//     Hosting) → copiar el objeto firebaseConfig → pegarlo abajo.
//  6. Entrar con Google en la app → menú de usuario → copiar UID.
//  7. Realtime Database → Reglas → pegar database.rules.json
//     reemplazando PEGAR_UID por el UID real → Publicar.
//
// Mientras databaseURL empiece con "PEGAR", la app corre en modo
// LOCAL (sin nube): todo se guarda solo en este dispositivo.
// La apiKey de Firebase NO es secreta; la seguridad son las REGLAS.
// ============================================================

export const FIREBASE_CONFIG = {
  apiKey: 'PEGAR_API_KEY',
  authDomain: 'PEGAR.firebaseapp.com',
  databaseURL: 'PEGAR_DATABASE_URL',
  projectId: 'PEGAR_PROJECT_ID',
  storageBucket: 'PEGAR.firebasestorage.app',
  messagingSenderId: 'PEGAR',
  appId: 'PEGAR',
}

export function nubeConfigurada(): boolean {
  const u = FIREBASE_CONFIG.databaseURL
  return !!u && !u.startsWith('PEGAR')
}
