import type { CursoMed, FaseCurso } from '../types'
import { hoyISO } from './fechas'

// Días enteros entre dos fechas ISO (b - a). Positivo si b es posterior.
export function diasEntre(aISO: string, bISO: string): number {
  const a = new Date(aISO + 'T00:00:00')
  const b = new Date(bISO + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

// Suma ISO + n días
export function sumarDias(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  const p = (k: number) => String(k).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export interface EstadoCurso {
  totalDias: number
  finISO: string // último día con dosis
  diaN: number // día actual del curso (1-based); 0 o negativo si aún no empieza
  porEmpezar: boolean
  terminado: boolean
  faseHoy: FaseCurso | null
  diaEnFase: number // día dentro de la fase actual (1-based)
  faseIndex: number
}

// Estado del curso para una fecha dada (por defecto, hoy en el dispositivo)
export function estadoCurso(curso: CursoMed, fechaISO = hoyISO()): EstadoCurso {
  const totalDias = curso.fases.reduce((n, f) => n + f.dias, 0)
  const finISO = sumarDias(curso.inicio, totalDias - 1)
  const offset = diasEntre(curso.inicio, fechaISO) // 0 = primer día
  const diaN = offset + 1

  const base: EstadoCurso = {
    totalDias,
    finISO,
    diaN,
    porEmpezar: offset < 0,
    terminado: offset >= totalDias,
    faseHoy: null,
    diaEnFase: 0,
    faseIndex: -1,
  }
  if (base.porEmpezar || base.terminado) return base

  // ubicar la fase de hoy
  let acum = 0
  for (let i = 0; i < curso.fases.length; i++) {
    const f = curso.fases[i]
    if (offset < acum + f.dias) {
      base.faseHoy = f
      base.faseIndex = i
      base.diaEnFase = offset - acum + 1
      break
    }
    acum += f.dias
  }
  return base
}

// Rango de fechas ISO que cubre cada fase (para mostrar el calendario)
export function fasesConFechas(curso: CursoMed) {
  let acum = 0
  return curso.fases.map((f) => {
    const desde = sumarDias(curso.inicio, acum)
    const hasta = sumarDias(curso.inicio, acum + f.dias - 1)
    acum += f.dias
    return { ...f, desde, hasta }
  })
}
