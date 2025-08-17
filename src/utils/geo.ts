/**
 * Utilidades geográficas: cálculo de distancias y ETA.
 */

/**
 * Calcula la distancia en kilómetros entre dos puntos usando Haversine.
 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371 // km
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}

/**
 * Calcula ETA (minutos) dada una distancia en km y una velocidad media en km/h.
 * Por defecto 35 km/h para entorno urbano.
 */
export function estimateEtaMin(distanceKm: number, speedKmh = 35): number {
  if (speedKmh <= 0) return 0
  return Math.round((distanceKm / speedKmh) * 60)
}
