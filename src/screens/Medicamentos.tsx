import { useState } from 'react'
import { acciones, useApp, useAuth } from '../store'
import { Boton, Encabezado, Etiqueta, Tarjeta } from '../ui'
import { esDelMesActual } from '../lib/fechas'
import type { Medicamento } from '../types'

export default function Medicamentos() {
  const s = useApp()
  const { esDueno } = useAuth()
  const [editando, setEditando] = useState<Medicamento | null>(null)
  const [nuevo, setNuevo] = useState(false)

  const lista = Object.values(s.medicamentos).sort(
    (a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre),
  )

  return (
    <div className="p-4 pb-24">
      <Encabezado
        titulo="Medicamentos"
        subtitulo="Qué tomas, cuánto y cómo"
        derecha={
          esDueno ? (
            <Boton
              onClick={() => setNuevo(true)}
              className="!px-3 !py-1.5 text-sm"
            >
              + Agregar
            </Boton>
          ) : undefined
        }
      />

      {lista.length === 0 && !nuevo && (
        <Tarjeta className="p-6 text-center text-sm text-slate-500">
          Sin medicamentos registrados. Agrega el primero con el botón de
          arriba.
        </Tarjeta>
      )}

      <div className="flex flex-col gap-3">
        {lista.map((m) => {
          const tomasMes = Object.keys(s.tomas[m.id] ?? {}).filter(
            esDelMesActual,
          ).length
          return (
            <Tarjeta key={m.id} className={`p-4 ${m.activo ? '' : 'opacity-55'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{m.nombre}</h3>
                    <Etiqueta color={m.modo === 'ocasional' ? 'violet' : 'sky'}>
                      {m.modo === 'ocasional' ? 'Ocasional (SOS)' : 'Horario fijo'}
                    </Etiqueta>
                    {!m.activo && <Etiqueta>Inactivo</Etiqueta>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {m.dosis}
                    {m.horario ? ` · ${m.horario}` : ''}
                  </p>
                  {m.modo === 'ocasional' && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {tomasMes} {tomasMes === 1 ? 'toma' : 'tomas'} este mes —
                      registro sin juicio, útil para conversarlo con tu médico.
                    </p>
                  )}
                  {m.notas && (
                    <p className="mt-1.5 text-xs text-slate-500">{m.notas}</p>
                  )}
                </div>
                {esDueno && (
                  <button
                    onClick={() => setEditando(m)}
                    className="text-sm text-sky-700"
                  >
                    Editar
                  </button>
                )}
              </div>
            </Tarjeta>
          )
        })}
      </div>

      {(nuevo || editando) && (
        <FormMedicamento
          inicial={editando ?? undefined}
          onCerrar={() => {
            setNuevo(false)
            setEditando(null)
          }}
        />
      )}
    </div>
  )
}

function FormMedicamento({
  inicial,
  onCerrar,
}: {
  inicial?: Medicamento
  onCerrar: () => void
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [dosis, setDosis] = useState(inicial?.dosis ?? '')
  const [modo, setModo] = useState<'horario' | 'ocasional'>(
    inicial?.modo ?? 'horario',
  )
  const [horario, setHorario] = useState(inicial?.horario ?? '')
  const [notas, setNotas] = useState(inicial?.notas ?? '')
  const [activo, setActivo] = useState(inicial?.activo ?? true)

  function guardar() {
    if (!nombre.trim()) return
    const datos = {
      nombre: nombre.trim(),
      dosis: dosis.trim(),
      modo,
      horario: horario.trim() || undefined,
      notas: notas.trim() || undefined,
      activo,
      inicio: inicial?.inicio,
      fin: inicial?.fin,
    }
    if (inicial) {
      acciones.guardarMedicamento({ ...datos, id: inicial.id })
    } else {
      acciones.nuevoMedicamento(datos)
    }
    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <h2 className="text-lg font-bold text-slate-800">
          {inicial ? 'Editar medicamento' : 'Nuevo medicamento'}
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre (ej. Zolpidem)"
            className="rounded-xl border border-slate-300 px-3 py-2.5"
          />
          <input
            value={dosis}
            onChange={(e) => setDosis(e.target.value)}
            placeholder="Dosis (ej. media tableta)"
            className="rounded-xl border border-slate-300 px-3 py-2.5"
          />
          <div className="flex gap-2">
            {(
              [
                ['horario', 'Horario fijo'],
                ['ocasional', 'Ocasional (SOS)'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
                  modo === m
                    ? 'bg-sky-700 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {modo === 'horario' && (
            <input
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              placeholder="Horario (ej. 1 en la noche)"
              className="rounded-xl border border-slate-300 px-3 py-2.5"
            />
          )}
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas (ej. indicado por…, hasta cuándo)"
            rows={2}
            className="rounded-xl border border-slate-300 px-3 py-2.5"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            Activo (aparece en el Diario)
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton className="flex-1" onClick={guardar} disabled={!nombre.trim()}>
            Guardar
          </Boton>
        </div>
      </div>
    </div>
  )
}
