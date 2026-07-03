import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { Encabezado, Tarjeta } from '../ui'
import GraficoTendencia from '../components/GraficoTendencia'
import { fechaCorta } from '../lib/fechas'
import { fmt, serieDeAnalito } from '../lib/rangos'

export default function Tendencias() {
  const s = useApp()

  const opciones = useMemo(() => {
    const analitos = Object.values(s.analitos)
      .filter((a) => serieDeAnalito(s, a.id).some((p) => p.valor != null))
      .sort(
        (a, b) =>
          Number(b.prioritario ?? false) - Number(a.prioritario ?? false) ||
          a.orden - b.orden,
      )
    return analitos
  }, [s])

  const [sel, setSel] = useState<string>('')
  const analitoId = sel || opciones[0]?.id || ''
  const analito = s.analitos[analitoId]
  const serie = analitoId ? serieDeAnalito(s, analitoId) : []

  if (opciones.length === 0) {
    return (
      <div className="p-4">
        <Encabezado titulo="Tendencias" />
        <Tarjeta className="p-6 text-center text-sm text-slate-500">
          Importa tus exámenes para ver las tendencias en el tiempo.
        </Tarjeta>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <Encabezado
        titulo="Tendencias"
        subtitulo="Cómo se mueven tus valores en el tiempo"
      />

      <select
        value={analitoId}
        onChange={(e) => setSel(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-medium text-slate-800"
      >
        {opciones.map((a) => (
          <option key={a.id} value={a.id}>
            {a.prioritario ? '★ ' : ''}
            {a.nombre}
            {a.unidad ? ` (${a.unidad})` : ''}
          </option>
        ))}
      </select>

      <Tarjeta className="mt-4 p-4">
        <GraficoTendencia puntos={serie} unidad={analito?.unidad} />
        {analito?.refTxt && (
          <p className="mt-1 text-center text-xs text-slate-400">
            Rango de referencia: {analito.refTxt}
          </p>
        )}
      </Tarjeta>

      {/* tabla de tomas con notas */}
      <Tarjeta className="mt-4 divide-y divide-slate-100">
        {serie
          .slice()
          .reverse()
          .map((p) => (
            <div key={p.examenId} className="px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-500">
                  {fechaCorta(p.fecha)}
                </span>
                <span
                  className={`font-mono font-semibold ${
                    p.estado === 'out'
                      ? 'text-red-600'
                      : p.estado === 'watch'
                        ? 'text-amber-700'
                        : 'text-slate-800'
                  }`}
                >
                  {p.valor != null ? fmt(p.valor) : p.texto ?? '—'}
                  {analito?.unidad && p.valor != null && (
                    <span className="ml-1 text-xs font-normal text-slate-400">
                      {analito.unidad}
                    </span>
                  )}
                </span>
              </div>
              {p.nota && (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {p.nota}
                </p>
              )}
            </div>
          ))}
      </Tarjeta>
    </div>
  )
}
