import { useEffect, useMemo, useRef, useState } from 'react'
import { acciones, useApp } from '../store'
import { Boton, Encabezado, Tarjeta } from '../ui'
import {
  armarContexto,
  consultar,
  errorLegible,
  PROMPT_PREDIAGNOSTICO,
} from '../lib/claude'
import { fechaCorta } from '../lib/fechas'
import Markdown from '../components/Markdown'
import type { MensajeChat } from '../types'

export default function Asistente({ onIrAjustes }: { onIrAjustes: () => void }) {
  const s = useApp()
  const apiKey = s.config.apiKey ?? ''

  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [convId, setConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [parcial, setParcial] = useState('')
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const [verLecturas, setVerLecturas] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)

  const lecturas = useMemo(
    () =>
      Object.values(s.lecturas).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [s.lecturas],
  )

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, parcial])

  async function enviar(texto: string, esPrediagnostico = false) {
    if (!apiKey || generando || !texto.trim()) return
    setError('')
    const nuevos: MensajeChat[] = [
      ...mensajes,
      { rol: 'user', texto: texto.trim() },
    ]
    setMensajes(nuevos)
    setInput('')
    setGenerando(true)
    setParcial('')

    try {
      const contexto = armarContexto(s)
      const respuesta = await consultar(
        apiKey,
        contexto,
        nuevos,
        setParcial,
        s.config.modelo,
      )
      const conMsj: MensajeChat[] = [
        ...nuevos,
        { rol: 'assistant', texto: respuesta },
      ]
      setMensajes(conMsj)
      setParcial('')

      // guardar conversación (claves con prefijo para conservar orden)
      const id = convId ?? acciones.nuevoIdPublico('con')
      if (!convId) setConvId(id)
      const registro: Record<string, MensajeChat> = {}
      conMsj.forEach((m, i) => {
        registro[`m${String(i).padStart(3, '0')}`] = m
      })
      acciones.guardarConsulta({
        id,
        fecha: new Date().toISOString(),
        titulo: conMsj[0]?.texto.slice(0, 60),
        mensajes: registro,
      })

      // los prediagnósticos también quedan en el historial de lecturas
      if (esPrediagnostico) {
        acciones.guardarLectura({
          id: acciones.nuevoIdPublico('lec'),
          fecha: new Date().toISOString(),
          texto: respuesta,
        })
      }
    } catch (e) {
      console.warn(e)
      setError(errorLegible(e))
      setParcial('')
    } finally {
      setGenerando(false)
    }
  }

  function nuevaConversacion() {
    setMensajes([])
    setConvId(null)
    setParcial('')
    setError('')
  }

  // ---- sin API key: instrucciones ----
  if (!apiKey) {
    return (
      <div className="p-4 pb-24">
        <Encabezado titulo="Asistente" />
        <Tarjeta className="p-6">
          <div className="text-center text-4xl">🤖</div>
          <h2 className="mt-3 text-center font-bold text-slate-800">
            Activa tu asistente
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            El asistente responde preguntas sobre tus datos y genera
            prediagnósticos orientativos. Para activarlo necesitas una API key
            de Anthropic (cuenta con crédito prepago, separada de una
            suscripción de Claude):
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
            <li>
              Entra a <b>console.anthropic.com</b> y crea una cuenta.
            </li>
            <li>Carga crédito (US$5 alcanza para ~50–100 consultas).</li>
            <li>Crea una API key y cópiala.</li>
            <li>Pégala en Ajustes — queda guardada en tu base protegida.</li>
          </ol>
          <Boton className="mt-5 w-full" onClick={onIrAjustes}>
            Ir a Ajustes
          </Boton>
        </Tarjeta>
      </div>
    )
  }

  // ---- historial de lecturas ----
  if (verLecturas) {
    return (
      <div className="p-4 pb-24">
        <Encabezado
          titulo="Lecturas guardadas"
          subtitulo="Tus prediagnósticos en el tiempo"
          derecha={
            <Boton variante="secundario" className="!px-3 !py-1.5 text-sm" onClick={() => setVerLecturas(false)}>
              ← Volver
            </Boton>
          }
        />
        {lecturas.length === 0 && (
          <Tarjeta className="p-6 text-center text-sm text-slate-500">
            Aún no hay lecturas. Genera tu primer prediagnóstico desde el chat.
          </Tarjeta>
        )}
        <div className="flex flex-col gap-3">
          {lecturas.map((l) => (
            <Tarjeta key={l.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">
                  {fechaCorta(l.fecha.slice(0, 10))}
                </p>
                <button
                  onClick={() => acciones.borrarLectura(l.id)}
                  className="text-xs text-red-500"
                >
                  Borrar
                </button>
              </div>
              <Markdown texto={l.texto} />
            </Tarjeta>
          ))}
        </div>
      </div>
    )
  }

  // ---- chat ----
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 p-4 pb-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Asistente</h1>
          <p className="text-xs text-slate-400">
            Al preguntar, tus datos se envían a la API de Anthropic.
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setVerLecturas(true)}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
          >
            📋 Lecturas
          </button>
          {mensajes.length > 0 && (
            <button
              onClick={nuevaConversacion}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
            >
              + Nueva
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {mensajes.length === 0 && !parcial && (
          <div className="mt-6">
            <Tarjeta className="p-5 text-center">
              <p className="text-sm text-slate-600">
                Pregúntame lo que quieras sobre tus datos, o genera un
                prediagnóstico completo.
              </p>
              <Boton
                className="mt-4 w-full"
                onClick={() => enviar(PROMPT_PREDIAGNOSTICO, true)}
                disabled={generando}
              >
                🔎 Generar prediagnóstico
              </Boton>
              <div className="mt-3 flex flex-col gap-1.5">
                {[
                  '¿Cómo van mis tendencias?',
                  '¿Qué preguntas llevo a mi próximo control?',
                  '¿Qué me recomiendas priorizar este mes?',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => enviar(q)}
                    className="rounded-xl bg-slate-50 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </Tarjeta>
          </div>
        )}

        {mensajes.map((m, i) => (
          <Burbuja key={i} m={m} />
        ))}
        {parcial && <Burbuja m={{ rol: 'assistant', texto: parcial }} />}
        {generando && !parcial && (
          <p className="py-3 text-center text-sm text-slate-400">
            Pensando…
          </p>
        )}
        {error && (
          <p className="my-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div ref={finRef} />
      </div>

      <div className="border-t border-slate-200 bg-white p-3 pb-4">
        {mensajes.length > 0 && !generando && (
          <button
            onClick={() => enviar(PROMPT_PREDIAGNOSTICO, true)}
            className="mb-2 w-full rounded-xl bg-slate-50 py-2 text-sm font-medium text-slate-600"
          >
            🔎 Generar prediagnóstico
          </button>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviar(input)}
            placeholder="Pregunta sobre tus datos…"
            disabled={generando}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
          <Boton onClick={() => enviar(input)} disabled={generando || !input.trim()}>
            ➤
          </Boton>
        </div>
      </div>
    </div>
  )
}

function Burbuja({ m }: { m: MensajeChat }) {
  if (m.rol === 'user') {
    return (
      <div className="my-2 flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-sky-700 px-4 py-2.5 text-sm text-white">
          {m.texto}
        </div>
      </div>
    )
  }
  return (
    <div className="my-2 flex">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
        <Markdown texto={m.texto} />
      </div>
    </div>
  )
}

