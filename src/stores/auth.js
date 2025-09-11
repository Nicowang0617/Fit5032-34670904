import { defineStore } from 'pinia'

const LS_USERS = 'app_users_v1'
const LS_CURRENT = 'app_current_user_v1'

const load = (k, defVal) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? defVal } catch { return defVal }
}
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v))

async function sha256(text) {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    users: load(LS_USERS, []),     
    user: load(LS_CURRENT, null),   
  }),

  getters: {
    isAuthenticated: (s) => !!s.user,
    isAdmin: (s) => s.user?.role === 'admin', 
  },

  actions: {
    async ensureAdmin() {
      const exists = this.users.find(u => u.email === 'admin@example.com')
      if (!exists) {
        const hashed = await sha256('admin123!')
        this.users.push({
          id: crypto.randomUUID(),
          name: 'Admin',
          email: 'admin@example.com',
          password: hashed,
          role: 'admin',
        })
        save(LS_USERS, this.users)
      }
    },

    async register({ name, email, password }) {
      if (!name || name.trim().length < 2) throw new Error('Name must be at least 2 characters')

      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRe.test(email)) throw new Error('Invalid email format')

      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
        throw new Error('Password must be ≥8 chars and include letters & digits')
      }

      const norm = (email || '').toLowerCase()
      if (this.users.find(u => u.email === norm)) throw new Error('Email already registered')

      const hashed = await sha256(password)
      const nu = {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: norm,
        password: hashed,
        role: 'user',
      }

      this.users.push(nu)
      save(LS_USERS, this.users)

    },

    async login({ email, password }) {
      const norm = (email || '').toLowerCase()
      const hashed = await sha256(password || '')
      const u = this.users.find(x => x.email === norm && x.password === hashed)
      if (!u) throw new Error('Invalid email or password')

      this.user = { id: u.id, name: u.name, email: u.email, role: u.role }
      save(LS_CURRENT, this.user)
    },

    logout() {
      this.user = null
      localStorage.removeItem(LS_CURRENT)
    },
  },
})