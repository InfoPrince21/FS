// src/features/players/playersAPI.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Import your Supabase client instance.
// Ensure your supabase client is initialized and exported from this path.
import { CONFIG } from 'src/global-config';

import { supabase } from '../../lib/supabase'; // Corrected relative path


export const playersApi = createApi({
  reducerPath: 'playersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${CONFIG.supabase.url}/rest/v1/`,
    // prepareHeaders must be async because we're awaiting the session
    prepareHeaders: async (headers, { getState }) => {
      // Get the current user session from the Supabase client
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Determine which token to use for the Authorization header:
      // - If a user is logged in, use their session's access_token.
      // - Otherwise (for unauthenticated requests, like initial login/signup forms),
      //   fall back to the public/anon key from CONFIG.supabase.key.
      const token = session?.access_token || CONFIG.supabase.key;

      // The 'apikey' header should always be your project's public key (anon key)
      headers.set('apikey', CONFIG.supabase.key);
      // The 'Authorization' header identifies the user's role to RLS policies
      headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  // Define a tag type for players, useful for caching and invalidation
  tagTypes: ['Players'],
  endpoints: (builder) => ({
    // Query to fetch all players for a specific company
    getPlayers: builder.query({
      query: (company) => `profiles?select=*&company=eq.${encodeURIComponent(company)}`,
      providesTags: ['Players'], // Invalidate list of players
    }),
    // Query to fetch a single player by their ID
    getPlayer: builder.query({
      query: (id) => `profiles?id=eq.${id}&select=*`,
      providesTags: (result, error, id) => [{ type: 'Players', id }], // Invalidate specific player by ID
    }),
    // Mutation to create a new player (inserts into 'profiles' table)
    createPlayer: builder.mutation({
      query: (newPlayer) => ({
        url: 'profiles', // Targets the 'profiles' table directly via Supabase PostgREST API
        method: 'POST',
        body: newPlayer,
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation', // Ensures the created row is returned in the response
        },
      }),
      invalidatesTags: ['Players'], // Invalidate the entire players list after creation
    }),
    // Mutation to update an existing player's profile
    updatePlayer: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `profiles?id=eq.${id}`, // Targets the specific player by ID for update
        method: 'PATCH', // PATCH method for partial updates
        body: patch,
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation', // Ensures the updated row is returned
        },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Players', id }], // Invalidate specific player after update
    }),
  }),
});

// Export the hooks for use in your React components
export const {
  useGetPlayersQuery,
  useCreatePlayerMutation,
  useUpdatePlayerMutation,
  useGetPlayerQuery,
} = playersApi;
