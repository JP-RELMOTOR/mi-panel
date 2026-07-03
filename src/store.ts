// ============================================================
// Store central — patrón de la receta (useSyncExternalStore +
// localStorage + Firebase RTDB) MÁS candado de autenticación:
// el listener de datos se cuelga SOLO después del login, y al
// cerrar sesión se borra el caché local (datos de salud fuera
// del dispositivo).
// ============================================================
import { useSyncExternalStore } from 'react'
import {
  get,
  onValue,
  ref,
  set,
  update,
  remove,
  type Unsubscribe,
} from 'firebase/database'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, db, hayNube, RAIZ } from './firebase'
import {
  borrarArchivoLocal,
  guardarArchivoLocal,
  leerArchivoLocal,
  listarArchivosLocales,
} from './lib/archivosLocal'
import {
  estadoVacio,
  type AppState,
  type Consulta,
  type Documento,
  type HabitoDia,
  type Informe,
  type Lectura,
  type Medicamento,
  type Tamizaje,
} from './types'

const STORAGE_KEY = 'panel_estado_v1'

// ---------- estado + suscriptores ----------

let estado: AppState = cargarLocal()
const listeners = new Set<() => void>()

interface AuthState {
  usuario: User | null
  authListo: boolean
  sinAcceso: boolean
  nubeLista: boolean
}

let authState: AuthState = {
  usuario: null,
  authListo: !hayNube(), // en modo local no hay login
  sinAcceso: false,
  nubeLista: !hayNube(),
}

function notify() {
  listeners.forEach((l) => l())
}

function setAuthState(parcial: Partial<AuthState>) {
  authState = { ...authState, ...parcial }
  notify()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, () => estado)
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => authState)
}

// ---------- persistencia local ----------

function cargarLocal(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...estadoVacio(), ...JSON.parse(raw) }
  } catch {
    /* caché corrupto: partir de cero */
  }
  return estadoVacio()
}

function guardarLocal(s: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* sin espacio: seguir en memoria */
  }
}

function setLocal(actualizar: (s: AppState) => AppState) {
  estado = actualizar(estado)
  guardarLocal(estado)
  notify()
}

// ---------- nube ----------

// RTDB no acepta undefined: limpiar antes de escribir
function limpio<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function cloudSet(path: string, val: unknown) {
  if (!hayNube() || !db || !authState.usuario) return
  set(ref(db, `${RAIZ}/${path}`), limpio(val)).catch((e) =>
    console.warn('cloudSet:', path, e),
  )
}

function cloudRemove(path: string) {
  if (!hayNube() || !db || !authState.usuario) return
  remove(ref(db, `${RAIZ}/${path}`)).catch((e) =>
    console.warn('cloudRemove:', path, e),
  )
}

// Snapshot de la nube → AppState (defaults ?? {} por las trampas de RTDB:
// omite objetos vacíos)
function cloudAEstado(val: Record<string, unknown> | null): AppState {
  const v = (val ?? {}) as Record<string, never>
  return {
    perfil: v['perfil'] ?? {},
    grupos: v['grupos'] ?? {},
    analitos: v['analitos'] ?? {},
    examenes: v['examenes'] ?? {},
    resultados: v['resultados'] ?? {},
    tamizajes: v['tamizajes'] ?? {},
    eventos: v['eventos'] ?? {},
    medicamentos: v['medicamentos'] ?? {},
    tomas: v['tomas'] ?? {},
    habitos: v['habitos'] ?? {},
    consultas: v['consultas'] ?? {},
    lecturas: v['lecturas'] ?? {},
    documentos: v['documentos'] ?? {},
    informe: v['informe'] ?? null,
    config: v['config'] ?? {},
  }
}

let unsubData: Unsubscribe | null = null
let archivosSincronizados = false

