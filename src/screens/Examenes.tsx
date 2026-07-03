import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { Encabezado, Etiqueta, Tarjeta } from '../ui'
import BarraRango from '../components/BarraRango'
import { fechaCorta } from '../lib/fechas'
import {
  esCambioRelevante,
  fmt,
  serieDeAnalito,
  tendencia,
  variacion,
  type PuntoSerie,
} from '../lib/rangos'
import { ICONOS } from '../config'
import type { Examen } from '../types'

type Filtro = 'todo' | 'fuera' | 'cambios'

export default function Examenes() {
  const s = useApp()
  const [filtro, setFiltro] = useState<Filtro>('todo')
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({})

  const examenes = useMemo(
    () =>
      Object.values(s.examenes).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [s.examenes],
  )

  const grupos = useMemo(
    () => Object.values(s.grupos).sort((a, b) => a.orden - b.orden),
    [s.grupos],
  )

  // Series por analito (ordenadas por fecha), agrupadas por grupo
  const seriesPorGrupo = useMemo(() => {
    const por: Record<string, { analitoId: string; serie: PuntoSerie[] }[]> = {}
    const analitos = Object.values(s.analitos).sort((a, b) => a.orden - b.orden)
    for (const a of analitos) {
      const serie = serieDeAnalito(s, a.id)
      if (serie.length === 0) continue
      ;(por[a.grupo] ??= []).push({ analitoId: a.id, serie })
    }
    return por
  }, [s])

  function pasaFiltro(serie: PuntoSerie[]): boolean {
    const u = serie[serie.length - 1]
    const ant = serie.length > 1 ? serie[serie.length - 2] : undefined
    if (filtro === 'fuera') return u.estado === 'out'
    if (filtro === 'cambios')
      return (
        u.estado !== 'ok' || esCambioRelevante(ant?.valor, u.valor)
      )
    return true
  }

  if (examenes.length === 0) {
    return (
      <div className="p-4">
        <Encabezado titulo="Exámenes" />
        <Tarjeta className="p-6 text-center text-sm text-slate-500">
          Aún no hay exámenes. Ve a <b>Importar</b> (menú de usuario) para
          cargar tus datos.
        </Tarjeta>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <Encabezado
        titulo="Exámenes"
        subtitulo={`${examenes.length} exámenes registrados`}
      />

      {/* lista de exámenes */}
      <div className="flex flex-col gap-2">
        {examenes.map((ex) => (
          <FilaExamen key={ex.id} ex={ex} />
        ))}
      </div>

      {/* filtros estilo dashboard */}
      <div className="mt-6 mb-3 flex gap-2">
        {(
          [
            ['todo', 'Ver todo'],
            ['fuera', 'Fuera de rango'],
            ['cambios', 'Cambios relevantes'],
          ] as [Filtro, string][]
        ).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              filtro === f
                ? 'bg-sky-700 text-white'
                : 'bg-white text-slate-600 border border-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* acordeón por grupo con barras de rango */}
      <div className="flex flex-col gap-3">
        {grupos.map((g) => {
          const filas = (seriesPorGrupo[g.id] ?? []).filter(({ serie }) =>
            pasaFiltro(serie),
          )
          if (filas.length === 0) return null
          const abierto = abiertos[g.id] ?? filtro !== 'todo'
          const nAlerta = filas.filter(
            ({ serie }) => serie[serie.length - 1].estado !== 'ok',
          ).length
          return (
            <Tarjeta key={g.id}>
              <button
                onClick={() =>
                  setAbiertos((o) => ({ ...o, [g.id]: !abierto }))
                }
                className="flex w-full items-center gap-3 px-4 py-4 text-left"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <Icono clave={g.icono} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-slate-800">
                    {g.nombre}
                  </span>
                  {g.sub && (
                    <span className="block text-xs text-slate-500">{g.sub}</span>
                  )}
                </span>
                {nAlerta > 0 && <Etiqueta color="amber">{nAlerta}</Etiqueta>}
                <span className="text-slate-400">{abierto ? '▾' : '▸'}</span>
              </button>

              {abierto && (
                <div className="border-t border-slate-100 px-4 pb-4">
                  {filas.map(({ analitoId, serie }) => (
                    <FilaAnalito
                      key={analitoId}
                      nombre={s.analitos[analitoId]?.nombre ?? analitoId}
                      unidad={s.analitos[analitoId]?.unidad}
                      serie={serie}
                    />
                  ))}
                </div>
              )}
            </Tarjeta>
          )
        })}
      </div>
    </div>
  )
}

function FilaExamen({ ex }: { ex: Examen }) {
  const iconos: Record<string, string> = {
    laboratorio: '🧪',
    audiometria: '👂',
    imagen: '🩻',
    otro: '📄',
  }
  return (
    <Tarjeta className="flex items-center gap-3 px-4 py-3">
      <span className="text-xl">{iconos[ex.tipo] ?? '📄'}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800">{fechaCorta(ex.fecha)}</p>
        <p className="truncate text-xs text-slate-500">
          {ex.laboratorio}
          {ex.nota ? ` · ${ex.nota}` : ''}
        </p>
      </div>
    </Tarjeta>
  )
}

function FilaAnalito({
  nombre,
  unidad,
  serie,
}: {
  nombre: string
  unidad?: string
  serie: PuntoSerie[]
}) {
  const u = serie[serie.length - 1]
  const ant = serie.length > 1 ? serie[serie.length - 2] : undefined
  const t = tendencia(ant?.valor, u.valor)
  const d = variacion(ant?.valor, u.valor)
  const colorValor =
    u.estado === 'out'
      ? 'text-red-600'
      : u.estado === 'watch'
        ? 'text-amber-700'
        : 'text-slate-800'

  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-slate-700">{nombre}</p>
        <div className="flex items-baseline gap-2 font-mono text-sm">
          {ant?.valor != null && (
            <span className="text-slate-400">{fmt(ant.valor)}</span>
          )}
          {ant?.valor != null && <span className="text-slate-300">→</span>}
          <span className={`text-[15px] font-semibold ${colorValor}`}>
            {u.valor != null ? fmt(u.valor) : u.texto ?? '—'}
            {unidad && u.valor != null ? (
              <span className="ml-1 text-xs font-normal text-slate-400">
                {unidad}
              </span>
            ) : null}
          </span>
          {t && d != null && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-xs ${
                t === '▲'
                  ? 'bg-orange-50 text-orange-700'
                  : t === '▼'
                    ? 'bg-sky-50 text-sky-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {t === '≈' ? 'estable' : `${t} ${Math.abs(Math.round(d))}%`}
            </span>
          )}
        </div>
      </div>
      <BarraRango puntos={serie} />
      {u.nota && (
        <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {u.nota}
        </p>
      )}
    </div>
  )
}

function Icono({ clave }: { clave: string }) {
  const d = ICONOS[clave] ?? ICONOS.vial
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}
