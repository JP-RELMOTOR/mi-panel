import { useMemo, useState } from 'react'
import { acciones, useApp } from '../store'
import { Encabezado, Tarjeta } from '../ui'
import {
  esDelMesActual,
  fechaCorta,
  hoyISO,
  lunesDeEstaSemana,
  ultimosDias,
} from '../lib/fechas'
import { META_CARDIO_MIN, META_FUERZA_SESIONES } from '../config'
import { estadoCurso } from '../lib/curso'
import type { HabitoDia } from '../types'

export default function Diario() {
  const s = useApp()
  const [fecha, setFecha] = useState(hoyISO())
  const h: HabitoDia = s.habitos[fecha] ?? {}

  function guardar(parcial: Partial<HabitoDia>) {
    acciones.guardarHabito(fecha, { ...h, ...parcial })
  }

  // Racha de la semana (desde el lunes)
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

  const medicamentosActivos = useMemo(
    () => Object.values(s.medicamentos).filter((m) => m.activo),
    [s.medicamentos],
  )

  const dias = ultimosDias(7)

  return (
    <div className="p-4 pb-24">
      <Encabezado
        titulo="Diario"
        subtitulo="Constancia, no perfección"
      />

      {/* selector de día (últimos 7) */}
      <div className="flex gap-1.5">
        {dias.map((d) => {
          const activo = d === fecha
          const tiene = !!s.habitos[d]
          return (
            <button
              key={d}
              onClick={() => setFecha(d)}
              className={`flex-1 rounded-xl py-2 text-center text-xs font-medium ${
                activo
                  ? 'bg-sky-700 text-white'
                  : tiene
                    ? 'bg-sky-50 text-sky-700'
                    : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {d === hoyISO() ? 'Hoy' : d.slice(8)}
            </button>
          )
        })}
      </div>

      {/* racha semanal amable */}
      <Tarjeta className="mt-4 p-4">
        <h2 className="text-sm font-semibold text-slate-700">Esta semana</h2>
        <div className="mt-2 flex gap-6">
          <Meta
            valor={semana.cardio}
            meta={META_CARDIO_MIN}
            label={`min cardio (meta ${META_CARDIO_MIN}–300)`}
          />
          <Meta
            valor={semana.fuerza}
            meta={META_FUERZA_SESIONES}
            label={`sesiones de fuerza (meta ${META_FUERZA_SESIONES})`}
          />
        </div>
      </Tarjeta>

      {/* registro del día */}
      <Tarjeta className="mt-4 p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          {fecha === hoyISO() ? 'Hoy' : fechaCorta(fecha)}
        </h2>

        {/* sueño */}
        <div className="mt-3">
          <p className="text-sm font-medium text-slate-600">😴 Sueño</p>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={14}
              step={0.5}
              placeholder="horas"
              value={h.sueno?.horas ?? ''}
              onChange={(e) =>
                guardar({
                  sueno: {
                    ...h.sueno,
                    horas: e.target.value ? Number(e.target.value) : undefined,
                  },
                })
              }
              className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            {(['bien', 'regular', 'mal'] as const).map((c) => (
              <button
                key={c}
                onClick={() =>
                  guardar({
                    sueno: {
                      ...h.sueno,
                      calidad: h.sueno?.calidad === c ? undefined : c,
                    },
                  })
                }
                className={`rounded-full px-3 py-1.5 text-sm ${
                  h.sueno?.calidad === c
                    ? c === 'bien'
                      ? 'bg-green-600 text-white'
                      : c === 'regular'
                        ? 'bg-amber-500 text-white'
                        : 'bg-red-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* movimiento */}
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-600">🏃 Movimiento</p>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={5}
              placeholder="min cardio"
              value={h.cardioMin ?? ''}
              onChange={(e) =>
                guardar({
                  cardioMin: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <Chip
              activo={!!h.fuerza}
              onClick={() => guardar({ fuerza: !h.fuerza })}
            >
              💪 Fuerza
            </Chip>
          </div>
        </div>

        {/* alimentación + agua */}
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-600">🍽 Alimentación</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Chip
              activo={!!h.plato}
              onClick={() => guardar({ plato: !h.plato })}
            >
              🥗 Cumplí el plato
            </Chip>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  guardar({ aguaVasos: Math.max((h.aguaVasos ?? 0) - 1, 0) })
                }
                className="h-8 w-8 rounded-full bg-slate-100 text-slate-600"
              >
                −
              </button>
              <span className="min-w-16 text-center text-sm text-slate-700">
                💧 {h.aguaVasos ?? 0} vasos
              </span>
              <button
                onClick={() => guardar({ aguaVasos: (h.aguaVasos ?? 0) + 1 })}
                className="h-8 w-8 rounded-full bg-slate-100 text-slate-600"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* nota */}
        <textarea
          value={h.nota ?? ''}
          onChange={(e) => guardar({ nota: e.target.value || undefined })}
          placeholder="Nota del día (opcional)"
          className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm"
          rows={2}
        />
      </Tarjeta>

      {/* medicamentos del día */}
      {medicamentosActivos.length > 0 && (
        <Tarjeta className="mt-4 p-4">
          <h2 className="text-sm font-semibold text-slate-700">
            💊 Medicamentos — {fecha === hoyISO() ? 'hoy' : fechaCorta(fecha)}
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {medicamentosActivos.map((m) => {
              const tomado = !!s.tomas[m.id]?.[fecha]
              const tomasMes = Object.keys(s.tomas[m.id] ?? {}).filter(
                esDelMesActual,
              ).length
              // Para pautas: qué toca ese día (o si está fuera del curso)
              const est = m.curso ? estadoCurso(m.curso, fecha) : null
              const fueraDeCurso = est && (est.porEmpezar || est.terminado)

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{m.nombre}</p>
                    {est && !fueraDeCurso && est.faseHoy ? (
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                          ☀️ {est.faseHoy.manana ?? 0}
                        </span>
                        {(est.faseHoy.noche ?? 0) > 0 && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-800">
                            🌙 {est.faseHoy.noche}
                          </span>
                        )}
                        <span>· día {est.diaN}/{est.totalDias}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {est
                          ? est.terminado
                            ? '✓ Curso terminado'
                            : `Empieza el ${fechaCorta(m.curso!.inicio)}`
                          : m.modo === 'ocasional'
                            ? `${m.dosis} · ocasional · ${tomasMes} ${
                                tomasMes === 1 ? 'vez' : 'veces'
                              } este mes`
                            : `${m.dosis}${m.horario ? ` · ${m.horario}` : ''}`}
                      </p>
                    )}
                  </div>
                  {!fueraDeCurso && (
                    <button
                      onClick={() =>
                        tomado
                          ? acciones.quitarToma(m.id, fecha)
                          : acciones.registrarToma(m.id, fecha)
                      }
                      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
                        tomado
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tomado ? '✓ Tomado' : 'Registrar'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </Tarjeta>
      )}
    </div>
  )
}

function Meta({
  valor,
  meta,
  label,
}: {
  valor: number
  meta: number
  label: string
}) {
  const pct = Math.min((valor / meta) * 100, 100)
  return (
    <div className="flex-1">
      <p className="text-lg font-bold text-slate-800">
        {valor}
        <span className="ml-1 text-xs font-normal text-slate-400">{label}</span>
      </p>
      <div className="mt-1 h-1.5 rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-sky-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function Chip({
  children,
  activo,
  onClick,
}: {
  children: React.ReactNode
  activo: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
        activo ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {children}
    </button>
  )
}
