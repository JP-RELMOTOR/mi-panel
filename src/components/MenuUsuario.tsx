import { useState } from 'react'
import { acciones, useAuth } from '../store'
import { hayNube } from '../firebase'

export default function MenuUsuario({
  onIr,
  esDueno,
}: {
  onIr: (p: 'medicamentos' | 'documentos' | 'importar' | 'ajustes') => void
  esDueno: boolean
}) {
  const { usuario } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const inicial =
    usuario?.displayName?.[0]?.toUpperCase() ??
    usuario?.email?.[0]?.toUpperCase() ??
    '·'

  function copiarUid() {
    if (!usuario) return
    navigator.clipboard.writeText(usuario.uid).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    })
  }

  function ir(p: 'medicamentos' | 'documentos' | 'importar' | 'ajustes') {
    setAbierto(false)
    onIr(p)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-700 font-semibold text-white"
        aria-label="Menú de usuario"
      >
        {inicial}
      </button>

      {abierto && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setAbierto(false)}
          />
          <div className="absolute right-0 top-11 z-40 w-72 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
            <div className="border-b border-slate-100 px-4 py-2">
              {hayNube() && usuario ? (
                <>
                  <p className="text-xs text-slate-400">Conectado como</p>
                  <p className="truncate font-semibold text-slate-800">
                    {usuario.email}
                  </p>
                  <button
                    onClick={copiarUid}
                    className="mt-1 w-full truncate rounded-lg bg-slate-50 px-2 py-1 text-left font-mono text-[11px] text-slate-500 hover:bg-slate-100"
                    title="Copiar UID (necesario para las reglas de la base)"
                  >
                    {copiado ? '✓ UID copiado' : `UID: ${usuario.uid}`}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-400">Modo</p>
                  <p className="font-semibold text-slate-800">
                    Local (sin nube configurada)
                  </p>
                </>
              )}
            </div>

            <MenuItem onClick={() => ir('medicamentos')}>
              💊 Medicamentos
            </MenuItem>
            <MenuItem onClick={() => ir('documentos')}>
              📂 Documentos (PDF/fotos)
            </MenuItem>
            {esDueno && (
              <MenuItem onClick={() => ir('importar')}>
                📥 Importar / Exportar
              </MenuItem>
            )}
            <MenuItem onClick={() => ir('ajustes')}>⚙️ Ajustes</MenuItem>

            {hayNube() && usuario && (
              <div className="mt-1 border-t border-slate-100 pt-1">
                <MenuItem
                  onClick={() => {
                    setAbierto(false)
                    acciones.salir()
                  }}
                >
                  🚪 Cerrar sesión
                </MenuItem>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function MenuItem({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      {children}
    </button>
  )
}
