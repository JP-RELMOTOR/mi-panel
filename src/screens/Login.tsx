import { useState } from 'react'
import { acciones, useAuth } from '../store'
import { Boton, Tarjeta } from '../ui'

export default function Login() {
  const { sinAcceso } = useAuth()
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function entrar() {
    setError('')
    setCargando(true)
    try {
      await acciones.entrarConGoogle()
    } catch (e: unknown) {
      console.warn(e)
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  if (sinAcceso) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <Tarjeta className="w-full max-w-sm p-8 text-center">
          <div className="text-4xl">🔒</div>
          <h1 className="mt-3 text-lg font-bold text-slate-800">
            Esta cuenta no tiene acceso
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Este panel es privado. La cuenta con la que entraste no está
            autorizada para ver estos datos.
          </p>
          <Boton className="mt-6 w-full" variante="secundario" onClick={() => acciones.salir()}>
            Salir
          </Boton>
        </Tarjeta>
      </div>
    )
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Tarjeta className="w-full max-w-sm p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-700 text-2xl text-white">
          ◆
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-800">Mi Panel</h1>
        <p className="mt-1 text-sm text-slate-500">
          Acceso privado — solo el propietario.
        </p>
        <Boton className="mt-6 w-full" onClick={entrar} disabled={cargando}>
          {cargando ? 'Entrando…' : 'Entrar con Google'}
        </Boton>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Tarjeta>
    </div>
  )
}
