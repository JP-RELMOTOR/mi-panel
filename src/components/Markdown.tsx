// Render minimalista de markdown (negritas, títulos, listas) sin librerías.
export default function Markdown({ texto }: { texto: string }) {
  const lineas = texto.split('\n')
  const conNegritas = (t: string) =>
    t.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
      seg.startsWith('**') && seg.endsWith('**') ? (
        <b key={j}>{seg.slice(2, -2)}</b>
      ) : (
        seg
      ),
    )
  return (
    <div className="text-sm leading-relaxed text-slate-700">
      {lineas.map((l, i) => {
        if (/^#{1,3}\s/.test(l))
          return (
            <p key={i} className="mt-2 font-bold text-slate-800">
              {conNegritas(l.replace(/^#{1,3}\s/, ''))}
            </p>
          )
        if (/^\s*[-•*]\s/.test(l))
          return (
            <p key={i} className="ml-3 flex gap-1.5">
              <span>•</span>
              <span>{conNegritas(l.replace(/^\s*[-•*]\s/, ''))}</span>
            </p>
          )
        if (/^\s*\d+\.\s/.test(l))
          return (
            <p key={i} className="ml-3">
              {conNegritas(l)}
            </p>
          )
        if (/^\*[^*]+\*$/.test(l.trim()))
          return (
            <p key={i} className="mt-1 italic text-slate-500">
              {l.trim().slice(1, -1)}
            </p>
          )
        if (l.trim() === '') return <div key={i} className="h-2" />
        return <p key={i}>{conNegritas(l)}</p>
      })}
    </div>
  )
}
