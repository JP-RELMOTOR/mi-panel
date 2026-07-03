import { useMemo } from 'react'
import { useApp } from '../store'
import { Encabezado, Etiqueta, Tarjeta } from '../ui'
import { fechaCorta, lunesDeEstaSemana } from '../lib/fechas'
import { fmt, hallazgos, patrones } from '../lib/rangos'
import { META_CARDIO_MIN, META_FUERZA_SESIONES, NOTA_CONFIRMAR } from '../config'

export default function Resumen({
  onIr,
}: {
  onIr: (p: 'examenes' | 'prevencion' | 'diario') => void
}) {
  const s = useApp()

  const lista = useMemo(() => hallazgos(s), [s])
  const lecturas = useMemo(() => patrones(s), [s])
  const destacados = useMemo(
    () => Object.values(s.eventos).filter((e) => e.destacado),
    [s.eventos],
  )
  const tamizajesUrgentes = useMemo(
    () =>
      Object.values(s.tamizajes)
        .filter((t) => t.estado !== 'hecho' && t.prioridad === 'alta')
        .sort((a, b) => a.orden - b.orden),
    [s.tamizajes],
  )
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

      {/* eventos destacados (ej. hipoacusia) */}
      {destacados.map((e) => (
        <Tarjeta key={e.id} className="mb-3 border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">📌</span>
            <div>
              <p className="font-semibold text-slate-800">{e.titulo}</p>
              <p className="text-xs text-slate-500">
                {e.fecha ? fechaCorta(e.fecha) : e.fechaTexto}
              </p>
              {e.descripcion && (
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {e.descripcion}
                </p>
              )}
            </div>
          </div>
        </Tarjeta>
      ))}

      {/* tamizajes de prioridad alta */}
      {tamizajesUrgentes.length > 0 && (
        <Tarjeta
          className="mb-3 cursor-pointer border-red-200 p-4"

        >
          <button className="w-full text-left" onClick={() => onIr('prevencion')}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                🎯 Prevención — no dejar pasar
              </h2>
              <span className="text-slate-400">→</span>
            </div>
            {tamizajesUrgentes.map((t) => (
              <p key={t.id} className="mt-1.5 text-sm text-slate-600">
                <Etiqueta color="red">{t.estado}</Etiqueta>{' '}
                <span className="ml-1">{t.nombre}</span>
              </p>
            ))}
          </button>
        </Tarjeta>
      )}

      {/* tarjeta Lectura: patrones por reglas */}
      {lecturas.length > 0 && (
        <Tarjeta className="mb-3 p-4">
          <h2 className="font-semibold text-slate-800">🔎 Lectura</h2>
          {lecturas.map((p, i) => (
            <div key={i} className="mt-2">
              <p className="text-sm font-medium text-slate-700">{p.titulo}</p>
              <p className="text-sm leading-relaxed text-slate-600">
                {p.detalle}
              </p>
            </div>
          ))}
          <p className="mt-3 text-xs text-slate-400">{NOTA_CONFIRMAR}</p>
        </Tarjeta>
      )}

      {/* hallazgos */}
      <Tarjeta className="mb-3 p-4">
        <button className="w-full text-left" onClick={() => onIr('examenes')}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">
              🧪 Hallazgos del último control
            </h2>
            <span className="text-slate-400">→</span>
          </div>
        </button>
        {lista.length === 0 && (
          <p className="mt-2 text-sm text-slate-500">
            Todo dentro de rango y sin cambios grandes. 💚
          </p>
        )}
        <div className="mt-1 divide-y divide-slate-100">
          {lista.slice(0, 6).map((hz) => (
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
                  {hz.unidad && (
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
      </Tarjeta>

      {/* racha de hábitos */}
      <Tarjeta className="p-4">
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
  )
}
