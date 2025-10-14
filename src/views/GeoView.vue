<template>
  <section class="geo-container">
    <div class="card">
      <h2 class="mb-3">Geo Features</h2>

      <div class="mb-4">
        <h5 class="mb-2">Search Points of Interest</h5>
        <div class="d-flex gap-2 mb-2">
          <input
            v-model.trim="poiQuery"
            type="text"
            class="form-control flex-grow-1"
            placeholder="e.g. cafe, sushi, pharmacy"
          />
          <select v-model="poiCategory" class="form-select" style="max-width: 150px">
            <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>

        <div class="d-flex gap-2 mb-2">
          <button class="btn btn-primary flex-grow-1" @click="searchNearCenter" :disabled="loading">
            {{ loading ? 'Searching…' : 'Search near map center' }}
          </button>
          <button class="btn btn-outline-secondary" @click="clearPois" :disabled="loading">Clear</button>
        </div>

        <p class="text-muted mb-0">Tip: Pan/zoom the map, then search near the new center.</p>
        <p v-if="poiMsg" :class="poiMsgType === 'ok' ? 'text-success' : 'text-danger'" class="mb-0 mt-2">
          {{ poiMsg }}
        </p>
      </div>

      <div>
        <h5 class="mb-2">Routing (Driving)</h5>
        <input v-model.trim="fromName" class="form-control mb-2" placeholder="From (e.g., Flinders Street Station)" />
        <input v-model.trim="toName" class="form-control mb-2" placeholder="To (e.g., University of Melbourne)" />
        <button class="btn btn-primary w-100" @click="drawRoute" :disabled="routing">
          {{ routing ? 'Requesting route…' : 'Get Route' }}
        </button>
        <p v-if="routeMsg" :class="routeMsgType === 'ok' ? 'text-success' : 'text-danger'" class="mb-0 mt-2">
          {{ routeMsg }}
        </p>
      </div>
    </div>

    <div class="map" ref="mapEl"></div>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, onActivated } from 'vue'
import mapboxgl from 'mapbox-gl'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
mapboxgl.accessToken = MAPBOX_TOKEN

const MELBOURNE = [144.9631, -37.8136]
const categories = [
  { value: 'Library', label: 'Library' },
  { value: 'Cafe', label: 'Cafe' },
  { value: 'Restaurant', label: 'Restaurant' },
  { value: 'Supermarket', label: 'Supermarket' },
  { value: 'Pharmacy', label: 'Pharmacy' },
]
const routeSourceId = 'route-source'
const routeLayerId = 'route-layer'

const mapEl = ref(null)
let map = null
let ro = null
let resizeKickTimer = null

const poiQuery = ref('cafe')
const poiCategory = ref('Library')
const loading = ref(false)
const poiMsg = ref('')
const poiMsgType = ref('ok')
let poiMarkers = []

const fromName = ref('Flinders Street Station')
const toName   = ref('University of Melbourne')
const routing  = ref(false)
const routeMsg = ref('')
const routeMsgType = ref('ok')

function waitForVisible(el, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (!el) return reject(new Error('No element'))
    const ok = () => el.offsetWidth > 0 && el.offsetHeight > 0
    if (ok()) return resolve()

    const roLocal = new ResizeObserver(() => { if (ok()) { roLocal.disconnect(); resolve() } })
    roLocal.observe(el)

    const t = setTimeout(() => {
      roLocal.disconnect()
      if (ok()) resolve()
      else reject(new Error('Map container still 0×0 after timeout'))
    }, timeoutMs)
  })
}

function kickResize() {
  if (!map) return
  // few RAF cycles
  let i = 0
  function rafResize() {
    if (!map) return
    map.resize()
    if (++i < 6) requestAnimationFrame(rafResize)
  }
  requestAnimationFrame(rafResize)

  clearTimeout(resizeKickTimer)
  const bumps = [60, 150, 300, 600, 1000]
  let idx = 0
  function bump() {
    if (!map) return
    map.resize()
    if (idx < bumps.length) resizeKickTimer = setTimeout(bump, bumps[idx++])
  }
  bump()
}

function ensureResize() {
  if (!map) return
  const el = map.getContainer()
  const r = el.getBoundingClientRect()
  if (r.width > 0 && r.height > 0) map.resize()
}

function clearRoute() {
  if (!map) return
  if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId)
  if (map.getSource(routeSourceId)) map.removeSource(routeSourceId)
}

function clearPois() {
  poiMarkers.forEach(m => m.remove())
  poiMarkers = []
  poiMsg.value = ''
}