// Documentos guardados sin nube (pendientes en IndexedDB) → subirlos al
// conectar, con sus metadatos.
async function sincronizarArchivosPendientes() {
  if (!db || !authState.usuario) return
  try {
    const filas = await listarArchivosLocales()
    for (const f of filas.filter((x) => x.pendiente)) {
      await set(ref(db, `archivos/${f.id}`), { id: f.id, datos: f.datos })
      setLocal((s) => ({
        ...s,
        documentos: { ...s.documentos, [f.id]: f.meta },
      }))
      cloudSet(`documentos/${f.id}`, f.meta)
      await guardarArchivoLocal({ ...f, pendiente: false })
    }
  } catch (e) {
    console.warn('sincronizarArchivos:', e)
  }
}

function conectarDatos() {
  if (!db || unsubData) return
  unsubData = onValue(
    ref(db, RAIZ),
    (snap) => {
      estado = cloudAEstado(snap.val())
      guardarLocal(estado)
      setAuthState({ nubeLista: true, sinAcceso: false })
      if (!archivosSincronizados) {
        archivosSincronizados = true
        sincronizarArchivosPendientes()
      }
    },
    (err) => {
      // Cuenta autenticada pero sin permiso (reglas): pantalla "sin acceso"
      console.warn('onValue:', err)
      setAuthState({ nubeLista: true, sinAcceso: true })
    },
  )
}

function desconectarDatos() {
  unsubData?.()
  unsubData = null
  archivosSincronizados = false
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignorar */
  }
  estado = estadoVacio()
  setAuthState({ nubeLista: false, sinAcceso: false })
}

// Arranque de auth (solo con nube configurada)
if (hayNube() && auth) {
  getRedirectResult(auth).catch((e) => console.warn('redirect:', e))
  onAuthStateChanged(auth, (u) => {
    if (u) {
      setAuthState({ usuario: u, authListo: true })
      conectarDatos()
    } else {
      desconectarDatos()
      setAuthState({ usuario: null, authListo: true })
    }
  })
}

// ---------- IDs ----------

function nuevoId(prefijo: string): string {
  return `${prefijo}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`
}

// ---------- acciones ----------

