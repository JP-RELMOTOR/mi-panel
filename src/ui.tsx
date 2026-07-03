import type { ReactNode } from 'react'

export function Boton({
  children,
  onClick,
  variante = 'primario',
  className = '',
  type = 'button',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  variante?: 'primario' | 'secundario' | 'peligro' | 'fantasma'
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const estilos: Record<string, string> = {
    primario: 'bg-sky-700 text-white hover:bg-sky-800 active:bg-sky-900',
    secundario:
      'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    peligro: 'bg-red-600 text-white hover:bg-red-700',
    fantasma: 'bg-transparent text-slate-600 hover:bg-slate-100',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2.5 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${estilos[variante]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Tarjeta({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-sm border border-slate-200 ${className}`}
    >
      {children}
    </div>
  )
}

export function Encabezado({
  titulo,
  subtitulo,
  derecha,
}: {
  titulo: string
  subtitulo?: string
  derecha?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{titulo}</h1>
        {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
      </div>
      {derecha}
    </div>
  )
}

export function Etiqueta({
  children,
  color = 'slate',
}: {
  children: ReactNode
  color?: 'slate' | 'sky' | 'green' | 'amber' | 'red' | 'violet'
}) {
  const colores: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    sky: 'bg-sky-100 text-sky-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    violet: 'bg-violet-100 text-violet-700',
  }
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colores[color]}`}
    >
      {children}
    </span>
  )
}
