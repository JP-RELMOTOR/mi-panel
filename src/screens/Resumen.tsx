import { useMemo, useState } from 'react'
import { acciones, useApp } from '../store'
import { Encabezado, Tarjeta } from '../ui'
import Markdown from '../components/Markdown'
import { fechaCorta, lunesDeEstaSemana } from '../lib/fechas'
import { fmt, hallazgos } from '../lib/rangos'
import { armarContexto, errorLegible, generarInforme } from '../lib/claude'
import { META_CARDIO_MIN, META_FUERZA_SESIONES } from '../config'

export default function Resumen({
  onIr,
}: {
  onIr: (p: 'examenes' | 'prevencion' | 'diario' | 'ajustes') => void
}) {
  const s = useApp()
  const [regenerando, setRegenerando] = useState(false)
  const [error, setError] = useState('')

  const lista = useMemo(() => hallazgos(s), [s])
  const semana = useMemo(() => {
    const lunes = lunesDeEstaSemana()
    let cardio = 0
    let fuerza = 0
    for (const [f, dia] of Object.entries(s.habitos)) {
      if (f >= lunes) {
        cardio += dia.cardioMin ?? 0
        if (dia.fuerza) fuerza++
      }
    }
    return { cardio, fuerza }
  }, [s.habitos])

  const vacio = Object.keys(s.examenes).length === 0
  const informe = s.informe

  async function regenerar() {
    if (!s.config.apiKey || regenerando) return
    setError('')
    setRegenerando(true)
    try {
      const nuevo = await generarInforme(s.config.apiKey, armarContexto(s))
      acciones.guardarInforme(nuevo)
    } catch (e) {
      console.warn(e)
      setError(errorLegible(e))
    } finally {
      setRegenerando(false)
    }
  }

  if (vacio) {
    return (
      <div className="p-4">
        <Encabezado titulo="Resumen" subtitulo="Tu salud, en un solo lugar" />
        <Tarjeta className="p-8 text-center">
          <div className="text-4xl">🌱</div>
          <h2 className="mt-3 font-bold text-slate-800">
            Empecemos por tus datos
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Abre el menú de usuario (arriba a la derecha) → <b>Importar</b> y
            carga tu archivo de datos. Todo queda protegido en tu base
            privada.
          </p>
        </Tarjeta>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <Encabezado titulo="Resumen" subtitulo="Tu salud, en un solo lugar" />

      {/* ===== informe de cabecera: la opinión ===== */}
      {informe ? (
        <Tarjeta className="border-sky-100 p-4 ring-1 ring-sky-50">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-slate-800">
              👨‍⚕️ Cómo veo tu salud
            </h2>
            <span className="shrink-0 text-[11px] text-slate-400">
              {fechaCorta(informe.fecha.slice(0, 10))}
              {informe.origen === 'asistente' ? ' · IA' : ''}
            </span>
          </div>
          <div className="mt-2">
            <Markdown texto={informe.opinion} />
          </div>
          {s.config.apiKey && (
            <button
              onClick={regenerar}
              disabled={regenerando}
              className="mt-3 w-full rounded-xl bg-slate-50 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              {regenerando
                ? 'Actualizando con el Asistente…'
                : '✨ Actualizar con el Asistente (usa tus datos al día)'}
            </button>
          )}
          {error && (
            <p className="mt-2 rounded-xl bg-red-50 p-2.5 text-sm text-red-700">
              {error}
            </p>
          )}
        </Tarjeta>
      ) : (
        <Tarjeta className="p-4">
          <p className="text-sm text-slate-600">
            👨‍⚕️ Tu informe de cabecera aún no está cargado — re-importa la
            semilla actualizada (menú → Importar) o genera uno con el
            Asistente.
          </p>
        </Tarjeta>
      )}

      {/* ===== los cambios, en orden de impacto ===== */}
      {informe && informe.acciones.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 px-1 text-base font-bold text-slate-800">
            Los cambios, en orden de impacto
          </h2>
          <div className="flex flex-col gap-2.5">
            {(() => {
              let n = 0
              return informe.acciones.map((a, i) => {
                const urgente = a.urgencia === 'alta'
                if (!urgente) n++
                return (
                  <Tarjeta
                    key={i}
                    className={`flex gap-3 p-4 ${
                      urgente ? 'border-red-100 ring-1 ring-red-50' : ''
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-white ${
                        urgente ? 'bg-red-600' : 'bg-sky-800'
                      }`}
                    >
                      {urgente ? '!' : n}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800">
                        {a.titulo}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {a.detalle}
                      </p>
                      <p className="mt-1.5 text-sm font-medium text-sky-800">
                        Por qué: {a.porque}
                      </p>
                    </div>
                  </Tarjeta>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* ===== secundario: estado actual compacto ===== */}
      <div className="mt-5">
        <Tarjeta className="p-4">
          <button className="w-full text-left" onClick={() => onIr('examenes')}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                🧪 Valores a la vista
              </h2>
              <span className="text-slate-400">→</span>
            </div>
          </button>
          {lista.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              Todo dentro de rango y sin cambios grandes. 💚
            </p>
          ) : (
            <div className="mt-1 divide-y divide-slate-100">
              {lista.slice(0, 5).map((hz) => (
                <div
                  key={hz.analitoId}
                  className="flex items-baseline justify-between gap-2 py-2"
                >
                  <span className="text-sm text-slate-700">{hz.nombre}</span>
                  <span className="flex items-baseline gap-2 font-mono text-sm">
                    <span
                      className={`font-semibold ${
                        hz.estado === 'out'
                          ? 'text-red-600'
                          : hz.estado === 'watch'
                            ? 'text-amber-700'
                            : 'text-slate-800'
                      }`}
                    >
                      {hz.ultimo.valor != null
                        ? fmt(hz.ultimo.valor)
                        : hz.ultimo.texto}
                      {hz.unidad && hz.ultimo.valor != null && (
                        <span className="ml-1 text-xs font-normal text-slate-400">
                          {hz.unidad}
                        </span>
                      )}
                    </span>
                    {hz.deltaPct != null && (
                      <span
                        className={`text-xs ${
                          hz.deltaPct > 0 ? 'text-orange-600' : 'text-sky-600'
                        }`}
                      >
                        {hz.deltaPct > 0 ? '▲' : '▼'}
                        {Math.abs(Math.round(hz.deltaPct))}%
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Tarjeta>

        <Tarjeta className="mt-3 p-4">
          <button className="w-full text-left" onClick={() => onIr('diario')}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">🌿 Esta semana</h2>
              <span className="text-slate-400">→</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {semana.cardio} / {META_CARDIO_MIN} min de cardio ·{' '}
              {semana.fuerza} / {META_FUERZA_SESIONES} de fuerza
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Constancia, no perfección.
            </p>
          </button>
        </Tarjeta>
      </div>
    </div>
  )
}
