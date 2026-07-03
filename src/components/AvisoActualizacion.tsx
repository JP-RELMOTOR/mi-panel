import { useEffect, useState } from 'react'

// Detecta si hay una versión nueva publicada comparando el nombre del bundle
// actual con el que sirve el servidor. Revisa al abrir, al volver a la app
// (visibilitychange) y cada 5 minutos. Solo en producción.

function bundleActual(): string | null {
  try {
    const m = new URL(import.meta.url).pathname.match(/index-[^/]+\.js$/)
    return m ? m[0] : null
  } catch {
    return null
  }
}

let ultimaRevision = 0

async function hayVersionNueva(): Promise<boolean> {
  const actual = bundleActual()
  if (!actual) return false
  const ahora = Date.now()
  if (ahora - ultimaRevision < 60_000) return false // máx. 1 vez por minuto
  ultimaRevision = ahora
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}index.html`, {
      cache: 'no-store',
    })
    const html = await res.text()
    const m = html.match(/index-[^/"]+\.js/)
    return !!m && m[0] !== actual
  } catch {
    return false
  }
}

export default function AvisoActualizacion() {
  const [nueva, setNueva] = useState(false)

  useEffect(() => {
    if (!import.meta.env.PROD) return
    const revisar = () => {
      hayVersionNueva().then((si) => si && setNueva(true))
    }
    revisar()
    const alVolver = () => {
      if (document.visibilityState === 'visible') revisar()
    }
    document.addEventListener('visibilitychange', alVolver)
    const intervalo = setInterval(revisar, 5 * 60_000)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      clearInterval(intervalo)
    }
  }, [])

  if (!nueva) return null

  return (
    <div className="no-print fixed bottom-16 inset-x-0 z-40 px-4 pb-2">
      <button
        onClick={() => location.reload()}
        className="w-full rounded-2xl bg-amber-400 text-amber-950 font-semibold py-3 shadow-lg flex items-center justify-center gap-2"
      >
        ✨ Hay una versión nueva — Toca para actualizar
      </button>
    </div>
  )
}
