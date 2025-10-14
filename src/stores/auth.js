import { defineStore } from 'pinia'
import { auth, db } from '@/Firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore'

const LS_ATTEMPTS = 'app_login_attempts_v1'
const load = (k, defVal) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? defVal } catch { return defVal }
}
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v))

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,             
    ready: false,               
    attempts: load(LS_ATTEMPTS, {}), 
  }),

  getters: {
    isAuthenticated: (s) => !!s.user,
    isAdmin: (s) => s.user?.role === 'admin',
  },

  actions: {

    init() {
      if (this.ready) return
      onAuthStateChanged(auth, async (u) => {
        if (u) {
          const role = await this._getRole(u.uid)
          this.user = {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            role: role || 'user',
          }

          await this.ensureAdmin()
        } else {
          this.user = null
        }
        this.ready = true
      })
    },

    async register({ name, email, password }) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRe.test(email)) throw new Error('Invalid email format')
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
        throw new Error('Password must be ≥8 chars and include letters & digits')
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password)
      if (name?.trim()) await updateProfile(cred.user, { displayName: name.trim() })

      await setDoc(doc(db, 'profiles', cred.user.uid), {
        email: cred.user.email,
        displayName: name?.trim() || cred.user.displayName || '',
        role: 'user',
        createdAt: serverTimestamp(),
      })

      this.user = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: name?.trim() || cred.user.displayName,
        role: 'user',
      }
    },

    async login({ email, password }) {
      const norm = (email || '').toLowerCase()
      const now = Date.now()

      const attempt = this.attempts[norm]
      if (attempt?.lockedUntil && now < attempt.lockedUntil) {
        const waitMin = Math.ceil((attempt.lockedUntil - now) / 1000 / 60)
        throw new Error(`Too many failed attempts. Please wait ${waitMin} min.`)
      }

      try {
        const cred = await signInWithEmailAndPassword(auth, email, password)

        if (this.attempts[norm]) {
          const { [norm]: _, ...rest } = this.attempts
          this.attempts = rest
          save(LS_ATTEMPTS, this.attempts)
        }

        const role = await this._getRole(cred.user.uid)
        this.user = {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName,
          role: role || 'user',
        }

        await this.ensureAdmin()
      } catch (err) {
        const entry = this.attempts[norm] || { count: 0, lockedUntil: 0 }
        entry.count += 1
        if (entry.count >= 5) {
          entry.lockedUntil = now + 10 * 60 * 1000 
          entry.count = 0
        }
        this.attempts = { ...this.attempts, [norm]: entry }
        save(LS_ATTEMPTS, this.attempts)
        throw new Error('Invalid email or password')
      }
    },

    async logout() {
      await signOut(auth)
      this.user = null
    },


    async ensureAdmin() {
      if (!this.user?.email) return
      if (this.user.email.toLowerCase() !== 'admin@example.com') return

      const ref = doc(db, 'profiles', this.user.uid)
      const snap = await getDoc(ref)
      if (!snap.exists()) return

      const data = snap.data() || {}
      if (data.role !== 'admin') {
        await setDoc(ref, { ...data, role: 'admin', updatedAt: serverTimestamp() }, { merge: true })
        this.user = { ...this.user, role: 'admin' }
      }
    },

    async _getRole(uid) {
      if (!uid) return 'user'
      const ref = doc(db, 'profiles', uid)
      const snap = await getDoc(ref)
      return snap.exists() ? (snap.data().role || 'user') : 'user'
    },
  },
})
