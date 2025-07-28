import { paths } from 'src/routes/paths';

import { supabase } from 'src/lib/supabase';

/** **************************************
 * Sign in
 *************************************** */

// ----------------------------------------------------------------------

export const signInWithPassword = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(error);
    throw error;
  }

  return { data, error };
};

/** **************************************
 * Sign up
 *************************************** */

// ----------------------------------------------------------------------

// Update the parameters to expect snake_case (matching your frontend form now)
export const signUp = async ({ email, password, first_name, last_name }) => {
  // Keep parameters for consistency with caller
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}${paths.dashboard.root}`,
      // TEMPORARY: Send an EMPTY data object to raw_user_meta_data
      // This will ensure no 'first_name', 'last_name', or 'display_name' keys are present.
      data: {
        /* empty */
      },
    },
  });

  if (error) {
    console.error(error);
    throw error;
  }

  if (!data?.user?.identities?.length) {
    throw new Error('This user already exists');
  }

  return { data, error };
};

/** **************************************
 * Sign out
 *************************************** */

// ----------------------------------------------------------------------

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error(error);
    throw error;
  }

  return { error };
};

/** **************************************
 * Reset password
 **************************************** */

// ----------------------------------------------------------------------

export const resetPassword = async ({ email }) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${paths.auth.supabase.updatePassword}`,
  });

  if (error) {
    console.error(error);
    throw error;
  }

  return { data, error };
};

/** **************************************
 * Update password
 *************************************** */

// ----------------------------------------------------------------------

export const updatePassword = async ({ password }) => {
  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error(error);
    throw error;
  }

  return { data, error };
};
