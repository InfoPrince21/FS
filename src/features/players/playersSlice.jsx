// src/features/players/playersSlice.jsx
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { playersApi } from 'src/features/players/playersAPI'; // Adjust path if needed

export const fetchPlayers = createAsyncThunk(
  'players/fetchPlayers',
  async (company, { dispatch }) => {
    // 👈 Accept 'company' as the first argument
    console.log('fetchPlayers thunk dispatched with company:', company); // Log when the thunk starts
    try {
      const result = await dispatch(playersApi.endpoints.getPlayers.initiate(company)); // Pass 'company' to initiate
      if (result.error) {
        throw result.error; // Throw the error to be caught by the rejected case
      }
      console.log('fetchPlayers thunk successful', result.data); // Log successful data
      return result.data; // Return the successful data
    } catch (error) {
      console.error('fetchPlayers thunk failed', error); // Log the error
      throw error; // Re-throw the error to be handled by the rejected case
    }
  }
);

const initialState = {
  players: [],
  loading: false,
  error: null,
};

const playersSlice = createSlice({
  name: 'players', // Ensure this matches the key in your store
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlayers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlayers.fulfilled, (state, action) => {
        state.loading = false;
        state.players = action.payload;
        console.log('fetchPlayers.fulfilled - action.payload:', action.payload); // Log the payload in the reducer
      })
      .addCase(fetchPlayers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        console.error('fetchPlayers.rejected - action.error:', action.error); // Log the error in the reducer
      });
  },
});

// Export actions (none needed for this simple fetch)

// Export selectors
export const selectPlayers = (state) => state.players.players;
export const selectPlayersLoading = (state) => state.players.loading;
export const selectPlayersError = (state) => state.players.error;

export default playersSlice.reducer;
