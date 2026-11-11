// Client for the Open-Meteo Elevation API.
// Data: Copernicus DEM 2021 GLO-90 (90 m resolution), heights relative to mean sea level (mdpl).
// Docs: https://open-meteo.com/en/docs/elevation-api

const ENDPOINT = 'https://api.open-meteo.com/v1/elevation'
export const MAX_POINTS_PER_REQUEST = 100

export interface Coordinate {
  lat: number
  lng: number
}

export interface ElevationResult extends Coordinate {
  elevation: number | null
}

export function isValidCoordinate({ lat, lng }: Coordinate): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

/**
 * Fetch elevations for any number of coordinates.
 * Requests are split into batches of 100 (the API limit).
 */
export async function getElevations(
  points: Coordinate[],
  signal?: AbortSignal,
): Promise<ElevationResult[]> {
  const results: ElevationResult[] = []

  for (let i = 0; i < points.length; i += MAX_POINTS_PER_REQUEST) {
    const batch = points.slice(i, i + MAX_POINTS_PER_REQUEST)
    const params = new URLSearchParams({
      latitude: batch.map((p) => p.lat.toFixed(6)).join(','),
      longitude: batch.map((p) => p.lng.toFixed(6)).join(','),
    })

    const res = await fetch(`${ENDPOINT}?${params}`, { signal })
    const body = await res.json().catch(() => null)

    if (!res.ok || !body || body.error) {
      throw new Error(body?.reason ?? `Request gagal (HTTP ${res.status})`)
    }

    const elevations: (number | null)[] = body.elevation ?? []
    batch.forEach((p, idx) => {
      const value = elevations[idx]
      // Open-Meteo returns NaN / null when no data is available.
      const elevation = typeof value === 'number' && Number.isFinite(value) ? value : null
      results.push({ ...p, elevation })
    })
  }

  return results
}

export async function getElevation(point: Coordinate, signal?: AbortSignal) {
  const [result] = await getElevations([point], signal)
  return result
}

export interface RawElevationResponse {
  url: string
  status: number
  durationMs: number
  /** Parsed JSON body exactly as returned by Open-Meteo. */
  body: unknown
  /** First elevation value, or null when missing / NaN. */
  elevation: number | null
}

/** Single-point request that also exposes the raw API response for inspection. */
export async function getElevationRaw(
  point: Coordinate,
  signal?: AbortSignal,
): Promise<RawElevationResponse> {
  const params = new URLSearchParams({
    latitude: point.lat.toFixed(6),
    longitude: point.lng.toFixed(6),
  })
  const url = `${ENDPOINT}?${params}`
  const started = performance.now()
  const res = await fetch(url, { signal })
  const body = await res.json().catch(() => null)
  const durationMs = Math.round(performance.now() - started)

  const value = (body as { elevation?: unknown[] } | null)?.elevation?.[0]
  const elevation = typeof value === 'number' && Number.isFinite(value) ? value : null

  return { url, status: res.status, durationMs, body, elevation }
}

/**
 * Parse free text into coordinates. One "lat,lng" pair per line;
 * separators can be comma, semicolon, tab or whitespace.
 */
export function parseCoordinates(text: string): { points: Coordinate[]; invalidLines: number[] } {
  const points: Coordinate[] = []
  const invalidLines: number[] = []

  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = raw.trim()
    if (!line) return
    const parts = line.split(/[\s,;]+/).filter(Boolean)
    const point = { lat: Number(parts[0]), lng: Number(parts[1]) }
    if (parts.length >= 2 && isValidCoordinate(point)) points.push(point)
    else invalidLines.push(idx + 1)
  })

  return { points, invalidLines }
}

export const metersToFeet = (m: number) => m * 3.28084

export function formatMeters(m: number | null): string {
  if (m === null) return 'Tidak ada data'
  return `${m.toLocaleString('id-ID', { maximumFractionDigits: 1 })} mdpl`
}
