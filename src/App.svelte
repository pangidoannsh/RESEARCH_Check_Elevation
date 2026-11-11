<script lang="ts">
  import MapPicker from './lib/MapPicker.svelte'
  import {
    getElevation,
    getElevations,
    parseCoordinates,
    isValidCoordinate,
    formatMeters,
    metersToFeet,
    type Coordinate,
    type ElevationResult,
  } from './lib/elevation'

  type Tab = 'single' | 'batch'
  let tab = $state<Tab>('single')

  // ---------- Single point ----------
  let latInput = $state('')
  let lngInput = $state('')
  let selected = $state<Coordinate | null>(null)
  let result = $state<ElevationResult | null>(null)
  let loading = $state(false)
  let error = $state('')
  let locating = $state(false)
  let controller: AbortController | undefined

  const HISTORY_KEY = 'elevation-history'
  let history = $state<ElevationResult[]>(loadHistory())

  function loadHistory(): ElevationResult[] {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    } catch {
      return []
    }
  }

  $effect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    } catch {
      /* storage unavailable */
    }
  })

  async function check(point: Coordinate) {
    if (!isValidCoordinate(point)) {
      error = 'Koordinat tidak valid. Latitude -90..90, longitude -180..180.'
      return
    }
    controller?.abort()
    controller = new AbortController()
    selected = point
    latInput = point.lat.toFixed(6)
    lngInput = point.lng.toFixed(6)
    loading = true
    error = ''
    try {
      result = await getElevation(point, controller.signal)
      history = [result, ...history].slice(0, 20)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        error = (e as Error).message
        result = null
      }
    } finally {
      loading = false
    }
  }

  function submitSingle(e: SubmitEvent) {
    e.preventDefault()
    // Allow pasting "lat, lng" into the latitude field.
    if (latInput.includes(',') && !lngInput) {
      const [a, b] = latInput.split(',')
      latInput = a.trim()
      lngInput = b?.trim() ?? ''
    }
    check({ lat: Number(latInput), lng: Number(lngInput) })
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      error = 'Browser tidak mendukung geolokasi.'
      return
    }
    locating = true
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locating = false
        check({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        locating = false
        error = `Gagal mengambil lokasi: ${err.message}`
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // ---------- Batch ----------
  let batchText = $state('-6.914744, 107.609810\n-7.983908, 112.621391\n-8.409518, 115.188919')
  let batchResults = $state<ElevationResult[]>([])
  let batchLoading = $state(false)
  let batchError = $state('')
  let parsed = $derived(parseCoordinates(batchText))

  async function runBatch() {
    batchError = ''
    if (parsed.points.length === 0) {
      batchError = 'Tidak ada koordinat valid.'
      return
    }
    batchLoading = true
    try {
      batchResults = await getElevations(parsed.points)
    } catch (e) {
      batchError = (e as Error).message
    } finally {
      batchLoading = false
    }
  }

  function downloadCsv() {
    const rows = [
      'latitude,longitude,elevation_mdpl',
      ...batchResults.map((r) => `${r.lat},${r.lng},${r.elevation ?? ''}`),
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: 'elevasi.csv' })
    a.click()
    URL.revokeObjectURL(url)
  }

  const fmtCoord = (p: Coordinate) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`
</script>

<div class="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8">
  <header class="flex flex-col gap-1">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
      Cek Elevasi <span class="text-emerald-600">mdpl</span>
    </h1>
    <p class="text-sm text-slate-500">
      Ketinggian permukaan tanah dari koordinat latitude/longitude memakai Open-Meteo Elevation API
      (Copernicus DEM GLO-90, resolusi 90 m).
    </p>
  </header>

  <nav class="inline-flex w-fit rounded-lg bg-slate-200 p-1 text-sm font-medium">
    {#each [['single', 'Satu titik'], ['batch', 'Banyak titik']] as [key, label]}
      <button
        class="rounded-md px-4 py-1.5 transition {tab === key
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900'}"
        onclick={() => (tab = key as Tab)}
      >
        {label}
      </button>
    {/each}
  </nav>

  {#if tab === 'single'}
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section class="h-[28rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:h-[36rem]">
        <MapPicker {selected} onpick={check} />
      </section>

      <aside class="flex flex-col gap-4">
        <form
          onsubmit={submitSingle}
          class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p class="text-sm text-slate-500">Klik peta, atau masukkan koordinat:</p>
          <div class="grid grid-cols-2 gap-2">
            <label class="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Latitude
              <input
                bind:value={latInput}
                inputmode="decimal"
                placeholder="-6.9147"
                class="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label class="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Longitude
              <input
                bind:value={lngInput}
                inputmode="decimal"
                placeholder="107.6098"
                class="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
          </div>
          <div class="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              class="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Memuat…' : 'Cek elevasi'}
            </button>
            <button
              type="button"
              onclick={useMyLocation}
              disabled={locating}
              class="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              title="Gunakan lokasi saya"
            >
              {locating ? '…' : '📍 Lokasi saya'}
            </button>
          </div>
        </form>

        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {#if error}
            <p class="text-sm text-red-600">{error}</p>
          {:else if loading}
            <div class="h-16 animate-pulse rounded-md bg-slate-100"></div>
          {:else if result}
            <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Elevasi</p>
            <p class="mt-1 text-4xl font-bold text-slate-900">
              {#if result.elevation !== null}
                {result.elevation.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                <span class="text-lg font-medium text-slate-500">mdpl</span>
              {:else}
                <span class="text-lg text-slate-500">Tidak ada data</span>
              {/if}
            </p>
            {#if result.elevation !== null}
              <p class="text-sm text-slate-500">
                ≈ {Math.round(metersToFeet(result.elevation)).toLocaleString('id-ID')} ft
              </p>
            {/if}
            <p class="mt-3 font-mono text-xs text-slate-500">{fmtCoord(result)}</p>
          {:else}
            <p class="text-sm text-slate-500">Belum ada titik yang dicek.</p>
          {/if}
        </div>

        {#if history.length}
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="mb-2 flex items-center justify-between">
              <h2 class="text-sm font-semibold text-slate-700">Riwayat</h2>
              <button class="text-xs text-slate-500 hover:text-red-600" onclick={() => (history = [])}>
                Hapus
              </button>
            </div>
            <ul class="max-h-56 divide-y divide-slate-100 overflow-auto text-sm">
              {#each history as h, i (i)}
                <li>
                  <button
                    class="flex w-full justify-between gap-2 py-1.5 text-left hover:text-emerald-700"
                    onclick={() => check(h)}
                  >
                    <span class="font-mono text-xs text-slate-500">{fmtCoord(h)}</span>
                    <span class="font-medium">{formatMeters(h.elevation)}</span>
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </aside>
    </div>
  {:else}
    <div class="grid gap-6 lg:grid-cols-2">
      <section class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label for="batch" class="text-sm text-slate-600">
          Satu koordinat per baris, format <code class="rounded bg-slate-100 px-1">lat, lng</code>
        </label>
        <textarea
          id="batch"
          bind:value={batchText}
          rows="12"
          class="rounded-md border border-slate-300 p-3 font-mono text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        ></textarea>
        <div class="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            {parsed.points.length} titik valid
            {#if parsed.invalidLines.length}
              · <span class="text-amber-600">baris tidak valid: {parsed.invalidLines.join(', ')}</span>
            {/if}
          </span>
          <button
            onclick={runBatch}
            disabled={batchLoading}
            class="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {batchLoading ? 'Memuat…' : 'Cek semua'}
          </button>
        </div>
        {#if batchError}<p class="text-sm text-red-600">{batchError}</p>{/if}
      </section>

      <section class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-700">Hasil</h2>
          {#if batchResults.length}
            <button onclick={downloadCsv} class="text-sm font-medium text-emerald-700 hover:underline">
              Unduh CSV
            </button>
          {/if}
        </div>
        {#if batchResults.length}
          <div class="max-h-[26rem] overflow-auto">
            <table class="w-full text-left text-sm">
              <thead class="sticky top-0 bg-white text-xs uppercase text-slate-500">
                <tr><th class="py-2">#</th><th>Latitude</th><th>Longitude</th><th class="text-right">Elevasi</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each batchResults as r, i (i)}
                  <tr>
                    <td class="py-1.5 text-slate-400">{i + 1}</td>
                    <td class="font-mono text-xs">{r.lat}</td>
                    <td class="font-mono text-xs">{r.lng}</td>
                    <td class="text-right font-medium">{formatMeters(r.elevation)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="text-sm text-slate-500">Hasil akan muncul di sini.</p>
        {/if}
      </section>
    </div>
  {/if}

  <footer class="mt-auto border-t border-slate-200 pt-4 text-xs text-slate-500">
    Data elevasi: <a class="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
    · Copernicus DEM GLO-90 © DLR e.V. 2010–2014 dan © Airbus Defence and Space GmbH 2014–2018, disediakan
    dalam program COPERNICUS oleh European Union dan ESA. Peta: OpenStreetMap, OpenTopoMap.
    Nilai berupa model permukaan (DSM) resolusi 90 m, dapat terpengaruh vegetasi/bangunan.
  </footer>
</div>
