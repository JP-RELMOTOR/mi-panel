// Genera los íconos PWA (abstractos y neutros) con @resvg/resvg-js.
// Uso: node scripts/iconos.mjs
import { Resvg } from '@resvg/resvg-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Rombo blanco sobre fondo sky-800→sky-600, esquinas redondeadas.
const svg = (size, radioPct = 22) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#075985"/>
      <stop offset="1" stop-color="#0284c7"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="${radioPct}" fill="url(#g)"/>
  <g transform="rotate(45 50 50)">
    <rect x="29" y="29" width="42" height="42" rx="9" fill="#ffffff" opacity="0.94"/>
    <rect x="41" y="41" width="18" height="18" rx="4.5" fill="#075985"/>
  </g>
</svg>`

const salidas = [
  ['public/icon-512.png', 512, 22],
  ['public/icon-192.png', 192, 22],
  ['public/apple-touch-icon.png', 180, 0], // iOS redondea solo
  ['public/favicon-32.png', 32, 22],
]

for (const [rel, size, radio] of salidas) {
  const png = new Resvg(svg(size, radio), {
    fitTo: { mode: 'width', value: size },
  }).render()
  fs.writeFileSync(path.join(RAIZ, rel), png.asPng())
  console.log('✓', rel, `${size}x${size}`)
}
