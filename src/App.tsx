import { useState } from 'react'
import { useAuth } from './store'
import { hayNube } from './firebase'
import MenuUsuario from './components/MenuUsuario'
import AvisoActualizacion from './components/AvisoActualizacion'
import Login from './screens/Login'
import Resumen from './screens/Resumen'
import Examenes from './screens/Examenes'
import Tendencias from './screens/Tendencias'
import Prevencion from './screens/Prevencion'
import Diario from './screens/Diario'
import Medicamentos from './screens/Medicamentos'
import Documentos from './screens/Documentos'
import Importar from './screens/Importar'
import Ajustes from './screens/Ajustes'
import Asistente from './screens/Asistente'

type Pantalla =
  | 'resumen'
  | 'examenes'
  | 'tendencias'
  | 'prevencion'
  | 'diario'
  | 'asistente'
  | 'medicamentos'
  | 'documentos'
  | 'importar'
  | 'ajustes'

const TABS: { id: Pantalla; icono: string; label: string }[] = [
  { id: 'resumen', icono: '🏠', label: 'Resumen' },
  { id: 'examenes', icono: '🧪', label: 'Exámenes' },
  { id: 'tendencias', icono: '📈', label: 'Tendencias' },
  { id: 'prevencion', icono: '🎯', label: 'Prevención' },
  { id: 'diario', icono: '🌿', label: 'Diario' },
]

export default function App() {
  const { usuario, authListo, sinAcceso, nubeLista } = useAuth()
  const [pantalla, setPantalla] = useState<Pantalla>('resumen')

  // ---- candado de acceso (solo con nube configurada) ----
  if (hayNube()) {
    if (!authListo) return <Cargando texto="Iniciando…" />
    if (!usuario || sinAcceso) return <Login />
    if (!nubeLista) return <Cargando texto="Cargando tus datos…" />
  }

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      {/* header */}
      <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur">
        <button
          onClick={() => setPantalla('resumen')}
          className="flex items-center gap-2 font-bold text-slate-800"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-700 text-sm text-white">
            ◆
          </span>
          Mi Panel
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPantalla('asistente')}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${
              pantalla === 'asistente'
                ? 'bg-sky-100 text-sky-700'
                : 'bg-slate-100'
            }`}
            title="Asistente"
          >
            💬
          </button>
          <MenuUsuario onIr={(p) => setPantalla(p)} />
        </div>
      </header>

      {/* contenido */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        {pantalla === 'resumen' && <Resumen onIr={(p) => setPantalla(p)} />}
        {pantalla === 'examenes' && (
          <Examenes onIrDocumentos={() => setPantalla('documentos')} />
        )}
        {pantalla === 'tendencias' && <Tendencias />}
        {pantalla === 'prevencion' && <Prevencion />}
        {pantalla === 'diario' && <Diario />}
        {pantalla === 'medicamentos' && <Medicamentos />}
        {pantalla === 'documentos' && <Documentos />}
        {pantalla === 'importar' && <Importar />}
        {pantalla === 'ajustes' && <Ajustes />}
        {pantalla === 'asistente' && (
          <Asistente onIrAjustes={() => setPantalla('ajustes')} />
        )}
      </main>

      <AvisoActualizacion />

      {/* nav inferior */}
      <nav className="no-print sticky bottom-0 z-20 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setPantalla(t.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
              pantalla === t.id ? 'text-sky-700' : 'text-slate-400'
            }`}
          >
            <span className="text-lg leading-none">{t.icono}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Cargando({ texto }: { texto: string }) {
  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-sky-700" />
        <p className="mt-3 text-sm text-slate-500">{texto}</p>
      </div>
    </div>
  )
}
