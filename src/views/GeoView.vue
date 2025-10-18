<template>
  <section class="geo-page">
    <div class="geo-wrap">
      <router-link class="back-link" to="/appointment" aria-label="Back to Appointment">
        ← Back to Appointment
      </router-link>

      <div class="map-wrap">
        <div class="search-fab">
          <div class="fab-inner">
            <div class="typeahead top-ta">
              <input
                v-model.trim="poiQuery"
                type="text"
                class="form-control"
                placeholder="Search a place (e.g., cafe, hospital, museum)"
                aria-label="Search place name"
                @input="onQueryInput"
                @keydown.down.prevent="highlight(1)"
                @keydown.up.prevent="highlight(-1)"
                @keydown.enter.prevent="enterSelect()"
              />
              <ul v-if="suggestOpen" class="suggest">
                <li
                  v-for="(s, i) in suggestList"
                  :key="s.id"
                  :class="{ active: i === activeIndex }"
                  @mousedown.prevent="selectSuggestion(s)"
                >
                  <div class="s-title">{{ s.name }}</div>
                  <div class="s-sub">{{ s.full }}</div>
                </li>
              </ul>
            </div>

            <div class="fab-actions">
              <button class="btn btn-primary" @click="searchNearCenter" :disabled="loading">
                {{ loading ? 'Searching…' : 'Search near map center' }}
              </button>
              <button class="btn btn-outline-secondary" @click="clearPois" :disabled="loading">
                Clear
              </button>
            </div>

            <p v-if="poiMsg" :class="poiMsgType === 'ok' ? 'text-success' : 'text-danger'" class="mt-1 mb-0">
              {{ poiMsg }}
            </p>
          </div>
        </div>

        <div class="map" ref="mapEl" role="region" aria-label="Map"></div>
      </div>

      <div class="card mt-3">
        <h5 class="mb-2">Routing (Driving)</h5>

        <div class="typeahead mb-2 from-ta">
          <input
            v-model.trim="fromName"
            class="form-control"
            placeholder="From (e.g., Flinders Street Station)"
            aria-label="From"
            @input="onRouteInput('from')"
            @keydown.down.prevent="routeHighlight('from', 1)"
            @keydown.up.prevent="routeHighlight('from', -1)"
            @keydown.enter.prevent="routeEnter('from')"
          />
          <ul v-if="fromOpen" class="suggest">
            <li
              v-for="(s, i) in fromList"
              :key="s.id"
              :class="{ active: i === fromIdx }"
              @mousedown.prevent="selectRouteSuggestion('from', s)"
            >
              <div class="s-title">{{ s.name }}</div>
              <div class="s-sub">{{ s.full }}</div>
            </li>
          </ul>
        </div>

        <div class="typeahead mb-2 to-ta">
          <input
            v-model.trim="toName"
            class="form-control"
            placeholder="To (e.g., University of Melbourne)"
            aria-label="To"
            @input="onRouteInput('to')"
            @keydown.down.prevent="routeHighlight('to', 1)"
            @keydown.up.prevent="routeHighlight('to', -1)"
            @keydown.enter.prevent="routeEnter('to')"
          />
          <ul v-if="toOpen" class="suggest">
            <li
              v-for="(s, i) in toList"
              :key="s.id"
              :class="{ active: i === toIdx }"
              @mousedown.prevent="selectRouteSuggestion('to', s)"
            >
              <div class="s-title">{{ s.name }}</div>
              <div class="s-sub">{{ s.full }}</div>
            </li>
          </ul>
        </div>

        <button class="btn btn-primary w-100" @click="drawRoute" :disabled="routing">
          {{ routing ? 'Requesting route…' : 'Get Route' }}
        </button>
        <p v-if="routeMsg" :class="routeMsgType === 'ok' ? 'text-success' : 'text-danger'" class="mt-2 mb-0">
          {{ routeMsg }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, onActivated } from 'vue'
import mapboxgl from 'mapbox-gl'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
mapboxgl.accessToken = MAPBOX_TOKEN
console.log('Mapbox token?', !!MAPBOX_TOKEN, MAPBOX_TOKEN ? MAPBOX_TOKEN.slice(0, 8) + '…' : '(undefined)')

const MELBOURNE = [144.9631, -37.8136] 
const routeSourceId = 'route-source'
const routeLayerId  = 'route-layer'

const mapEl = ref(null)
let map = null
let ro = null
let resizeKickTimer = null

