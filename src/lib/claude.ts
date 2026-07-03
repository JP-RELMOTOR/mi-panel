// Cliente del Asistente IA — llamadas directas navegador → API de Anthropic.
// La API key vive en salud/config (base protegida por UID), nunca en el código.
import Anthropic from '@anthropic-ai/sdk'
import type { AccionInforme, AppState, Informe, MensajeChat } from '../types'
import { serieDeAnalito } from './rangos'
import { esDelMesActual, hoyISO, ultimosDias } from './fechas'

// Modelos disponibles para el Asistente (elegible en Ajustes)
export const MODELOS = [
  {
    id: 'claude-opus-4-8',
    nombre: 'Claude Opus 4.8',
    detalle: 'El más capaz — mejor razonamiento clínico. ~US$0,05–0,10 por consulta.',
  },
  {
    id: 'claude-sonnet-5',
    nombre: 'Claude Sonnet 5',
    detalle: 'Casi tan bueno, a menos de la mitad del costo. ~US$0,02–0,04 por consulta.',
  },
  {
    id: 'claude-haiku-4-5',
    nombre: 'Claude Haiku 4.5',
    detalle: 'El más rápido y económico, para preguntas simples. ~US$0,01 por consulta.',
  },
] as const

export const MODELO_DEFECTO = 'claude-opus-4-8'

// Haiku 4.5 no soporta thinking adaptativo — se omite el parámetro
function configThinking(modelo: string) {
  return modelo === 'claude-haiku-4-5'
    ? {}
    : { thinking: { type: 'adaptive' as const } }
}

// Rol e instrucciones del asistente (principio rector de la app)
const INSTRUCCIONES = `Eres el asistente de salud personal del propietario de esta app privada ("Mi Panel"). Tienes acceso a todos sus datos de salud (abajo, en JSON).

Tu rol:
- Entregar interpretación clínica orientativa y prediagnósticos de sus datos: qué patrones se ven, posibles explicaciones, qué tan prioritario es cada hallazgo y a qué especialista corresponde.
- Responder sus preguntas con claridad, citando sus valores concretos con fechas.
- Ayudarle a preparar consultas médicas: qué preguntas llevar, qué exámenes conversar.

Reglas:
- Cierra SIEMPRE toda interpretación o prediagnóstico con la nota "Confirma esto con tu médico" (o una variante natural).
- Tono de cuidado y orden, cercano, nunca alarmista ni catastrófico. Si algo merece atención pronta, dilo con calma y claridad.
- NO prescribas medicamentos ni dosis — eso lo define su médico tratante.
- Responde en español de Chile, conciso y directo. Usa los nombres y unidades de sus exámenes.
- Fecha de hoy: ${hoyISO()}.`

// Serializa el estado a un contexto compacto (pocos KB)
export function armarContexto(s: AppState): string {
  const analitos = Object.values(s.analitos).map((a) => {
    const serie = serieDeAnalito(s, a.id).map((p) => ({
      fecha: p.fecha,
      valor: p.valor,
      texto: p.texto,
      estado: p.estado,
      ...(p.nota ? { nota: p.nota } : {}),
    }))
    return {
      nombre: a.nombre,
      unidad: a.unidad,
      rango: a.refTxt ?? (a.lo != null || a.hi != null ? `${a.lo ?? ''}–${a.hi ?? ''}` : undefined),
      grupo: s.grupos[a.grupo]?.nombre ?? a.grupo,
      serie,
    }
  })

  const examenes = Object.values(s.examenes)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((e) => ({
      fecha: e.fecha,
      laboratorio: e.laboratorio,
      tipo: e.tipo,
      nota: e.nota,
    }))

  const tamizajes = Object.values(s.tamizajes).map((t) => ({
    nombre: t.nombre,
    prioridad: t.prioridad,
    estado: t.estado,
    fechaObjetivo: t.fechaObjetivo,
    notas: t.notas,
  }))

  const eventos = Object.values(s.eventos)
    .sort((a, b) => a.orden - b.orden)
    .map((e) => ({
      fecha: e.fecha ?? e.fechaTexto,
      tipo: e.tipo,
      titulo: e.titulo,
      descripcion: e.descripcion,
    }))

  const medicamentos = Object.values(s.medicamentos).map((m) => ({
    nombre: m.nombre,
    dosis: m.dosis,
    modo: m.modo,
    activo: m.activo,
    notas: m.notas,
    tomasEsteMes: Object.keys(s.tomas[m.id] ?? {}).filter(esDelMesActual).length,
    ultimasTomas: Object.keys(s.tomas[m.id] ?? {}).sort().slice(-10),
  }))

  const dias = ultimosDias(14)
  const habitos = dias
    .filter((d) => s.habitos[d])
    .map((d) => ({ fecha: d, ...s.habitos[d] }))

  return JSON.stringify(
    {
      perfil: s.perfil,
      examenes,
      analitos,
      tamizajes,
      eventos,
      medicamentos,
      habitosUltimos14Dias: habitos,
    },
    null,
    0,
  )
}

