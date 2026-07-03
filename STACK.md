# 🧰 Stack técnico v2 — PWA con login Google y sesión privada

Evolución de la receta de **Cocina SAET / Predicación Pública Andes**, probada
aquí en **Mi Panel**. La gran novedad: **autenticación real con Google** y
datos privados por usuario — sin servidor propio y gratis.

> Usa esta receta cuando los datos NO deban ser públicos: apps personales,
> apps por usuario, o apps de grupo con acceso controlado.

---

## 1) La arquitectura en una frase

> Una PWA (React + Vite + Tailwind) en hosting gratis, con **Firebase
> Realtime Database** para los datos y **Firebase Authentication (Google)**
> como candado. Las **reglas** de la base deciden quién lee/escribe qué.
> Costo: $0.

```
 📱 dispositivo                    ☁️ Firebase (gratis)
┌──────────────────┐  login   ┌──────────────────────────┐
│ PWA React+Vite   │ ───────▶ │ Authentication (Google)  │
│ store propio     │          ├──────────────────────────┤
│ localStorage     │ ◀──────▶ │ Realtime DB + REGLAS     │
│ IndexedDB (files)│  onValue │  (candado por UID)       │
└──────────────────┘          └──────────────────────────┘
        hosting: GitHub Pages y/o Firebase Hosting (URL limpia .web.app)
```

## 2) Piezas (todas gratis)

| Pieza | Para qué |
|---|---|
| React + Vite + TS + Tailwind v4 | App, `base:'./'` para Pages |
| Firebase **Authentication** (Google) | Login real; sesión persistente por dispositivo |
| Firebase **Realtime Database** (Spark) | Datos en vivo; REGLAS = la seguridad |
| **Reglas por UID** | Privacidad real del lado del servidor |
| PWA (manifest + sw.js) | Instalable, offline |
| **IndexedDB** | Archivos (PDF/fotos) locales + caché; sync al conectar |
| GitHub Pages **y/o Firebase Hosting** | Hosting; `.web.app` da URL limpia sin "github.io" |
| firebase-tools (CLI) | Automatiza TODO: proyecto, DB, reglas, hosting, migraciones |

## 3) Autenticación — el patrón que funciona

- **`signInWithPopup` primario, fallback `signInWithRedirect`** en estos
  errores: `popup-blocked`, `popup-closed-by-user`, `cancelled-popup-request`,
  `operation-not-supported-in-this-environment`. (El redirect puro está
  semi-roto en Safari/iOS cuando la app vive en un dominio distinto al
  authDomain — ITP. El login es un evento una-vez-por-dispositivo.)
- **El listener de datos se cuelga SOLO tras el login** (dentro de
  `onAuthStateChanged` con usuario). Con reglas cerradas, un `onValue` sin
  sesión da `permission_denied` y el SDK CANCELA el listener.
- **Callback de error del `onValue`** → pantalla "esta cuenta no tiene
  acceso" (evita el spinner infinito para cuentas no autorizadas).
- **Al cerrar sesión**: detach del listener + `localStorage.removeItem` +
  estado vacío (los datos sensibles no quedan en el dispositivo).
- El **service worker** debe hacer bypass de `firebaseapp.com` (handler de
  auth), además de `firebaseio/googleapis/gstatic`.

## 4) Reglas — un dueño o multi-usuario

**App de UN dueño (como Mi Panel):**
```json
{ "rules": { ".read": false, ".write": false,
  "salud": {
    ".read":  "auth != null && auth.uid === 'UID_DEL_DUEÑO'",
    ".write": "auth != null && auth.uid === 'UID_DEL_DUEÑO'" } } }
```

**App MULTI-USUARIO — cada uno ve solo lo suyo:**
```json
{ "rules": { ".read": false, ".write": false,
  "usuarios": { "$uid": {
    ".read":  "auth != null && auth.uid === $uid",
    ".write": "auth != null && auth.uid === $uid" } },
  "compartido": {
    ".read":  "auth != null",
    ".write": "auth != null" } } }
```
En el store, la raíz por usuario es dinámica: `usuarios/${user.uid}` — se
arma dentro de `onAuthStateChanged`.

**Con lista de invitados (solo cuentas aprobadas):**
```json
"datos": {
  ".read":  "auth != null && root.child('permitidos').child(auth.uid).exists()",
  ".write": "auth != null && root.child('permitidos').child(auth.uid).exists()"
},
"permitidos": { ".read": false, ".write": false }
```
(`permitidos/{uid}: true` se agrega a mano en la consola o con la CLI.)

## 5) Archivos (PDF/fotos) sin Storage (que pide tarjeta)

- Guardarlos como **dataURL base64** en una rama SEPARADA (`archivos/{id}`)
  que el `onValue` principal NO descarga; se leen a pedido con `get()`.
  Límite práctico ~7 MB por archivo; fotos → comprimir a JPEG 0.82 / 2200 px.
- **IndexedDB local primero**: permite subir/ver sin nube y sirve de caché.
  Los pendientes se suben solos al conectar (flag `pendiente`).
- Metadatos livianos (`documentos/{id}`) sí van en el árbol principal.

## 6) Asistente IA (opcional)

`@anthropic-ai/sdk` con `dangerouslyAllowBrowser: true` — directo del
navegador, sin backend. La **API key vive en la base protegida** (nunca en el
repo). Contexto = JSON compacto del estado + system prompt con el rol.
Structured outputs para respuestas con esquema. Bypass de `anthropic.com` en
el sw.js.

## 7) Receta CLI (automatiza casi todo)

```bash
firebase login                                   # una vez (interactivo)
firebase projects:create mi-proyecto -n "Nombre"
firebase apps:create WEB "Nombre" --project mi-proyecto
firebase apps:sdkconfig WEB <appId> --project mi-proyecto   # → firebaseConfig
# La RTDB por defecto y el proveedor Google se crean en la consola (3 clicks):
#   /database → Crear (modo bloqueado) · /authentication → Google → Habilitar
firebase deploy --only database --project mi-proyecto        # reglas
firebase database:set /ruta datos.json --project mi-proyecto # migraciones admin
firebase deploy --only hosting --project mi-proyecto         # URL limpia .web.app
```
El UID de cada usuario aparece tras su primer login
(`firebase auth:export`), y ahí se cierran las reglas.

## 8) Hosting y URL limpia

- **GitHub Pages** (gratis, repo público): `usuario.github.io/repo/`.
- **Firebase Hosting** (gratis, mismo proyecto): `proyecto.web.app` —
  URL limpia, sin marca de GitHub, y sus dominios ya vienen **autorizados
  para el login**. `firebase.json`: `{"hosting": {"public": "dist"}}`.
- **Dominio propio** (~US$10/año): ambos hostings lo aceptan; recordar
  agregarlo en Authentication → Dominios autorizados.
- Pages a veces falla con "Deployment failed, try again later" → relanzar
  `gh workflow run deploy.yml` (no es culpa del código).

## 9) Trampas nuevas aprendidas (además de las de la receta v1)

- `onValue` con error (permission_denied) **cancela** el listener: hay que
  reconectar tras arreglar reglas (reload).
- localStorage tiene cuota (~5 MB): archivos SIEMPRE a IndexedDB.
- La config de Firebase (apiKey etc.) **no es secreta** y puede ir commiteada;
  la seguridad son reglas + Auth. El UID en cambio déjalo fuera del repo
  (placeholder) por prolijidad.
- iOS congela ícono/nombre del PWA al instalar → quitar y re-agregar.
- Import/Export de datos como JSON via UI = respaldo bajo control del usuario
  y única vía de entrada de datos personales (nunca en el código del repo).
