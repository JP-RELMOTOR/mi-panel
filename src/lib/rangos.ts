import type { Analito, AppState, EstadoResultado, Resultado } from '../types'

// Rango efectivo de un resultado: overrides por-toma mandan sobre el catálogo
export function rangoEfectivo(a: Analito | undefined, r: Resultado) {
  return {
    lo: r.refMin ?? a?.lo,
    hi: r.refMax ?? a?.hi,
    refTxt: r.refTxt ?? a?.refTxt,
  }
}

// Estado derivado de valor vs rango (si no hay estado curado)
export function estadoDerivado(
  valor: number | undefined,
  lo?: number,
  hi?: number,
): EstadoResultado {
  if (valor == null || (lo == null && hi == null)) return 'ok'
  if (lo != null && valor < lo) return 'out'
  if (hi != null && valor > hi) return 'out'
  return 'ok'
}

// Variación porcentual entre dos tomas (null si no aplica)
export function variacion(v1?: number, v2?: number): number | null {
  if (v1 == null || v2 == null || v1 === 0) return null
  return ((v2 - v1) / Math.abs(v1)) * 100
}

// ¿Cambio relevante? (≥15% entre tomas consecutivas)
export function esCambioRelevante(v1?: number, v2?: number): boolean {
  const d = variacion(v1, v2)
  return d != null && Math.abs(d) >= 15
}

// Flecha de tendencia (umbral 2% como el dashboard original)
export function tendencia(v1?: number, v2?: number): '▲' | '▼' | '≈' | '' {
  const d = variacion(v1, v2)
  if (d == null) return ''
  if (Math.abs(d) < 2) return '≈'
  return d > 0 ? '▲' : '▼'
}

// Formato de número estilo es-CL (coma decimal)
export function fmt(v: number | undefined, dec?: number): string {
  if (v == null) return '—'
  const d = dec ?? (Number.isInteger(v) ? 0 : 1)
  return v.toLocaleString('es-CL', {
    minimumFractionDigits: d,
    maximumFractionDigits: Math.max(d, 2),
  })
}

// ============ Serie temporal de un analito ============

export interface PuntoSerie {
  examenId: string
  fecha: string
  valor?: number
  texto?: string
  estado: EstadoResultado
  nota?: string
  lo?: number
  hi?: number
  refTxt?: string
}

export function serieDeAnalito(s: AppState, analitoId: string): PuntoSerie[] {
  const a = s.analitos[analitoId]
  const porExamen = s.resultados[analitoId] ?? {}
  const puntos: PuntoSerie[] = []
  for (const [eid, r] of Object.entries(porExamen)) {
    const ex = s.examenes[eid]
    if (!ex) continue
    const { lo, hi, refTxt } = rangoEfectivo(a, r)
    puntos.push({
      examenId: eid,
      fecha: ex.fecha,
      valor: r.valor,
      texto: r.texto,
      estado: r.estado,
      nota: r.nota,
      lo,
      hi,
      refTxt,
    })
  }
  puntos.sort((x, y) => x.fecha.localeCompare(y.fecha))
  return puntos
}

// ============ Hallazgos (para Resumen y filtros) ============

export interface Hallazgo {
  analitoId: string
  nombre: string
  unidad?: string
  estado: EstadoResultado
  ultimo: PuntoSerie
  anterior?: PuntoSerie
  deltaPct: number | null
  nota?: string
}

// Hallazgos del último examen de cada analito: out primero, luego watch,
// luego cambios relevantes (≥15%).
export function hallazgos(s: AppState): Hallazgo[] {
  const lista: Hallazgo[] = []
  for (const a of Object.values(s.analitos)) {
    const serie = serieDeAnalito(s, a.id)
    if (serie.length === 0) continue
    const ultimo = serie[serie.length - 1]
    const anterior = serie.length > 1 ? serie[serie.length - 2] : undefined
    const deltaPct = variacion(anterior?.valor, ultimo.valor)
    const relevante =
      ultimo.estado !== 'ok' || esCambioRelevante(anterior?.valor, ultimo.valor)
    if (!relevante) continue
    lista.push({
      analitoId: a.id,
      nombre: a.nombre,
      unidad: a.unidad,
      estado: ultimo.estado,
      ultimo,
      anterior,
      deltaPct,
      nota: ultimo.nota,
    })
  }
  const peso = { out: 0, watch: 1, ok: 2 }
  lista.sort(
    (x, y) =>
      peso[x.estado] - peso[y.estado] ||
      Math.abs(y.deltaPct ?? 0) - Math.abs(x.deltaPct ?? 0),
  )
  return lista
}

// ============ Patrones por reglas (tarjeta "Lectura" del Resumen) ============

export interface Patron {
  titulo: string
  detalle: string
}

export function patrones(s: AppState): Patron[] {
  const lista: Patron[] = []
  const serie = (id: string) => serieDeAnalito(s, id)
  const sube = (id: string) => {
    const p = serie(id)
    if (p.length < 2) return null
    const d = variacion(p[p.length - 2].valor, p[p.length - 1].valor)
    return d != null && d >= 15 ? d : null
  }

  // Patrón metabólico: insulina y HOMA subiendo juntos
  const dInsulina = sube('insulina_basal')
  const dHoma = sube('homa')
  if (dInsulina != null && dHoma != null) {
    lista.push({
      titulo: 'Patrón metabólico en movimiento',
      detalle: `Insulina (+${Math.round(dInsulina)}%) y HOMA (+${Math.round(
        dHoma,
      )}%) subieron juntos desde la toma anterior. Aún dentro de rango, pero es el patrón a vigilar con hábitos.`,
    })
  }

  // Analitos bajo el rango
  for (const a of Object.values(s.analitos)) {
    const p = serie(a.id)
    if (p.length === 0) continue
    const u = p[p.length - 1]
    if (u.valor != null && u.lo != null && u.valor < u.lo) {
      lista.push({
        titulo: `${a.nombre} bajo el rango`,
        detalle: `Último valor ${fmt(u.valor)} ${a.unidad ?? ''} (rango ${
          u.refTxt ?? `${fmt(u.lo)}–${fmt(u.hi)}`
        }).`,
      })
    }
  }

  return lista
}
