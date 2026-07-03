import { useEffect, useMemo, useRef, useState } from 'react'
import { acciones, useApp } from '../store'
import { hayNube } from '../firebase'
import { Boton, Encabezado, Etiqueta, Tarjeta } from '../ui'
import { fechaCorta } from '../lib/fechas'
import type { Documento } from '../types'

const LIMITE_DATAURL = 7_000_000 // ~7 MB por archivo (RTDB aguanta de sobra)

export default function Documentos() {
  const s = useApp()
  const [examenSel, setExamenSel] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [viendo, setViendo] = useState<Documento | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const examenes = useMemo(
    () =>
      Object.values(s.examenes).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [s.examenes],
  )

  const documentos = useMemo(() => {
    const fechaDe = (d: Documento) =>
      (d.examenId && s.examenes[d.examenId]?.fecha) || d.fecha.slice(0, 10)
    return Object.values(s.documentos).sort((a, b) =>
      fechaDe(a).localeCompare(fechaDe(b)),
    )
  }, [s.documentos, s.examenes])

  async function manejarArchivos(files: FileList | null) {
    if (!files || files.length === 0) return
    setError('')
    setAviso('')
    setSubiendo(true)
    try {
      for (const f of Array.from(files)) {
        const esImagen = f.type.startsWith('image/')
        const dataUrl = esImagen ? await comprimirImagen(f) : await leerDataUrl(f)
        if (dataUrl.length > LIMITE_DATAURL) {
          throw new Error(
            `"${f.name}" es muy grande (${mb(dataUrl.length)}). Límite ~7 MB por archivo.`,
          )
        }
        await acciones.subirDocumento(
          {
            nombre: f.name,
            mime: esImagen ? 'image/jpeg' : f.type || 'application/pdf',
            tamano: dataUrl.length,
            fecha: new Date().toISOString(),
            ...(examenSel ? { examenId: examenSel } : {}),
          },
          dataUrl,
        )
      }
      setAviso(`✓ ${files.length > 1 ? `${files.length} documentos guardados` : 'Documento guardado'} en tu base protegida.`)
    } catch (e) {
      console.warn(e)
      setError(e instanceof Error ? e.message : 'No se pudo subir el documento.')
    } finally {
      setSubiendo(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="p-4 pb-24">
      <Encabezado
        titulo="Documentos"
        subtitulo="Tus exámenes reales (PDF o foto), listos para mostrar al médico"
      />

      <Tarjeta className="p-4">
          <h2 className="font-semibold text-slate-800">Subir documento</h2>
          <p className="mt-1 text-sm text-slate-500">
            {hayNube()
              ? 'PDF o foto. Las fotos se comprimen solas; el archivo queda en tu base privada y se descarga solo cuando lo abres.'
              : 'PDF o foto. Por ahora se guardan en este dispositivo; cuando actives la nube (Firebase) se subirán solos a tu base privada.'}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <select
              value={examenSel}
              onChange={(e) => setExamenSel(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700"
            >
              <option value="">Sin vincular a un examen</option>
              {examenes.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  Vincular a: {fechaCorta(ex.fecha)} · {ex.laboratorio}
                </option>
              ))}
            </select>
            <Boton
              onClick={() => fileRef.current?.click()}
              disabled={subiendo}
              className="w-full"
            >
              {subiendo ? 'Subiendo…' : '📎 Elegir PDF o foto'}
            </Boton>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="hidden"
              onChange={(e) => manejarArchivos(e.target.files)}
            />
          </div>
          {aviso && (
            <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-700">
              {aviso}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
      </Tarjeta>

      {/* lista */}
      <div className="mt-4 flex flex-col gap-2">
        {documentos.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400">
            Aún no hay documentos guardados.
          </p>
        )}
        {documentos.map((d) => {
          const ex = d.examenId ? s.examenes[d.examenId] : undefined
          return (
            <Tarjeta key={d.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl">
                {d.mime.startsWith('image/') ? '🖼' : '📄'}
              </span>
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => setViendo(d)}
              >
                <p className="truncate font-medium text-slate-800">{d.nombre}</p>
                <p className="text-xs text-slate-500">
                  {ex
                    ? `${fechaCorta(ex.fecha)} · ${ex.laboratorio}`
                    : `subido el ${fechaCorta(d.fecha.slice(0, 10))}`}
                  {' · '}
                  {mb(d.tamano)}
                </p>
              </button>
              {ex && <Etiqueta color="sky">🔗</Etiqueta>}
              <button
                onClick={() => {
                  if (confirm(`¿Borrar "${d.nombre}"?`))
                    acciones.borrarDocumento(d.id)
                }}
                className="text-sm text-red-400"
                title="Borrar"
              >
                ✕
              </button>
            </Tarjeta>
          )
        })}
      </div>

      {viendo && <Visor doc={viendo} onCerrar={() => setViendo(null)} />}
    </div>
  )
}

// ---------- visor a pantalla completa ----------

function Visor({ doc, onCerrar }: { doc: Documento; onCerrar: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let objUrl: string | null = null
    acciones
      .cargarArchivo(doc.id)
      .then((dataUrl) => {
        if (!dataUrl) {
          setError('No se pudo descargar el archivo.')
          return
        }
        objUrl = dataUrlABlobUrl(dataUrl)
        setUrl(objUrl)
      })
      .catch(() => setError('No se pudo descargar el archivo.'))
    return () => {
      if (objUrl) URL.revokeObjectURL(objUrl)
    }
  }, [doc.id])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85">
      <div className="flex items-center justify-between gap-2 p-3">
        <p className="min-w-0 truncate text-sm font-medium text-white">
          {doc.nombre}
        </p>
        <div className="flex shrink-0 gap-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white/15 px-3 py-1.5 text-sm text-white"
              title="Abrir en el visor del navegador (zoom y scroll completo)"
            >
              ↗ Abrir
            </a>
          )}
          {url && (
            <a
              href={url}
              download={doc.nombre}
              className="rounded-full bg-white/15 px-3 py-1.5 text-sm text-white"
            >
              ⬇ Guardar
            </a>
          )}
          <button
            onClick={onCerrar}
            className="rounded-full bg-white/15 px-3 py-1.5 text-sm text-white"
          >
            ✕ Cerrar
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {!url && !error && (
          <p className="mt-16 text-center text-sm text-slate-300">
            Descargando…
          </p>
        )}
        {error && (
          <p className="mt-16 text-center text-sm text-red-300">{error}</p>
        )}
        {url && doc.mime.startsWith('image/') && (
          <div className="flex h-full items-center justify-center overflow-auto p-2">
            <img src={url} alt={doc.nombre} className="max-h-full max-w-full" />
          </div>
        )}
        {url && !doc.mime.startsWith('image/') && (
          <iframe src={url} title={doc.nombre} className="h-full w-full bg-white" />
        )}
      </div>
    </div>
  )
}

// ---------- helpers ----------

function mb(chars: number): string {
  return `${(chars / 1_000_000).toFixed(1).replace('.', ',')} MB`
}

function leerDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = rej
    r.readAsDataURL(f)
  })
}

// Fotos: bajar a máx 2200 px y JPEG 82% — un informe fotografiado queda
// legible en unos cientos de KB.
async function comprimirImagen(f: File): Promise<string> {
  const url = URL.createObjectURL(f)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const MAX = 2200
    const escala = Math.min(1, MAX / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * escala)
    canvas.height = Math.round(img.height * escala)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function dataUrlABlobUrl(dataUrl: string): string {
  const coma = dataUrl.indexOf(',')
  const mime =
    dataUrl.slice(0, coma).match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream'
  const bin = atob(dataUrl.slice(coma + 1))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}