const poiQuery   = ref('')
const loading    = ref(false)
const poiMsg     = ref('')
const poiMsgType = ref('ok')
let poiMarkers   = []

const fromName   = ref('Flinders Street Station')
const toName     = ref('University of Melbourne')
const fromCoord  = ref(null)
const toCoord    = ref(null)
const routing    = ref(false)
const routeMsg   = ref('')
const routeMsgType = ref('ok')

const suggestList  = ref([])   
const suggestOpen  = ref(false)
let   debounceId   = null
const activeIndex  = ref(-1)

function waitForVisible(el, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (!el) return reject(new Error('No element'))
    const ok = () => el.offsetWidth > 0 && el.offsetHeight > 0
    if (ok()) return resolve()
    const roLocal = new ResizeObserver(() => { if (ok()) { roLocal.disconnect(); resolve() } })
    roLocal.observe(el)
    setTimeout(() => { roLocal.disconnect(); ok() ? resolve() : reject(new Error('Map container still 0×0')) }, timeoutMs)
  })
}
function ensureResize() {
  if (!map) return
  const r = map.getContainer().getBoundingClientRect()
  if (r.width > 0 && r.height > 0) map.resize()
}
function kickResize() {
  if (!map) return
  let i = 0
  const rafResize = () => { if (!map) return; map.resize(); if (++i < 6) requestAnimationFrame(rafResize) }
  requestAnimationFrame(rafResize)
  clearTimeout(resizeKickTimer)
  const bumps = [60,150,300,600,1000]; let idx=0
  const bump = () => { if (!map) return; map.resize(); if (idx < bumps.length) resizeKickTimer=setTimeout(bump, bumps[idx++]) }
  bump()
}
function clearRoute() {
  if (!map) return
  if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId)
  if (map.getSource(routeSourceId)) map.removeSource(routeSourceId)
}
function clearPois() {
  poiMarkers.forEach(m => m.remove()); poiMarkers = []
  poiMsg.value = ''
}
async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { const t = await res.text(); if (t) msg += `: ${t.slice(0,200)}` } catch {}
    throw new Error(msg)
  }
  return res.json()
}

