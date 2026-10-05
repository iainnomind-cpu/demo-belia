import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AuthUser, UserRole } from '../types/database';
import type { Session } from '@supabase/supabase-js';

interface UseAuthReturn {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  /** returnTo: path to land on after the provider redirects back (defaults to the current page) */
  signInWithOAuth: (provider: 'google' | 'facebook', returnTo?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(buildAuthUser(session));
      }
      setLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser(buildAuthUser(session));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signInWithOAuth = async (
    provider: 'google' | 'facebook',
    returnTo: string = window.location.pathname + window.location.search,
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      // The URL must be allowed in Supabase → Authentication → URL Configuration → Redirect URLs
      options: { redirectTo: window.location.origin + returnTo },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signIn, signUp, signInWithOAuth, signOut };
}

function buildAuthUser(session: Session): AuthUser {
  // app_metadata can only be changed server-side; user_metadata is editable by the user
  // and must never decide permissions.
  const role = (session.user.app_metadata?.role as UserRole) ?? 'cliente';
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    role,
  };
}
