const MESES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

// '2025-07-14' → '14 jul 2025'
export function fechaCorta(iso?: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m) return iso
  return d ? `${d} ${MESES[m - 1]} ${y}` : `${MESES[m - 1]} ${y}`
}

// Fecha de hoy 'YYYY-MM-DD' en hora local
export function hoyISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Los últimos n días como ISO (incluye hoy), más reciente al final
export function ultimosDias(n: number): string[] {
  const out: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d)
    x.setDate(d.getDate() - i)
    const p = (k: number) => String(k).padStart(2, '0')
    out.push(`${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`)
  }
  return out
}

// Lunes de la semana actual (para rachas semanales)
export function lunesDeEstaSemana(): string {
  const d = new Date()
  const dia = (d.getDay() + 6) % 7 // 0 = lunes
  d.setDate(d.getDate() - dia)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// ¿fecha ISO dentro del mes actual?
export function esDelMesActual(iso: string): boolean {
  return iso.slice(0, 7) === hoyISO().slice(0, 7)
}