function onQueryInput() {
  clearTimeout(debounceId)
  activeIndex.value = -1
  if (!poiQuery.value) { suggestList.value = []; suggestOpen.value = false; return }
  debounceId = setTimeout(loadSuggestions, 250)
}
async function loadSuggestions() {
  try {
    const center = map?.getCenter() ?? { lng: MELBOURNE[0], lat: MELBOURNE[1] }
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(poiQuery.value)}.json`)
    url.searchParams.set('access_token', MAPBOX_TOKEN)
    url.searchParams.set('autocomplete', 'true')
    url.searchParams.set('limit', '6')
    url.searchParams.set('types', 'poi,address,place')
    url.searchParams.set('proximity', `${center.lng},${center.lat}`)
    url.searchParams.set('country', 'AU')

    const d = await fetchJSON(url)
    suggestList.value = (d.features || []).map(f => ({
      id: f.id, name: f.text || '', full: f.place_name || '', center: f.center
    }))
    suggestOpen.value = suggestList.value.length > 0
  } catch {
    suggestList.value = []; suggestOpen.value = false
  }
}
function selectSuggestion(s) {
  poiQuery.value = s.name
  suggestOpen.value = false
  clearPois()
  const m = new mapboxgl.Marker().setLngLat(s.center).setPopup(
    new mapboxgl.Popup({ offset: 12 }).setHTML(
      `<strong>${s.name}</strong><br/><small>${s.full}</small>`
    )
  )
  m.addTo(map); poiMarkers.push(m)
  map?.flyTo({ center: s.center, zoom: 14 })
}
function highlight(delta) {
  if (!suggestOpen.value || !suggestList.value.length) return
  const n = suggestList.value.length
  activeIndex.value = ((activeIndex.value + delta) % n + n) % n
}
function enterSelect() {
  if (activeIndex.value >= 0 && activeIndex.value < suggestList.value.length) {
    selectSuggestion(suggestList.value[activeIndex.value])
  } else {
    searchNearCenter()
  }
}

const fromOpen = ref(false), toOpen = ref(false)
const fromList = ref([]),   toList = ref([])
const fromIdx  = ref(-1),   toIdx  = ref(-1)
let debounceFrom = null,    debounceTo = null

function onRouteInput(which) {
  if (which === 'from') {
    fromCoord.value = null
    clearTimeout(debounceFrom)
    fromIdx.value = -1
    if (!fromName.value) { fromList.value = []; fromOpen.value = false; return }
    debounceFrom = setTimeout(() => loadRouteSuggestions('from', fromName.value), 250)
  } else {
    toCoord.value = null
    clearTimeout(debounceTo)
    toIdx.value = -1
    if (!toName.value) { toList.value = []; toOpen.value = false; return }
    debounceTo = setTimeout(() => loadRouteSuggestions('to', toName.value), 250)
  }
}
async function loadRouteSuggestions(which, q) {
  try {
    const center = map?.getCenter() ?? { lng: MELBOURNE[0], lat: MELBOURNE[1] }
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`)
    url.searchParams.set('access_token', MAPBOX_TOKEN)
    url.searchParams.set('autocomplete', 'true')
    url.searchParams.set('limit', '6')
    url.searchParams.set('types', 'poi,address,place')
    url.searchParams.set('proximity', `${center.lng},${center.lat}`)
    url.searchParams.set('country', 'AU')

    const d = await fetchJSON(url)
    const arr = (d.features || []).map(f => ({
      id: f.id, name: f.text || '', full: f.place_name || '', center: f.center
    }))
    if (which === 'from') { fromList.value = arr; fromOpen.value = arr.length > 0 }
    else { toList.value = arr; toOpen.value = arr.length > 0 }
  } catch {
    if (which === 'from') { fromList.value = []; fromOpen.value = false }
    else { toList.value = []; toOpen.value = false }
  }
}
function selectRouteSuggestion(which, s) {
  if (which === 'from') {
    fromName.value = s.full
    fromCoord.value = s.center
    fromOpen.value = false
  } else {
    toName.value = s.full
    toCoord.value = s.center
    toOpen.value = false
  }
}
function routeHighlight(which, delta) {
  if (which === 'from') {
    if (!fromOpen.value || !fromList.value.length) return
    const n = fromList.value.length
    fromIdx.value = ((fromIdx.value + delta) % n + n) % n
  } else {
    if (!toOpen.value || !toList.value.length) return
    const n = toList.value.length
    toIdx.value = ((toIdx.value + delta) % n + n) % n
  }
}
function routeEnter(which) {
  if (which === 'from' && fromIdx.value >= 0) {
    selectRouteSuggestion('from', fromList.value[fromIdx.value])
  } else if (which === 'to' && toIdx.value >= 0) {
    selectRouteSuggestion('to', toList.value[toIdx.value])
  } else {
    drawRoute()
  }
}

function onClickOutside(e) {
  const withinTop  = document.querySelector('.top-ta')?.contains(e.target)
  const withinFrom = document.querySelector('.from-ta')?.contains(e.target)
  const withinTo   = document.querySelector('.to-ta')?.contains(e.target)
  if (!withinTop)  suggestOpen.value = false
  if (!withinFrom) fromOpen.value = false
  if (!withinTo)   toOpen.value = false
}

async function geocodeOne(name) {
  if (!MAPBOX_TOKEN) throw new Error('Missing Mapbox token')
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(name)}.json`)
  url.searchParams.set('access_token', MAPBOX_TOKEN)
  url.searchParams.set('limit', '1')
  url.searchParams.set('country', 'AU')
  url.searchParams.set('proximity', `${MELBOURNE[0]},${MELBOURNE[1]}`)
  const d = await fetchJSON(url)
  const center = d.features?.[0]?.center
  if (!center) throw new Error(`No result found for "${name}"`)
  return center
}

async function searchNearCenter() {
  if (!map) return
  loading.value = true
  poiMsg.value = ''
  try {
    const center = map.getCenter()
    const q = poiQuery.value || 'place'
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`)
    url.searchParams.set('access_token', MAPBOX_TOKEN)
    url.searchParams.set('proximity', `${center.lng},${center.lat}`)
    url.searchParams.set('types', 'poi,address,place')
    url.searchParams.set('limit', '10')
    url.searchParams.set('country', 'AU')

    const data = await fetchJSON(url)
    let feats = data.features || []
    if (feats.length === 0) { 
      url.searchParams.delete('types')
      const data2 = await fetchJSON(url)
      feats = data2.features || []
    }

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
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 48, duration: 500 })

    poiMsg.value = `Found ${feats.length} result(s).`
    poiMsgType.value = 'ok'
  } catch (e) {
    console.error('searchNearCenter error:', e)
    poiMsg.value = `Search failed: ${e.message || e}`
    poiMsgType.value = 'error'
  } finally {
    loading.value = false
  }
}

