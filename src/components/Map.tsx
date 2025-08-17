/**
 * Componente de mapa simple basado en SVG.
 * Dibuja puntos y rutas escalando lat/lng a un lienzo dado. Sin dependencias externas.
 */

import React from 'react'

/** Punto a representar en el mapa. */
export interface MapPoint {
  id: string
  lat: number
  lng: number
  kind: 'pickup' | 'destination' | 'driver' | 'client'
  label?: string
}

/** Ruta simple entre dos puntos (línea recta visual). */
export interface MapRoute {
  id: string
  from: { lat: number; lng: number }
  to: { lat: number; lng: number }
}

export interface MapProps {
  /** Dimensiones del mapa */
  width?: number | string
  height?: number | string
  /** Puntos a dibujar */
  points: MapPoint[]
  /** Rutas a dibujar */
  routes?: MapRoute[]
  /** Límites manuales (opcional) */
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
}

/** Calcula límites a partir de puntos con padding. */
function computeBounds(points: MapPoint[], padding = 0.01) {
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const minLat = Math.min(...lats) - padding
  const maxLat = Math.max(...lats) + padding
  const minLng = Math.min(...lngs) - padding
  const maxLng = Math.max(...lngs) + padding
  return { minLat, maxLat, minLng, maxLng }
}

/** Convierte lat/lng a x/y en el canvas. */
function project(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  width: number,
  height: number
) {
  const { minLat, maxLat, minLng, maxLng } = bounds
  const x = ((lng - minLng) / (maxLng - minLng || 1)) * width
  // Y invertido: latitudes mayores (norte) arriba
  const y = ((maxLat - lat) / (maxLat - minLat || 1)) * height
  return { x, y }
}

/** Devuelve color por tipo de punto. */
function colorFor(kind: MapPoint['kind']) {
  switch (kind) {
    case 'pickup':
      return '#22c55e' // verde
    case 'destination':
      return '#f97316' // naranja
    case 'driver':
      return '#3b82f6' // azul
    case 'client':
      return '#a855f7' // violeta
    default:
      return '#6b7280'
  }
}

/** Componente de Mapa SVG. */
export default function Map({ width = '100%', height = 320, points, routes = [], bounds }: MapProps) {
  // Dimensiones numéricas para el SVG
  const w = typeof width === 'number' ? width : 800
  const h = typeof height === 'number' ? height : 320

  const pts = points && points.length > 0 ? points : []
  const minBounds =
    bounds ??
    (pts.length > 0
      ? computeBounds(pts, 0.02)
      : { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 })

  return (
    <div className="relative w-full border rounded-md overflow-hidden bg-muted/20">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Mapa">
        {/* Fondo cuadriculado sutil */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#grid)" />

        {/* Rutas */}
        {routes.map((r) => {
          const a = project(r.from.lat, r.from.lng, minBounds, w, h)
          const b = project(r.to.lat, r.to.lng, minBounds, w, h)
          return (
            <g key={r.id}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" />
            </g>
          )
        })}

        {/* Puntos */}
        {pts.map((p) => {
          const { x, y } = project(p.lat, p.lng, minBounds, w, h)
          const c = colorFor(p.kind)
          return (
            <g key={p.id} transform={`translate(${x}, ${y})`}>
              <circle r="6" fill={c} stroke="#111827" strokeWidth="1" />
              {p.label ? (
                <text x="10" y="4" fontSize="12" fill="#111827" className="select-none">
                  {p.label}
                </text>
              ) : null}
              <title>{p.label ?? p.kind}</title>
            </g>
          )
        })}
      </svg>
      {/* Leyenda */}
      <div className="absolute top-2 right-2 bg-background/80 backdrop-blur px-2 py-1 rounded-md border text-xs flex gap-3">
        <span className="inline-flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-full" style={{background: '#22c55e'}}></i> Recogida</span>
        <span className="inline-flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-full" style={{background: '#f97316'}}></i> Destino</span>
        <span className="inline-flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-full" style={{background: '#3b82f6'}}></i> Chofer</span>
      </div>
    </div>
  )
}