export const acciones = {
  async entrarConGoogle() {
    if (!auth) return
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? ''
      // Popup bloqueado (típico en PWA instalada) → intentar redirect
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await signInWithRedirect(auth, provider)
      } else {
        throw e
      }
    }
  },

  async salir() {
    if (!auth) return
    await signOut(auth) // onAuthStateChanged hace la limpieza
  },

  // ----- tamizajes -----
  guardarTamizaje(t: Tamizaje) {
    setLocal((s) => ({ ...s, tamizajes: { ...s.tamizajes, [t.id]: t } }))
    cloudSet(`tamizajes/${t.id}`, t)
  },

  cicloEstadoTamizaje(id: string) {
    const t = estado.tamizajes[id]
    if (!t) return
    const orden: Tamizaje['estado'][] = ['pendiente', 'agendado', 'hecho']
    const sig = orden[(orden.indexOf(t.estado) + 1) % orden.length]
    acciones.guardarTamizaje({ ...t, estado: sig })
  },

  // ----- hábitos (un nodo por día: idempotente) -----
  guardarHabito(fecha: string, h: HabitoDia) {
    setLocal((s) => ({ ...s, habitos: { ...s.habitos, [fecha]: h } }))
    cloudSet(`habitos/${fecha}`, h)
  },

  // ----- medicamentos y tomas -----
  guardarMedicamento(m: Medicamento) {
    setLocal((s) => ({
      ...s,
      medicamentos: { ...s.medicamentos, [m.id]: m },
    }))
    cloudSet(`medicamentos/${m.id}`, m)
  },

  nuevoMedicamento(datos: Omit<Medicamento, 'id'>): Medicamento {
    const m: Medicamento = { ...datos, id: nuevoId('med') }
    acciones.guardarMedicamento(m)
    return m
  },

  registrarToma(medId: string, fecha: string, nota?: string) {
    const toma = nota ? { fecha, nota } : { fecha }
    setLocal((s) => ({
      ...s,
      tomas: {
        ...s.tomas,
        [medId]: { ...(s.tomas[medId] ?? {}), [fecha]: toma },
      },
    }))
    cloudSet(`tomas/${medId}/${fecha}`, toma)
  },

  quitarToma(medId: string, fecha: string) {
    setLocal((s) => {
      const delMed = { ...(s.tomas[medId] ?? {}) }
      delete delMed[fecha]
      return { ...s, tomas: { ...s.tomas, [medId]: delMed } }
    })
    cloudRemove(`tomas/${medId}/${fecha}`)
  },

  // ----- asistente -----
  guardarConsulta(c: Consulta) {
    setLocal((s) => ({ ...s, consultas: { ...s.consultas, [c.id]: c } }))
    cloudSet(`consultas/${c.id}`, c)
  },

  borrarConsulta(id: string) {
    setLocal((s) => {
      const consultas = { ...s.consultas }
      delete consultas[id]
      return { ...s, consultas }
    })
    cloudRemove(`consultas/${id}`)
  },

  guardarLectura(l: Lectura) {
    setLocal((s) => ({ ...s, lecturas: { ...s.lecturas, [l.id]: l } }))
    cloudSet(`lecturas/${l.id}`, l)
  },

  borrarLectura(id: string) {
    setLocal((s) => {
      const lecturas = { ...s.lecturas }
      delete lecturas[id]
      return { ...s, lecturas }
    })
    cloudRemove(`lecturas/${id}`)
  },

  // ----- documentos originales (PDF/foto) -----
  // El archivo (dataURL base64) vive en IndexedDB del dispositivo Y en la
  // rama separada `archivos/{id}` de la nube (fuera del onValue principal,
  // se descarga solo a pedido). Sin nube: queda local marcado pendiente y
  // se sube solo al conectar.
  async subirDocumento(
    meta: Omit<Documento, 'id'>,
    dataUrl: string,
  ): Promise<Documento> {
    const id = nuevoId('doc')
    const doc: Documento = { ...meta, id }
    const enNube = hayNube() && !!db && !!authState.usuario
    if (enNube && db) {
      // primero el archivo; si falla, no queda metadato huérfano
      await set(ref(db, `archivos/${id}`), { id, datos: dataUrl })
    }
    await guardarArchivoLocal({
      id,
      meta: doc,
      datos: dataUrl,
      pendiente: !enNube,
    })
    setLocal((s) => ({ ...s, documentos: { ...s.documentos, [id]: doc } }))
    cloudSet(`documentos/${id}`, doc)
    return doc
  },

  async cargarArchivo(id: string): Promise<string | null> {
    // caché local primero (y única fuente en modo sin nube)
    const local = await leerArchivoLocal(id).catch(() => undefined)
    if (local) return local.datos
    if (!hayNube() || !db || !authState.usuario) return null
    const snap = await get(ref(db, `archivos/${id}`))
    const datos = (snap.val() as { datos?: string } | null)?.datos ?? null
    if (datos) {
      const meta = estado.documentos[id]
      if (meta) {
        guardarArchivoLocal({ id, meta, datos, pendiente: false }).catch(
          () => {},
        )
      }
    }
    return datos
  },

  borrarDocumento(id: string) {
    setLocal((s) => {
      const documentos = { ...s.documentos }
      delete documentos[id]
      return { ...s, documentos }
    })
    borrarArchivoLocal(id).catch(() => {})
    cloudRemove(`documentos/${id}`)
    if (hayNube() && db && authState.usuario) {
      remove(ref(db, `archivos/${id}`)).catch((e) =>
        console.warn('borrarArchivo:', e),
      )
    }
  },

  guardarInforme(informe: Informe) {
    setLocal((s) => ({ ...s, informe }))
    cloudSet('informe', informe)
  },

  setApiKey(apiKey: string) {
    setLocal((s) => ({ ...s, config: { ...s.config, apiKey } }))
    cloudSet(`config/apiKey`, apiKey)
  },

  setModelo(modelo: string) {
    setLocal((s) => ({ ...s, config: { ...s.config, modelo } }))
    cloudSet(`config/modelo`, modelo)
  },

  nuevoIdPublico(prefijo: string) {
    return nuevoId(prefijo)
  },

  // ----- importación (única vía de entrada de la semilla) -----
  // Acepta un JSON con cualquiera de las colecciones del estado y hace un
  // merge idempotente: mismo id → se sobreescribe, ids nuevos → se agregan.
  importarDatos(json: Record<string, unknown>): string {
    const COLECCIONES = [
      'grupos',
      'analitos',
      'examenes',
      'tamizajes',
      'eventos',
      'medicamentos',
      'consultas',
      'lecturas',
    ] as const

    const resumen: string[] = []
    const rutas: Record<string, unknown> = {}

    for (const col of COLECCIONES) {
      const datos = json[col] as Record<string, unknown> | undefined
      if (!datos || typeof datos !== 'object') continue
      const n = Object.keys(datos).length
      resumen.push(`${n} ${col}`)
      for (const [id, val] of Object.entries(datos)) {
        rutas[`${col}/${id}`] = limpio(val)
      }
      setLocal((s) => ({
        ...s,
        [col]: {
          ...(s[col] as Record<string, unknown>),
          ...limpio(datos),
        },
      }))
    }

    // matrices de dos niveles: resultados (analito→examen) y tomas (med→fecha)
    for (const col of ['resultados', 'tomas'] as const) {
      const matriz = json[col] as
        | Record<string, Record<string, unknown>>
        | undefined
      if (!matriz || typeof matriz !== 'object') continue
      let n = 0
      for (const [k1, porK2] of Object.entries(matriz)) {
        for (const [k2, r] of Object.entries(porK2)) {
          rutas[`${col}/${k1}/${k2}`] = limpio(r)
          n++
        }
      }
      resumen.push(`${n} ${col}`)
      setLocal((s) => {
        const merged = { ...(s[col] as Record<string, Record<string, unknown>>) }
        for (const [k1, porK2] of Object.entries(matriz)) {
          merged[k1] = { ...(merged[k1] ?? {}), ...limpio(porK2) }
        }
        return { ...s, [col]: merged }
      })
    }

    // perfil, informe y hábitos (merge simple / reemplazo)
    const perfil = json['perfil'] as Record<string, unknown> | undefined
    if (perfil && typeof perfil === 'object') {
      rutas[`perfil`] = limpio(perfil)
      resumen.push('perfil')
      setLocal((s) => ({ ...s, perfil: { ...s.perfil, ...limpio(perfil) } }))
    }
    const informe = json['informe'] as Informe | undefined
    if (informe && typeof informe === 'object') {
      rutas[`informe`] = limpio(informe)
      resumen.push('informe de cabecera')
      setLocal((s) => ({ ...s, informe: limpio(informe) }))
    }
    const habitos = json['habitos'] as Record<string, unknown> | undefined
    if (habitos && typeof habitos === 'object') {
      for (const [fecha, h] of Object.entries(habitos)) {
        rutas[`habitos/${fecha}`] = limpio(h)
      }
      resumen.push(`${Object.keys(habitos).length} días de hábitos`)
      setLocal((s) => ({
        ...s,
        habitos: {
          ...s.habitos,
          ...(limpio(habitos) as AppState['habitos']),
        },
      }))
    }

    // config: conservar la API key si viene en un respaldo
    const config = json['config'] as { apiKey?: string } | undefined
    if (config?.apiKey) {
      rutas[`config/apiKey`] = config.apiKey
      setLocal((s) => ({
        ...s,
        config: { ...s.config, apiKey: config.apiKey },
      }))
    }

    const marca = new Date().toISOString()
    rutas[`config/ultimaImportacion`] = marca
    rutas[`config/esquemaVersion`] = 1
    setLocal((s) => ({
      ...s,
      config: { ...s.config, ultimaImportacion: marca, esquemaVersion: 1 },
    }))

    // Un solo update multi-path (idempotente: re-importar no duplica)
    if (hayNube() && db && authState.usuario) {
      update(ref(db, RAIZ), rutas as never).catch((e) =>
        console.warn('importarDatos:', e),
      )
    }

    return resumen.join(', ')
  },

  exportarDatos(): string {
    return JSON.stringify(estado, null, 2)
  },
}
