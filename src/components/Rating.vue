<template>
  <div class="rating-card card p-3">
    <h4 class="mb-3">Rate & Review</h4>

    <div class="d-flex align-items-center gap-3 mb-2">
      <div class="stars">
        <span
          v-for="n in 5"
          :key="n"
          class="star"
          :class="{ active: n <= (hoverRating || currentRating) }"
          @mouseover="hoverRating = n"
          @mouseleave="hoverRating = 0"
          @click="setRating(n)"
          title="Click to rate"
        >
          ★
        </span>
      </div>

      <span v-if="currentRating" class="badge bg-primary">
        {{ currentRating }} / 5
      </span>
    </div>

    <textarea
      v-model.trim="comment"
      class="form-control mb-2"
      rows="3"
      placeholder="Optional: tell us more about your experience..."
      @input="commentTouched = true"
    ></textarea>
    <small class="text-muted">Max 200 characters.</small>

    <div class="d-flex align-items-center gap-2 mb-3">
      <button
        class="btn btn-primary"
        :disabled="submitting || !currentRating"
        @click="submitReview"
      >
        {{ submitting ? 'Saving...' : (isEditing ? 'Update Review' : 'Submit Review') }}
      </button>

      <small class="text-muted" v-if="!auth.user">Please login to submit a review.</small>
      <small class="text-success" v-if="savedOnce">Saved!</small>
    </div>

    <div v-if="hasRated" class="summary mb-3">
      <div class="d-flex align-items-center gap-3 flex-wrap">
        <div><b>Average:</b> {{ average.toFixed(1) }} / 5</div>
        <div><b>Votes:</b> {{ count }}</div>
      </div>
    </div>
<div class="mt-3">
      <button class="btn btn-outline-success me-2" @click="exportRatingsCSV">export rating CSV</button>
      <button class="btn btn-outline-dark" @click="exportRatingsPDF">export rating PDF</button>
    </div>
    <div class="reviews">
      <h5 class="mb-2">Recent Reviews</h5>
      <p class="text-muted" v-if="reviews.length === 0">No reviews yet. Be the first!</p>

      <ul class="list-unstyled mb-2" v-else>
        <li v-for="r in visibleReviews" :key="r.userId" class="review-item">
          <div class="d-flex align-items-center justify-content-between mb-1">
            <div class="d-flex align-items-center gap-2">
              <span class="reviewer">{{ displayName(r) }}</span>
              <span class="stars tiny">
                <span
                  v-for="s in 5"
                  :key="s"
                  class="star"
                  :class="{ active: s <= r.score }"
                >★</span>
              </span>
            </div>
            <small class="text-muted">{{ formatTime(r.ts) }}</small>
          </div>
          <p class="mb-0 text-body" v-safe-html="formatComment(r.comment)"></p>
          <hr class="my-2" />
        </li>
      </ul>

      <div v-if="reviews.length > pageSize" class="text-center">
        <button class="btn btn-outline-secondary btn-sm" @click="showMore">
          Show more
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '../stores/auth'

const LS_REVIEWS = 'app_reviews_v1' 

const auth = useAuthStore()
const reviews = ref([])   
const currentRating = ref(0)
const hoverRating = ref(0)
const comment = ref('')
const commentTouched = ref(false)
const submitting = ref(false)
const savedOnce = ref(false)
const pageSize = ref(10)

function loadReviews() {
  try {
    const data = JSON.parse(localStorage.getItem(LS_REVIEWS))
    reviews.value = Array.isArray(data) ? data.filter(x => Number.isFinite(x.score)) : []
  } catch {
    reviews.value = []
  }
  if (auth.user) {
    const mine = reviews.value.find(r => r.userId === auth.user.id)
    if (mine) {
      currentRating.value = mine.score
      comment.value = mine.comment || ''
    }
  }
}

function saveReviews() {
  localStorage.setItem(LS_REVIEWS, JSON.stringify(reviews.value))
}

const count = computed(() => reviews.value.length)
const average = computed(() => {
  if (reviews.value.length === 0) return 0
  const sum = reviews.value.reduce((a, r) => a + (r.score || 0), 0)
  return sum / reviews.value.length
})
const hasRated = computed(() => !!currentRating.value)

const sorted = computed(() => [...reviews.value].sort((a, b) => b.ts - a.ts))
const visibleReviews = computed(() => sorted.value.slice(0, pageSize.value))
const isEditing = computed(() => !!(auth.user && reviews.value.find(r => r.userId === auth.user.id)))
const me = {
  userId: auth.user.id,
  name: auth.user.name || 'User',
  score: currentRating.value,
  comment: (comment.value || '').slice(0, 500), 
  ts: Date.now()
}

function setRating(n) {
  if (!auth.user) {
    alert('Please login to rate & review.')
    return
  }
  currentRating.value = n
  savedOnce.value = false
}

function formatComment(text) {
  const t = String(text ?? '').slice(0, 200)  
  return t.replace(/\n/g, '<br>')
}

async function submitReview() {
  if (!auth.user) {
    alert('Please login to rate & review.')
    return
  }
  if (!currentRating.value) return

  submitting.value = true
  try {
    const now = Date.now()
    const me = {
      userId: auth.user.id,
      name: auth.user.name || 'User',
      score: currentRating.value,
      comment: comment.value || '',
      ts: now
    }
    const idx = reviews.value.findIndex(r => r.userId === me.userId)
    if (idx >= 0) {
      reviews.value[idx] = me     
    } else {
      reviews.value.push(me)
    }
    saveReviews()
    savedOnce.value = true
  } finally {
    submitting.value = false
  }
}

function showMore() {
  pageSize.value += 10
}

function displayName(r) {
  if (!r?.name) return 'Anonymous'
  if (auth.user && r.userId === auth.user.id) return `${r.name} (you)`
  return `${r.name[0] || 'U'}***`
}

function formatTime(ts) {
  try {
    const d = new Date(ts)
    return d.toLocaleString()
  } catch { return '' }
}

function onStorage(e) {
  if (e.key === LS_REVIEWS) loadReviews()
}

onMounted(() => {
  loadReviews()
  window.addEventListener('storage', onStorage)
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', onStorage)
})
</script>

<style scoped>
.rating-card { border: 1px solid #e5e7eb; border-radius: 12px; }
.stars {
  display: inline-flex;
  gap: 6px;
  font-size: 28px;
  line-height: 1;
  user-select: none;
}
.star { cursor: pointer; color: #d1d5db; transition: color .15s; }
.star.active, .star:hover { color: #fbbf24; }
.badge { font-size: 0.85rem; }
.review-item { padding: 6px 0; }
.tiny { font-size: 14px; }
</style>