async function fetchDirections(profile, from, to) {
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${from[0]},${from[1]};${to[0]},${to[1]}`)
  url.searchParams.set('geometries', 'geojson')
  url.searchParams.set('overview', 'full')
  url.searchParams.set('access_token', MAPBOX_TOKEN)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Directions failed (${res.status}) ${await res.text().catch(()=> '')}`)
  return res.json()
}

async function drawRoute() {
  if (!map) return
  routing.value = true
  routeMsg.value = ''
  try {
    clearRoute()

    const from = fromCoord.value || await geocodeOne(fromName.value)
    const to   = toCoord.value   || await geocodeOne(toName.value)

    let data
    try { data = await fetchDirections('driving', from, to) }
    catch (e1) {
      try { data = await fetchDirections('driving-traffic', from, to) }
      catch (e2) { throw e1 }
    }

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
    map.fitBounds(bounds, { padding: 54, duration: 600 })

    routeMsg.value = 'Route drawn successfully.'
    routeMsgType.value = 'ok'
  } catch (e) {
    console.error('drawRoute error:', e)
    routeMsg.value = e?.message || String(e)
    routeMsgType.value = 'error'
  } finally {
    routing.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', onClickOutside)
  await nextTick()
  await waitForVisible(mapEl.value).catch(() => {})

  if (!MAPBOX_TOKEN) {
    console.error('VITE_MAPBOX_TOKEN is missing.')
    routeMsg.value = 'Map token missing. Please set VITE_MAPBOX_TOKEN and restart.'
    routeMsgType.value = 'error'
    return
  }

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
  document.removeEventListener('click', onClickOutside)
  window.removeEventListener('resize', ensureResize)
  ro?.disconnect()
  clearTimeout(resizeKickTimer)
  map?.remove()
  map = null
})
</script>

<style scoped>
.geo-page { min-height: calc(100vh - 64px); background: #f5f7fb; padding: 16px; }
.geo-wrap  { max-width: 1400px; margin: 0 auto; padding: 0 16px; }
.back-link { display: inline-block; margin-bottom: 12px; color: #2563eb; text-decoration: none; }

.map-wrap {
  position: relative;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,.06);
  overflow: hidden;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.search-fab {
  position: absolute;
  z-index: 10;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: min(1200px, calc(100% - 32px));
}
.fab-inner {
  backdrop-filter: blur(6px);
  background: rgba(255,255,255,.92);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 6px 20px rgba(0,0,0,.08);
}
.fab-inner .form-control { height: 48px; font-size: 16px; padding: 10px 12px; }

.typeahead { position: relative; }
.suggest {
  position: absolute; top: 100%; left: 0; right: 0;
  margin-top: 6px; background: #fff; border: 1px solid #e5e7eb;
  border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.08);
  max-height: 320px; overflow: auto; z-index: 25;
}
.card .typeahead .suggest { z-index: 30; } /* 路由区层级更高，避免被盖住 */

.suggest li { list-style: none; padding: 10px 12px; cursor: pointer; }
.suggest li:hover, .suggest li.active { background: #eff6ff; }
.s-title { font-weight: 600; }
.s-sub   { color: #6b7280; font-size: 12px; margin-top: 2px; }

.fab-actions { display: flex; gap: 12px; margin-top: 10px; }
.fab-actions .btn {
  flex: 1 1 0;
  min-width: 240px;
  height: 48px;
  font-size: 16px;
  white-space: nowrap;
  padding: 10px 16px;
}

.map { width: 100%; height: 75vh; min-height: 560px; }

.card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
  padding: 16px; box-shadow: 0 8px 24px rgba(0,0,0,.06);
  width: 100%; max-width: 1200px; margin: 16px auto 0;
}
.card .form-control { height: 48px; font-size: 16px; padding: 10px 12px; }
.card .btn { height: 48px; font-size: 16px; }

.mt-1 { margin-top: .25rem; }
.mt-3 { margin-top: 1rem; }
.mb-0 { margin-bottom: 0; }
.mb-2 { margin-bottom: .5rem; }

.text-success { color: #16a34a; }
.text-danger  { color: #dc2626; }

@media (max-width: 768px) {
  .search-fab { width: calc(100% - 16px); }
  .fab-actions .btn { min-width: 0; }
  .map { height: 60vh; min-height: 420px; }
}
</style>
