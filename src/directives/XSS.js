import DOMPurify from 'dompurify'

const OPTIONS = {
  ALLOWED_TAGS: ['b', 'i', 'br'],
  ALLOWED_ATTR: []
}

export default {
  mounted(el, binding) {
    el.innerHTML = DOMPurify.sanitize(String(binding.value ?? ''), OPTIONS)
  },
  updated(el, binding) {
    el.innerHTML = DOMPurify.sanitize(String(binding.value ?? ''), OPTIONS)
  }
}