async function geocodeOne(name) {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(name)}.json`)
  url.searchParams.set('access_token', MAPBOX_TOKEN)
  url.searchParams.set('limit', '1')
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Geocoding failed (${r.status})`)
  const d = await r.json()
  return d.features?.[0]?.center
}

async function searchNearCenter() {
  if (!map) return
  loading.value = true
  poiMsg.value = ''
  try {
    const center = map.getCenter()
    const query = poiQuery.value || 'place'
    const cat = poiCategory.value || ''
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`)
    url.searchParams.set('access_token', MAPBOX_TOKEN)
    url.searchParams.set('proximity', `${center.lng},${center.lat}`)
    url.searchParams.set('types', 'poi')
    url.searchParams.set('limit', '10')
    if (cat) url.searchParams.set('categories', cat)

    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const feats = data.features || []

    clearPois()
    if (feats.length === 0) {
      poiMsg.value = 'No results near current map center.'
      poiMsgType.value = 'error'
      return
    }

    const bounds = new mapboxgl.LngLatBounds()
    feats.forEach(f => {
      const [lng, lat] = f.center
      bounds.extend([lng, lat])
      const m = new mapboxgl.Marker().setLngLat([lng, lat]).setPopup(
        new mapboxgl.Popup({ offset: 12 }).setHTML(
          `<strong>${f.text || 'POI'}</strong><br/><small>${f.place_name || ''}</small>`
        )
      )
      m.addTo(map)
      poiMarkers.push(m)
    })
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40, duration: 500 })

    poiMsg.value = `Found ${feats.length} result(s).`
    poiMsgType.value = 'ok'
  } catch (e) {
    poiMsg.value = `Search failed: ${e.message || e}`
    poiMsgType.value = 'error'
  } finally {
    loading.value = false
  }
}

async function drawRoute() {
  if (!map) return
  routing.value = true
  routeMsg.value = ''
  try {
    clearRoute()
    const from = await geocodeOne(fromName.value)
    const to   = await geocodeOne(toName.value)
    if (!from || !to) throw new Error('Could not geocode one or both locations.')

    const url = new URL(
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${from[0]},${from[1]};${to[0]},${to[1]}`
    )
    url.searchParams.set('geometries', 'geojson')
    url.searchParams.set('overview', 'full')
    url.searchParams.set('access_token', MAPBOX_TOKEN)

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Directions failed (${res.status})`)
    const data = await res.json()
    const route = data.routes?.[0]?.geometry
    if (!route) throw new Error('No route returned.')

    map.addSource(routeSourceId, { type: 'geojson', data: { type: 'Feature', geometry: route } })
    map.addLayer({
      id: routeLayerId,
      type: 'line',
      source: routeSourceId,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.9 }
    })

    const bounds = new mapboxgl.LngLatBounds()
    route.coordinates.forEach(c => bounds.extend(c))
    map.fitBounds(bounds, { padding: 50, duration: 600 })

    routeMsg.value = 'Route drawn successfully.'
    routeMsgType.value = 'ok'
  } catch (e) {
    routeMsg.value = e?.message || String(e)
    routeMsgType.value = 'error'
  } finally {
    routing.value = false
  }
}

onMounted(async () => {
  await nextTick()

  await waitForVisible(mapEl.value).catch(() => {})

  map = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: MELBOURNE,
    zoom: 12,
    accessToken: MAPBOX_TOKEN
  })
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left')

  map.once('load', () => { ensureResize(); kickResize() })
  setTimeout(kickResize, 40)
  setTimeout(kickResize, 200)

  ro = new ResizeObserver(() => ensureResize())
  ro.observe(map.getContainer())
  window.addEventListener('resize', ensureResize)
})

onActivated(() => kickResize())

onBeforeUnmount(() => {
  window.removeEventListener('resize', ensureResize)
  ro?.disconnect()
  clearTimeout(resizeKickTimer)
  map?.remove()
  map = null
})
</script>

<style scoped>
.geo-container {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  padding: 16px;
  min-height: calc(100vh - 64px);
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,.06);
}

.map {
  width: 100%;
  height: 70vh;       
  min-height: 420px;  
  border-radius: 12px;
  overflow: hidden;
}

.mb-2 { margin-bottom: .5rem; }
.mb-3 { margin-bottom: .75rem; }
.mb-4 { margin-bottom: 1rem; }
.d-flex { display: flex; }
.flex-grow-1 { flex: 1 1 auto; }
.flex-column { flex-direction: column; }
.gap-2 { gap: .5rem; }
.text-muted { color: #6b7280; }
.text-success { color: #16a34a; }
.text-danger { color: #dc2626; }

@media (max-width: 900px) {
  .geo-container { grid-template-columns: 1fr; }
  .map { height: 55vh; min-height: 360px; }
}
</style>
