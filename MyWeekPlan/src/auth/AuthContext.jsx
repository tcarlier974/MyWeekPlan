import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return undefined

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession)
      setIsAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo(() => ({
    user: session?.user ?? null,
    isAuthLoading,
    signInWithGoogle: () => supabase?.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    }),
    signOut: () => supabase?.auth.signOut(),
  }), [session, isAuthLoading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
