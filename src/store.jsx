// src/app/store.js
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { teamsApi } from 'src/features/teams/teamsAPI';
import { gamesApi } from 'src/features/games/gamesAPI';
import { statsApi } from 'src/features/stats/statsAPI'; 
import { playersApi } from 'src/features/players/playersAPI';
import playersReducer from 'src/features/players/playersSlice';
import { organizationsApi } from 'src/features/organizations/organizationsAPI';
import organizationsSlice from 'src/features/organizations/organizationsSlice';

export const store = configureStore({
  reducer: {
    [playersApi.reducerPath]: playersApi.reducer,
    [organizationsApi.reducerPath]: organizationsApi.reducer,
    [gamesApi.reducerPath]: gamesApi.reducer,
    [teamsApi.reducerPath]: teamsApi.reducer,
    [statsApi.reducerPath]: statsApi.reducer, 
    players: playersReducer,
    organizations: organizationsSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(playersApi.middleware)
      .concat(organizationsApi.middleware)
      .concat(gamesApi.middleware)
      .concat(teamsApi.middleware)
      .concat(statsApi.middleware), // Add the statsApi middleware here
});

setupListeners(store.dispatch);
