// src/auth/hooks/use-auth-context.js
import { useContext } from 'react';

// CORRECTED PATH: Point to your Supabase-specific AuthContext
import { AuthContext } from '../context/supabase/auth-provider'; // or just '../context/supabase' if AuthContext is re-exported from index.js

// ----------------------------------------------------------------------

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext: Context must be used inside AuthProvider');
  }

  return context;
}
