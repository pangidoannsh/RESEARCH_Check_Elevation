<script lang="ts">
  import MapPicker from './lib/MapPicker.svelte'
  import {
    getElevationRaw,
    metersToFeet,
    type Coordinate,
    type RawElevationResponse,
  } from './lib/elevation'

  let selected = $state<Coordinate | null>(null)
  let response = $state<RawElevationResponse | null>(null)
  let loading = $state(false)
  let error = $state('')
  let copied = $state(false)
  let controller: AbortController | undefined

  async function check(point: Coordinate) {
    controller?.abort()
    controller = new AbortController()
    selected = point
    loading = true
    error = ''
    try {
      response = await getElevationRaw(point, controller.signal)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      error = (e as Error).message
      response = null
    } finally {
      loading = false
    }
  }

  function close() {
    controller?.abort()
    selected = null
    response = null
    error = ''
    loading = false
  }

  async function copyJson() {
    if (!response) return
    await navigator.clipboard.writeText(JSON.stringify(response.body, null, 2))
    copied = true
    setTimeout(() => (copied = false), 1500)
  }

  const fmt = (n: number, digits = 1) => n.toLocaleString('id-ID', { maximumFractionDigits: digits })
  let json = $derived(response ? JSON.stringify(response.body, null, 2) : '')
</script>

<main class="fixed inset-0">
  <MapPicker {selected} onpick={check} />

  <!-- Title / hint -->
  <div
    class="pointer-events-none absolute left-14 top-3 z-[1000] rounded-lg bg-white/90 px-3 py-2 shadow-md backdrop-blur"
  >
    <h1 class="text-sm font-bold text-slate-900">Cek Elevasi <span class="text-emerald-600">mdpl</span></h1>
    <p class="text-xs text-slate-500">Klik titik mana saja di peta</p>
  </div>

  <!-- Result panel -->
  {#if selected}
    <aside
      class="absolute inset-x-3 bottom-3 z-[1000] flex max-h-[70vh] flex-col overflow-hidden rounded-xl bg-white shadow-2xl
             sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-3 sm:max-h-[calc(100vh-1.5rem)] sm:w-96"
    >
      <header class="flex items-start justify-between gap-2 border-b border-slate-100 p-4">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Elevasi</p>
          {#if loading}
            <div class="mt-1 h-10 w-40 animate-pulse rounded-md bg-slate-100"></div>
          {:else if error}
            <p class="mt-1 text-sm text-red-600">{error}</p>
          {:else if response?.elevation != null}
            <p class="text-4xl font-bold text-slate-900">
              {fmt(response.elevation)} <span class="text-lg font-medium text-slate-500">mdpl</span>
            </p>
            <p class="text-sm text-slate-500">≈ {fmt(metersToFeet(response.elevation), 0)} ft</p>
          {:else}
            <p class="mt-1 text-lg text-slate-500">Tidak ada data</p>
          {/if}
          <p class="mt-2 font-mono text-xs text-slate-500">
            {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
          </p>
        </div>
        <button
          onclick={close}
          class="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Tutup panel"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"
            ><path
              d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
            /></svg
          >
        </button>
      </header>

      {#if response}
        <section class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
          <div>
            <p class="mb-1 text-xs font-semibold text-slate-700">Request</p>
            <div class="flex items-center gap-2 text-xs">
              <span class="rounded bg-emerald-100 px-1.5 py-0.5 font-mono font-semibold text-emerald-700">GET</span>
              <span
                class="rounded px-1.5 py-0.5 font-mono font-semibold {response.status < 400
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-red-100 text-red-700'}">{response.status}</span
              >
              <span class="text-slate-500">{response.durationMs} ms</span>
            </div>
            <a
              href={response.url}
              target="_blank"
              rel="noreferrer"
              class="mt-1 block break-all font-mono text-xs text-sky-700 hover:underline">{response.url}</a
            >
          </div>

          <div class="flex min-h-0 flex-col">
            <div class="mb-1 flex items-center justify-between">
              <p class="text-xs font-semibold text-slate-700">Response body (JSON)</p>
              <button onclick={copyJson} class="text-xs font-medium text-emerald-700 hover:underline">
                {copied ? 'Tersalin ✓' : 'Salin'}
              </button>
            </div>
            <pre
              class="overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-emerald-300">{json}</pre>
          </div>
        </section>
      {/if}

      <footer class="border-t border-slate-100 px-4 py-2 text-[10px] leading-snug text-slate-400">
        Data: <a class="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>,
        Copernicus DEM GLO-90 (90 m) © DLR e.V. 2010–2014 & © Airbus Defence and Space GmbH 2014–2018, program
        COPERNICUS (EU & ESA).
      </footer>
    </aside>
  {/if}
</main>
