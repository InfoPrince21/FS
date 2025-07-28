// src/features/games/gamesSlice.jsx
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { supabase } from 'src/lib/supabase'; // Assuming this path is correct for your supabase client

// Async thunk to fetch games
export const fetchGames = createAsyncThunk('games/fetchGames', async (_, { rejectWithValue }) => {
  try {
    // Fetch all columns from the 'games' table
    const { data, error } = await supabase.from('games').select('*');
    if (error) {
      throw error;
    }
    return data;
  } catch (err) {
    // Return a readable error message
    return rejectWithValue(err.message || 'Failed to fetch games');
  }
});

const gamesSlice = createSlice({
  name: 'games', // The name of your slice
  initialState: {
    list: [], // Renamed from 'games' to 'list' for clarity if you have other game-related state
    loading: false,
    error: null,
  },
  reducers: {
    // Add any synchronous reducers here if needed (e.g., setGameFilter)
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGames.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGames.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload; // Assign fetched games to 'list'
        state.error = null;
      })
      .addCase(fetchGames.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload; // The error message from rejectWithValue
        state.list = []; // Clear games on error
      });
  },
});

export const { reducer: gamesReducer } = gamesSlice;
