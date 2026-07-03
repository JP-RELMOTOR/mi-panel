import { useMemo } from 'react'
import { acciones, useApp, useAuth } from '../store'
import { Encabezado, Etiqueta, Tarjeta } from '../ui'
import { NOTA_CONFIRMAR } from '../config'
import type { Tamizaje } from '../types'

const PESO_PRIORIDAD = { alta: 0, media: 1, baja: 2 }
const PESO_ESTADO = { pendiente: 0, agendado: 1, hecho: 2 }

export default function Prevencion() {
  const s = useApp()
  const { esDueno } = useAuth()

  const tamizajes = useMemo(
    () =>
      Object.values(s.tamizajes).sort(
        (a, b) =>
          PESO_ESTADO[a.estado] - PESO_ESTADO[b.estado] ||
          PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad] ||
          a.orden - b.orden,
      ),
    [s.tamizajes],
  )

  if (tamizajes.length === 0) {
    return (
      <div className="p-4">
        <Encabezado titulo="Prevención" />
        <Tarjeta className="p-6 text-center text-sm text-slate-500">
          Importa tus datos para ver la lista de exámenes preventivos.
        </Tarjeta>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <Encabezado
        titulo="Prevención"
        subtitulo="Lo que te toca hacer y no dejar pasar"
      />
      <div className="flex flex-col gap-3">
        {tamizajes.map((t) => (
          <FilaTamizaje key={t.id} t={t} esDueno={esDueno} />
        ))}
      </div>
      <p className="mt-5 text-center text-xs text-slate-400">
        Las fechas y prioridades las define tu equipo de salud. {NOTA_CONFIRMAR}
      </p>
    </div>
  )
}

function FilaTamizaje({ t, esDueno }: { t: Tamizaje; esDueno: boolean }) {
  const chipEstado = {
    pendiente: { label: 'Pendiente', cls: 'bg-red-50 text-red-700 border-red-200' },
    agendado: { label: 'Agendado', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    hecho: { label: '✓ Hecho', cls: 'bg-green-50 text-green-700 border-green-200' },
  }[t.estado]

  return (
    <Tarjeta
      className={`p-4 ${t.estado === 'hecho' ? 'opacity-60' : ''} ${
        t.prioridad === 'alta' && t.estado !== 'hecho'
          ? 'border-red-200 ring-1 ring-red-100'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-800">{t.nombre}</h3>
            {t.prioridad === 'alta' && t.estado !== 'hecho' && (
              <Etiqueta color="red">Prioridad alta</Etiqueta>
            )}
          </div>
          {t.notas && (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {t.notas}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => esDueno && acciones.cicloEstadoTamizaje(t.id)}
          disabled={!esDueno}
          className={`rounded-full border px-3 py-1 text-sm font-medium ${chipEstado.cls} ${
            esDueno ? '' : 'cursor-default opacity-90'
          }`}
          title={esDueno ? 'Tocar para cambiar estado' : undefined}
        >
          {chipEstado.label}
        </button>
        {(esDueno || t.fechaObjetivo) && (
          <input
            type="month"
            value={t.fechaObjetivo?.slice(0, 7) ?? ''}
            disabled={!esDueno}
            onChange={(e) =>
              acciones.guardarTamizaje({
                ...t,
                fechaObjetivo: e.target.value || undefined,
              })
            }
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-600 disabled:opacity-70"
            title="Fecha objetivo"
          />
        )}
      </div>
    </Tarjeta>
  )
}
