// Recreación React del bar() del dashboard original: zona normal verde,
// marcadores grises para tomas antiguas y marcador coloreado (azul/ámbar/rojo)
// para la última. Genérica para N tomas.
import type { PuntoSerie } from '../lib/rangos'
import { fmt } from '../lib/rangos'

const COLOR_ULTIMO: Record<string, string> = {
  ok: '#0369a1', // sky-700
  watch: '#b45309', // amber-700
  out: '#dc2626', // red-600
}

export default function BarraRango({ puntos }: { puntos: PuntoSerie[] }) {
  if (puntos.length === 0) return null
  const ultimo = puntos[puntos.length - 1]

  // Cualitativo (texto): "● Normal" / "● Presente"
  if (ultimo.valor == null && ultimo.texto) {
    const c = COLOR_ULTIMO[ultimo.estado] ?? '#16a34a'
    const color = ultimo.estado === 'ok' ? '#16a34a' : c
    return (
      <div className="mt-2 font-mono text-[13px]" style={{ color }}>
        ● {ultimo.texto}
      </div>
    )
  }

  const conValor = puntos.filter((p) => p.valor != null)
  if (conValor.length === 0) return null

  const lo = ultimo.lo
  const hi = ultimo.hi
  const vals = conValor.map((p) => p.valor as number)
  if (lo != null) vals.push(lo)
  if (hi != null) vals.push(hi)
  let min = Math.min(...vals)
  let max = Math.max(...vals)
  const pad = (max - min) * 0.18 || 1
  min -= pad
  max += pad
  const pos = (v: number) => ((v - min) / (max - min)) * 100

  const zL = lo != null ? pos(lo) : 0
  const zR = hi != null ? pos(hi) : 100

  return (
    <div className="mt-3">
      <div className="relative h-2 rounded-md bg-slate-100">
        <div
          className="absolute top-0 bottom-0 rounded-md bg-green-100"
          style={{ left: `${zL}%`, width: `${zR - zL}%` }}
        />
        {conValor.map((p, i) => {
          const esUltimo = p === ultimo
          const color = esUltimo
            ? COLOR_ULTIMO[p.estado] ?? COLOR_ULTIMO.ok
            : '#94a3b8'
          return (
            <div
              key={p.examenId + i}
              title={`${p.fecha.slice(0, 4)}: ${fmt(p.valor)}`}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white shadow"
              style={{
                left: `${pos(p.valor as number)}%`,
                width: 13,
                height: 13,
                background: color,
                zIndex: esUltimo ? 3 : 2,
              }}
            />
          )
        })}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[11px] text-slate-400">
        <span>{fmt(+min.toFixed(1))}</span>
        <span>{ultimo.refTxt ? `zona normal ${ultimo.refTxt}` : ''}</span>
        <span>{fmt(+max.toFixed(1))}</span>
      </div>
      <div className="mt-1.5 flex gap-4 text-xs text-slate-500">
        {conValor.map((p, i) => {
          const esUltimo = p === ultimo
          const color = esUltimo
            ? COLOR_ULTIMO[p.estado] ?? COLOR_ULTIMO.ok
            : '#94a3b8'
          return (
            <span key={p.examenId + i} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: color }}
              />
              {p.fecha.slice(0, 4)}
            </span>
          )
        })}
      </div>
    </div>
  )
}
