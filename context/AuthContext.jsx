'use client';

import { createContext, useContext, useState, useEffect } from 'react'
import { hasSupabaseConfig, supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const isConfigured = hasSupabaseConfig()
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(isConfigured)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profile, setProfile] = useState(null)

  const checkAdmin = async (u) => {
    if (!u || !hasSupabaseConfig()) { setIsAdmin(false); return }
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', u.id)
      .maybeSingle()
    setIsAdmin(data?.role === 'admin')
  }

  const refreshProfile = async (u = user) => {
    if (!u || !hasSupabaseConfig()) {
      setProfile(null)
      return null
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .maybeSingle()
    if (error) throw error
    const nextProfile = data || {}
    setProfile(nextProfile)
    return nextProfile
  }

  useEffect(() => {
    let mounted = true

    if (!isConfigured) {
      return () => { mounted = false }
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return
        const u = session?.user ?? null
        setUser(u)
        return Promise.allSettled([checkAdmin(u), refreshProfile(u)])
      })
      .catch((error) => {
        console.error("Supabase session load failed:", error)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      checkAdmin(u)
      refreshProfile(u).catch(() => {})
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [isConfigured])

  const signOut = async () => {
    if (!hasSupabaseConfig()) {
      setUser(null)
      setIsAdmin(false)
      setProfile(null)
      return
    }
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signOut, profile, refreshProfile, setProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
