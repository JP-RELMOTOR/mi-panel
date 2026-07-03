// Textos y constantes de la app.

// Nota estándar que acompaña toda interpretación/prediagnóstico.
export const NOTA_CONFIRMAR =
  'Orientación personal — confirma esto con tu médico.'

// Meta semanal amable (guías internacionales)
export const META_CARDIO_MIN = 150 // min/semana (rango 150–300)
export const META_FUERZA_SESIONES = 2 // sesiones/semana

// Íconos SVG genéricos por clave de grupo (paths de 24x24, stroke currentColor)
export const ICONOS: Record<string, string> = {
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z',
  liver:
    'M4 8c0-2.2 1.8-4 4-4h8c2.2 0 4 1.8 4 4v3c0 4.4-3.6 8-8 8h-1c-3.9 0-7-3.1-7-7V8z',
  vial: 'M9 3h6M10 3v7.3l-4.2 7A3 3 0 0 0 8.4 21h7.2a3 3 0 0 0 2.6-4.7L14 10.3V3',
  drop: 'M12 3s6 6.3 6 10.5A6 6 0 0 1 6 13.5C6 9.3 12 3 12 3z',
  kidney:
    'M15 4c-3.9 0-7 3.6-7 8s3.1 8 7 8c1.7 0 3-1.3 3-3s-1.2-2.4-2-3c-1.2-.8-2-1.5-2-2s.8-1.2 2-2c.8-.6 2-1.3 2-3s-1.3-3-3-3z',
  gland:
    'M8 5a4 4 0 0 0 0 8h1v3a3 3 0 0 0 6 0v-3h1a4 4 0 0 0 0-8H8z',
  ear: 'M6 10a6 6 0 1 1 12 0c0 3-2 4-3 6s-1 5-4 5-3-2-3-4M9 10a3 3 0 1 1 6 0',
  pill: 'M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7l7-7zM7 7l7 7',
  tooth:
    'M12 4c-2 0-2.5-1-4.5-1S3 5 3 8c0 5 2.5 13 4.5 13 1.6 0 1.5-4 2.5-6 .5-1 1-1.5 2-1.5s1.5.5 2 1.5c1 2 .9 6 2.5 6C18.5 21 21 13 21 8c0-3-2.5-5-4.5-5S14 4 12 4z',
}
