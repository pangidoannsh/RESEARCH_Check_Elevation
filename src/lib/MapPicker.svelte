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

    // ArcGIS (Esri) basemap tiles. Note the {z}/{y}/{x} order used by ArcGIS MapServer.
    const esri = (service: string, attribution: string, maxNativeZoom = 19) =>
      L.tileLayer(
        `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`,
        { maxZoom: 19, maxNativeZoom, attribution: `Tiles &copy; Esri &mdash; ${attribution}` },
      )

    const topo = esri(
      'World_Topo_Map',
      'Esri, HERE, Garmin, Intermap, USGS, FAO, NOAA, &copy; OpenStreetMap contributors, GIS User Community',
    )
    const imagery = esri(
      'World_Imagery',
      'Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    )
    const street = esri(
      'World_Street_Map',
      'Esri, HERE, Garmin, USGS, &copy; OpenStreetMap contributors, GIS User Community',
    )
    const shaded = esri('World_Shaded_Relief', 'Source: Esri', 13)
    // Place names / boundaries overlay for the satellite layer.
    const labels = esri('Reference/World_Boundaries_and_Places', 'Esri')

    topo.addTo(map)
    L.control
      .layers(
        { 'Topografi (Esri)': topo, 'Satelit (Esri)': imagery, 'Jalan (Esri)': street, 'Relief (Esri)': shaded },
        { 'Label tempat': labels },
        { position: 'bottomleft' },
      )
      .addTo(map)

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

<div bind:this={container} class="h-full w-full"></div>
