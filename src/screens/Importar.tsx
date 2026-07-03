import { useRef, useState } from 'react'
import { acciones, useApp } from '../store'
import { Boton, Encabezado, Tarjeta } from '../ui'

export default function Importar() {
  const s = useApp()
  const [texto, setTexto] = useState('')
  const [resumen, setResumen] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function importar() {
    setError('')
    setResumen('')
    try {
      const json = JSON.parse(texto)
      const r = acciones.importarDatos(json)
      setResumen(`Importado: ${r}.`)
      setTexto('')
    } catch (e) {
      console.warn(e)
      setError('El texto no es un JSON válido. Revisa y vuelve a intentar.')
    }
  }

  function leerArchivo(f: File | undefined) {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setTexto(String(reader.result ?? ''))
    reader.readAsText(f)
  }

  function exportar() {
    const blob = new Blob([acciones.exportarDatos()], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `respaldo-panel-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const nExamenes = Object.keys(s.examenes).length
  const nAnalitos = Object.keys(s.analitos).length

  return (
    <div className="p-4 pb-24">
      <Encabezado
        titulo="Importar / Exportar"
        subtitulo="Los datos entran por aquí — nunca van en el código."
      />

      <Tarjeta className="p-4">
        <h2 className="font-semibold text-slate-800">Importar datos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Pega el JSON (o elige el archivo) y revisa el resumen. Re-importar es
          seguro: no duplica.
        </p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder='{"examenes": {...}, "analitos": {...}, ...}'
          className="mt-3 h-40 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Boton onClick={importar} disabled={!texto.trim()}>
            Importar
          </Boton>
          <Boton variante="secundario" onClick={() => fileRef.current?.click()}>
            Elegir archivo…
          </Boton>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => leerArchivo(e.target.files?.[0])}
          />
        </div>
        {resumen && (
          <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-700">
            ✓ {resumen}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </Tarjeta>

      <Tarjeta className="mt-4 p-4">
        <h2 className="font-semibold text-slate-800">Exportar (respaldo)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Descarga todo el estado actual como JSON — tu respaldo bajo tu
          control. Hoy: {nExamenes} exámenes, {nAnalitos} analitos.
        </p>
        <Boton className="mt-3" variante="secundario" onClick={exportar}>
          Descargar respaldo
        </Boton>
      </Tarjeta>
    </div>
  )
}
