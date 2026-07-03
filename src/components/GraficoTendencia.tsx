// Gráfico de tendencia en SVG a mano: línea + puntos etiquetados + banda
// del rango normal. Pensado para pocas tomas (2–10); sin librerías.
import type { PuntoSerie } from '../lib/rangos'
import { fmt } from '../lib/rangos'
import { fechaCorta } from '../lib/fechas'

const COLOR: Record<string, string> = {
  ok: '#0369a1',
  watch: '#b45309',
  out: '#dc2626',
}

export default function GraficoTendencia({
  puntos,
  unidad,
}: {
  puntos: PuntoSerie[]
  unidad?: string
}) {
  const conValor = puntos.filter((p) => p.valor != null)
  if (conValor.length === 0)
    return (
      <p className="text-sm text-slate-500 py-6 text-center">
        Este analito no tiene valores numéricos para graficar.
      </p>
    )

  const W = 600
  const H = 230
  const M = { top: 26, right: 24, bottom: 40, left: 46 }
  const iw = W - M.left - M.right
  const ih = H - M.top - M.bottom

  const lo = conValor[conValor.length - 1].lo
  const hi = conValor[conValor.length - 1].hi
  const vals = conValor.map((p) => p.valor as number)
  const all = [...vals]
  if (lo != null) all.push(lo)
  if (hi != null) all.push(hi)
  let yMin = Math.min(...all)
  let yMax = Math.max(...all)
  const pad = (yMax - yMin) * 0.18 || 1
  yMin -= pad
  yMax += pad

  const x = (i: number) =>
    M.left + (conValor.length === 1 ? iw / 2 : (i / (conValor.length - 1)) * iw)
  const y = (v: number) => M.top + ih - ((v - yMin) / (yMax - yMin)) * ih

  const bandaTop = hi != null ? y(hi) : M.top
  const bandaBot = lo != null ? y(lo) : M.top + ih

  const linea = conValor
    .map((p, i) => `${x(i)},${y(p.valor as number)}`)
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Gráfico de tendencia"
    >
      {/* banda del rango normal */}
      <rect
        x={M.left}
        y={bandaTop}
        width={iw}
        height={Math.max(bandaBot - bandaTop, 0)}
        fill="#dcfce7"
        opacity={0.7}
        rx={4}
      />
      {lo != null && (
        <text x={M.left - 6} y={y(lo) + 4} fontSize={11} fill="#94a3b8" textAnchor="end">
          {fmt(lo)}
        </text>
      )}
      {hi != null && (
        <text x={M.left - 6} y={y(hi) + 4} fontSize={11} fill="#94a3b8" textAnchor="end">
          {fmt(hi)}
        </text>
      )}

      {/* línea */}
      {conValor.length > 1 && (
        <polyline
          points={linea}
          fill="none"
          stroke="#64748b"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}

      {/* puntos + etiquetas */}
      {conValor.map((p, i) => {
        const esUltimo = i === conValor.length - 1
        const c = esUltimo ? COLOR[p.estado] ?? COLOR.ok : '#94a3b8'
        // primera/última etiqueta ancladas hacia adentro para no cortarse
        const ancla =
          conValor.length > 1 && i === 0
            ? 'start'
            : conValor.length > 1 && esUltimo
              ? 'end'
              : 'middle'
        return (
          <g key={p.examenId}>
            <circle
              cx={x(i)}
              cy={y(p.valor as number)}
              r={6}
              fill={c}
              stroke="#fff"
              strokeWidth={2.5}
            />
            <text
              x={x(i)}
              y={y(p.valor as number) - 12}
              fontSize={13}
              fontWeight={600}
              fill={c}
              textAnchor={ancla}
            >
              {fmt(p.valor)}
              {unidad ? ` ${unidad}` : ''}
            </text>
            <text
              x={x(i)}
              y={H - 12}
              fontSize={11}
              fill="#64748b"
              textAnchor={ancla}
            >
              {fechaCorta(p.fecha)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
