import { useState } from 'react'
import { acciones, useApp, useAuth } from '../store'
import { Boton, Encabezado, Tarjeta } from '../ui'
import { hayNube } from '../firebase'
import { MODELO_DEFECTO, MODELOS } from '../lib/claude'

export default function Ajustes() {
  const s = useApp()
  const { esDueno } = useAuth()
  const [key, setKey] = useState('')
  const [guardado, setGuardado] = useState(false)

  const tieneKey = !!s.config.apiKey

  function guardar() {
    if (!key.trim()) return
    acciones.setApiKey(key.trim())
    setKey('')
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  return (
    <div className="p-4 pb-24">
      <Encabezado titulo="Ajustes" />

      {esDueno && (
      <Tarjeta className="p-4">
        <h2 className="font-semibold text-slate-800">🤖 Asistente IA</h2>
        <p className="mt-1 text-sm text-slate-500">
          API key de Anthropic (console.anthropic.com). Se guarda en tu base
          protegida — nunca en el código de la app.
        </p>
        {tieneKey && (
          <p className="mt-2 rounded-xl bg-green-50 p-2.5 text-sm text-green-700">
            ✓ API key configurada ({'•'.repeat(8)}
            {s.config.apiKey?.slice(-4)})
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={tieneKey ? 'Reemplazar API key…' : 'sk-ant-…'}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm"
          />
          <Boton onClick={guardar} disabled={!key.trim()}>
            Guardar
          </Boton>
        </div>
        {guardado && (
          <p className="mt-2 text-sm text-green-600">✓ Guardada.</p>
        )}
        {tieneKey && (
          <button
            onClick={() => acciones.setApiKey('')}
            className="mt-3 text-xs text-red-500"
          >
            Quitar API key
          </button>
        )}

        {/* selector de modelo */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-700">
            Modelo que te responde
          </h3>
          <div className="mt-2 flex flex-col gap-2">
            {MODELOS.map((m) => {
              const activo = (s.config.modelo ?? MODELO_DEFECTO) === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => acciones.setModelo(m.id)}
                  className={`rounded-xl border px-3 py-2.5 text-left ${
                    activo
                      ? 'border-sky-600 bg-sky-50 ring-1 ring-sky-200'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">
                      {m.nombre}
                    </span>
                    {activo && <span className="text-sky-700">✓</span>}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {m.detalle}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Aplica al chat, al prediagnóstico y al informe del Resumen.
          </p>
        </div>
      </Tarjeta>
      )}

      <Tarjeta className="mt-4 p-4">
        <h2 className="font-semibold text-slate-800">☁️ Conexión</h2>
        <p className="mt-1 text-sm text-slate-600">
          {hayNube()
            ? 'Nube configurada: tus datos se sincronizan con tu base privada de Firebase, protegida con tu cuenta de Google.'
            : 'Modo local: la nube aún no está configurada (falta pegar la config de Firebase). Los datos viven solo en este dispositivo.'}
        </p>
      </Tarjeta>

      <Tarjeta className="mt-4 p-4">
        <h2 className="font-semibold text-slate-800">🔒 Privacidad</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Tus datos viven en tu base privada, solo tu cuenta puede leerlos.</li>
          <li>El código público de la app no contiene ningún dato de salud.</li>
          <li>
            Al usar el Asistente, los datos viajan a la API de Anthropic solo
            para generar esa respuesta.
          </li>
          <li>Respaldo bajo tu control: menú → Importar / Exportar.</li>
        </ul>
      </Tarjeta>
    </div>
  )
}
