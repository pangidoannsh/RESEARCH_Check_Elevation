<script lang="ts">
  import { onMount } from 'svelte'
  import L from 'leaflet'
  import type { Coordinate } from './elevation'

  interface Props {
    selected: Coordinate | null
    onpick: (point: Coordinate) => void
  }

  let { selected, onpick }: Props = $props()

  let container: HTMLDivElement
  let map: L.Map | undefined
  let marker: L.CircleMarker | undefined

  onMount(() => {
    map = L.map(container, { zoomControl: true }).setView([-2.5, 118], 5) // Indonesia

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    })
    const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap (CC-BY-SA)',
    })
    topo.addTo(map)
    L.control.layers({ Topografi: topo, OpenStreetMap: osm }).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      onpick({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    return () => map?.remove()
  })

  // Keep the marker in sync with the selected point.
  $effect(() => {
    if (!map) return
    if (!selected) {
      marker?.remove()
      marker = undefined
      return
    }
    const latlng: L.LatLngExpression = [selected.lat, selected.lng]
    if (marker) marker.setLatLng(latlng)
    else
      marker = L.circleMarker(latlng, {
        radius: 8,
        color: '#fff',
        weight: 2,
        fillColor: '#059669',
        fillOpacity: 1,
      }).addTo(map)
    if (!map.getBounds().contains(latlng)) map.setView(latlng, Math.max(map.getZoom(), 12))
  })
</script>

<div bind:this={container} class="h-full min-h-80 w-full rounded-xl"></div>
