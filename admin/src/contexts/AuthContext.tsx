import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../firebase/config'

interface AuthContextValue {
  /** Current Firebase user, null if not authenticated */
  user: User | null
  /** True while Firebase Auth is resolving initial state */
  loading: boolean
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<void>
  /** Sign out and clean up listeners */
  signOut: () => Promise<void>
  /** Register a cleanup function (e.g., Firestore listener unsubscribe) */
  registerCleanup: (fn: () => void) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const cleanupFns = useRef<Set<() => void>>(new Set())

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }, [])

  const signOut = useCallback(async () => {
    // Call all registered cleanup functions before signing out
    for (const fn of cleanupFns.current) {
      fn()
    }
    cleanupFns.current.clear()
    await firebaseSignOut(auth)
  }, [])

  const registerCleanup = useCallback((fn: () => void) => {
    cleanupFns.current.add(fn)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, registerCleanup }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
