// src/auth/context/supabase/auth-provider.js
import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback, createContext, useContext } from 'react'; // ADD createContext, useContext

import axios from 'src/lib/axios';
import { supabase } from 'src/lib/supabase';

// Define and export AuthContext here (most common pattern)
export const AuthContext = createContext(null);

// Define and export the custom hook
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// ----------------------------------------------------------------------

export function AuthProvider({ children }) {
  const { state, setState } = useSetState({ user: null, loading: true });

  const checkUserSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        setState({ user: null, loading: false });
        console.error(error);
        throw error;
      }

      if (session) {
        const accessToken = session?.access_token;

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error(profileError);
          throw profileError;
        }
        console.log('Profile data:', profileData);
        setState({
          user: {
            ...session.user,
            ...profileData,
            accessToken,
            photoURL: profileData.photo_url,
            company: profileData.company,
          },
          loading: false,
        });

        axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      } else {
        setState({ user: null, loading: false });
        delete axios.defaults.headers.common.Authorization;
      }
    } catch (error) {
      console.error(error);
      setState({ user: null, loading: false });
    }
  }, [setState]);

  useEffect(() => {
    checkUserSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user
        ? {
            id: state.user?.id,
            accessToken: state.user?.access_token,
            displayName: state.user?.display_name || state.user?.user_metadata?.display_name,
            role: state.user?.role ?? 'admin',
            profile: state.user,
            company: state.user?.company,
          }
        : null,
      checkUserSession,
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
    }),
    [checkUserSession, state.user, status]
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}
