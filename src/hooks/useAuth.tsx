import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const handleUserSignIn = async (authUser: User) => {
    // Create or update user profile
    await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        username: authUser.email?.split('@')[0] || 'User',
        is_online: true,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });
  };

  const handleUserSignOut = async (userId?: string) => {
    if (userId || user) {
      // Set user offline
      await supabase
        .from('profiles')
        .update({
          is_online: false,
          last_seen: new Date().toISOString(),
        })
        .eq('id', userId || user!.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle profile creation and online status
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(() => {
            handleUserSignIn(session.user);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setTimeout(() => {
            handleUserSignOut();
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        handleUserSignIn(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    if (user) {
      await handleUserSignOut(user.id);
    }
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };
};