function cliente(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

// Consulta con streaming; onTexto recibe el texto acumulado.
export async function consultar(
  apiKey: string,
  contexto: string,
  mensajes: MensajeChat[],
  onTexto: (acumulado: string) => void,
  modelo: string = MODELO_DEFECTO,
): Promise<string> {
  const c = cliente(apiKey)
  const stream = c.messages.stream({
    model: modelo,
    max_tokens: 16000,
    ...configThinking(modelo),
    system: [
      { type: 'text', text: INSTRUCCIONES },
      {
        type: 'text',
        text: `DATOS DE SALUD DE JP (JSON):\n${contexto}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: mensajes.map((m) => ({
      role: m.rol,
      content: m.texto,
    })),
  })

  let acumulado = ''
  stream.on('text', (delta) => {
    acumulado += delta
    onTexto(acumulado)
  })

  const final = await stream.finalMessage()
  if (final.stop_reason === 'refusal') {
    throw new Error('La consulta fue rechazada por seguridad. Reformúlala.')
  }
  if (final.stop_reason === 'max_tokens') {
    acumulado += '\n\n… (respuesta cortada por largo — pregunta por la parte que falta)'
    onTexto(acumulado)
  }
  return acumulado
}

// ---------- Informe de cabecera (opinión + plan de acción del Resumen) ----------

const SCHEMA_INFORME = {
  type: 'object',
  properties: {
    opinion: {
      type: 'string',
      description:
        'Opinión narrativa en markdown (negritas con **): la historia que cuentan TODOS los años de exámenes juntos, cómo está hoy, y los 2-3 puntos que más te llaman la atención o preocupan. Tono de médico de cabecera cercano y franco, sin alarmismo. Cierra con una línea en cursiva recordando confirmarlo con su médico.',
    },
    acciones: {
      type: 'array',
      description:
        'Los cambios en orden de impacto (4 a 7). urgencia "alta" SOLO para lo tiempo-sensible.',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          detalle: {
            type: 'string',
            description: 'Qué hacer y cómo, concreto y realizable.',
          },
          porque: {
            type: 'string',
            description: 'El mecanismo o razón, en una frase.',
          },
          urgencia: { type: 'string', enum: ['alta', 'normal'] },
        },
        required: ['titulo', 'detalle', 'porque', 'urgencia'],
        additionalProperties: false,
      },
    },
  },
  required: ['opinion', 'acciones'],
  additionalProperties: false,
} as const

const PROMPT_INFORME = `Genera mi INFORME DE CABECERA para la pantalla principal de la app, usando todos mis datos. Es tu opinión como mi médico de cabecera: qué historia cuentan mis años de exámenes en conjunto, cómo estoy hoy puntualmente, qué te preocupa o te llama la atención (con los valores y velocidades concretas), y luego el plan: los cambios en orden de impacto, cada uno con qué hacer, cómo y por qué. Prioriza hábitos (alimentación, movimiento, sueño) por sobre listas de exámenes pendientes — eso vive en otra pestaña. Sé franco pero no alarmista.`

export async function generarInforme(
  apiKey: string,
  contexto: string,
  modelo: string = MODELO_DEFECTO,
): Promise<Informe> {
  const c = cliente(apiKey)
  const res = await c.messages.create({
    model: modelo,
    max_tokens: 8192,
    ...configThinking(modelo),
    system: [
      { type: 'text', text: INSTRUCCIONES },
      {
        type: 'text',
        text: `DATOS DE SALUD (JSON):\n${contexto}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    output_config: {
      format: { type: 'json_schema', schema: SCHEMA_INFORME },
    },
    messages: [{ role: 'user', content: PROMPT_INFORME }],
  })
  if (res.stop_reason === 'refusal') {
    throw new Error('La generación fue rechazada por seguridad. Reintenta.')
  }
  const texto = res.content.find((b) => b.type === 'text')?.text
  if (!texto) throw new Error('Respuesta vacía del asistente.')
  const datos = JSON.parse(texto) as {
    opinion: string
    acciones: AccionInforme[]
  }
  return {
    fecha: new Date().toISOString(),
    origen: 'asistente',
    opinion: datos.opinion,
    acciones: datos.acciones,
  }
}

export const PROMPT_PREDIAGNOSTICO = `Genera un PREDIAGNÓSTICO ORIENTATIVO completo de mi estado de salud con todos mis datos. Estructura:

1. **Lo más importante hoy** — 2-3 puntos, en orden de prioridad.
2. **Patrones que se ven** — qué se mueve junto y qué sugiere (ej. eje metabólico).
3. **Posibles explicaciones** — hipótesis razonables para cada hallazgo, de más a menos probable.
4. **Prioridad y especialista** — para cada hallazgo: qué tan urgente y con quién conversarlo.
5. **Preguntas para llevar a las consultas** — concretas, listas para copiar.

Cierra con la nota de confirmar con mi médico.`

// Mensaje de error legible para la UI
export function errorLegible(e: unknown): string {
  const err = e as { status?: number; message?: string }
  if (err.status === 401) return 'API key inválida. Revísala en Ajustes.'
  if (err.status === 400 && /credit/i.test(err.message ?? ''))
    return 'Sin crédito en la cuenta API. Recarga en console.anthropic.com.'
  if (err.status === 429) return 'Límite de uso alcanzado. Espera un momento y reintenta.'
  if (err.status === 529) return 'La API está sobrecargada. Reintenta en unos minutos.'
  return err.message ?? 'Error desconocido al consultar.'
}
