// ============ Tipos del dominio ============

export type EstadoResultado = 'ok' | 'watch' | 'out'

export interface Grupo {
  id: string
  nombre: string
  sub?: string
  icono: string // clave en ICONOS de config.ts
  orden: number
}

export interface Analito {
  id: string
  nombre: string
  unidad?: string
  lo?: number
  hi?: number
  refTxt?: string
  grupo: string
  orden: number
  prioritario?: boolean // HOMA, insulina, vitamina D, lípidos…
}

export interface Examen {
  id: string
  fecha: string // 'YYYY-MM-DD'
  laboratorio: string
  tipo: 'laboratorio' | 'audiometria' | 'imagen' | 'otro'
  nota?: string
  archivoRef?: string
}

export interface Resultado {
  valor?: number
  texto?: string
  estado: EstadoResultado
  nota?: string
  // overrides por-toma cuando el rango de referencia difiere del catálogo
  refMin?: number
  refMax?: number
  refTxt?: string
}

export interface Tamizaje {
  id: string
  nombre: string
  prioridad: 'alta' | 'media' | 'baja'
  estado: 'pendiente' | 'agendado' | 'hecho'
  fechaObjetivo?: string // 'YYYY-MM' o 'YYYY-MM-DD'
  notas?: string
  orden: number
}

export interface EventoSalud {
  id: string
  fecha?: string // 'YYYY-MM-DD' si se conoce
  fechaTexto?: string // "mediados de junio 2026" si es difusa
  tipo: 'examen' | 'consulta' | 'dx' | 'procedimiento' | 'sintoma'
  titulo: string
  descripcion?: string
  destacado?: boolean
  orden: number
}

export interface Medicamento {
  id: string
  nombre: string
  dosis: string
  modo: 'horario' | 'ocasional'
  horario?: string
  inicio?: string
  fin?: string
  activo: boolean
  notas?: string
}

export interface Toma {
  fecha: string // 'YYYY-MM-DD'
  cantidad?: string
  nota?: string
}

export interface HabitoDia {
  sueno?: { horas?: number; calidad?: 'bien' | 'regular' | 'mal' }
  cardioMin?: number
  fuerza?: boolean
  plato?: boolean
  aguaVasos?: number
  pasos?: number
  nota?: string
}

export interface MensajeChat {
  rol: 'user' | 'assistant'
  texto: string
}

export interface Consulta {
  id: string
  fecha: string // ISO
  titulo?: string
  mensajes: Record<string, MensajeChat>
}

export interface Lectura {
  id: string
  fecha: string // ISO
  texto: string
}

// Informe de cabecera: la lectura principal del Resumen — opinión narrativa
// + plan de acción en orden de impacto. Puede venir curado (semilla) o
// regenerarse con el Asistente cuando entren exámenes nuevos.
export interface AccionInforme {
  titulo: string
  detalle: string // qué hacer y cómo, concreto
  porque: string // el mecanismo, en una frase
  urgencia: 'alta' | 'normal'
}

export interface Informe {
  fecha: string // ISO
  origen: 'semilla' | 'asistente'
  opinion: string // markdown
  acciones: AccionInforme[]
}

// Metadatos de un documento original (PDF/foto de examen). El archivo en sí
// (base64) vive en la rama separada `archivos/{id}` y se descarga a pedido.
export interface Documento {
  id: string
  nombre: string
  mime: string
  tamano: number // caracteres del dataURL (aprox bytes)
  fecha: string // ISO de subida
  examenId?: string
}

export interface Perfil {
  nombre?: string
  nacimiento?: string
  antecedentes?: Record<string, string>
}

export interface ConfigApp {
  esquemaVersion?: number
  ultimaImportacion?: string
  apiKey?: string
  modelo?: string // modelo del Asistente (ver MODELOS en lib/claude.ts)
}

// ============ Estado global de la app ============

export interface AppState {
  perfil: Perfil
  grupos: Record<string, Grupo>
  analitos: Record<string, Analito>
  examenes: Record<string, Examen>
  resultados: Record<string, Record<string, Resultado>> // analitoId → examenId → Resultado
  tamizajes: Record<string, Tamizaje>
  eventos: Record<string, EventoSalud>
  medicamentos: Record<string, Medicamento>
  tomas: Record<string, Record<string, Toma>> // medId → fecha → Toma
  habitos: Record<string, HabitoDia> // fecha → HabitoDia
  consultas: Record<string, Consulta>
  lecturas: Record<string, Lectura>
  documentos: Record<string, Documento>
  informe: Informe | null
  config: ConfigApp
}

export function estadoVacio(): AppState {
  return {
    perfil: {},
    grupos: {},
    analitos: {},
    examenes: {},
    resultados: {},
    tamizajes: {},
    eventos: {},
    medicamentos: {},
    tomas: {},
    habitos: {},
    consultas: {},
    lecturas: {},
    documentos: {},
    informe: null,
    config: {},
  }
}
