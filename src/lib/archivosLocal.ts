// Almacén local de archivos (IndexedDB): permite guardar y ver documentos
// SIN nube configurada, y sirve de caché para no re-descargar. Los que
// queden pendientes se suben solos cuando la nube se conecta.
import type { Documento } from '../types'

const DB_NOMBRE = 'panel_archivos'
const STORE = 'archivos'

export interface FilaArchivo {
  id: string
  meta: Documento
  datos: string // dataURL completo
  pendiente: boolean // aún no subido a la nube
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NOMBRE, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

function tx<T>(
  modo: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return abrir().then(
    (db) =>
      new Promise<T>((res, rej) => {
        const t = db.transaction(STORE, modo)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => res(req.result)
        req.onerror = () => rej(req.error)
      }),
  )
}

export function guardarArchivoLocal(fila: FilaArchivo) {
  return tx('readwrite', (s) => s.put(fila))
}

export function leerArchivoLocal(
  id: string,
): Promise<FilaArchivo | undefined> {
  return tx('readonly', (s) => s.get(id) as IDBRequest<FilaArchivo | undefined>)
}

export function borrarArchivoLocal(id: string) {
  return tx('readwrite', (s) => s.delete(id))
}

export function listarArchivosLocales(): Promise<FilaArchivo[]> {
  return tx('readonly', (s) => s.getAll() as IDBRequest<FilaArchivo[]>)
}
