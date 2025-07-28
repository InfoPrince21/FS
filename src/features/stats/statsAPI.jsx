// src/features/stats/statsAPI.js

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { CONFIG } from 'src/global-config';
import { supabase } from 'src/lib/supabase';

// Helper function to convert snake_case to camelCase for KPI objects
const transformKpiData = (kpi) => {
  if (!kpi) return null;
  return {
    ...kpi,
    iconName: kpi.icon_name, // Map icon_name to iconName
  };
};

export const statsApi = createApi({
  reducerPath: 'statsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${CONFIG.supabase.url}/rest/v1/`,
    prepareHeaders: async (headers) => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('DEBUG_API_HEADERS: Error getting session:', sessionError); // Don't throw, allow fallback to anon key
        }

        if (session?.access_token) {
          headers.set('Authorization', `Bearer ${session.access_token}`);
          console.log('DEBUG_API_HEADERS: Using session access token.');
        } else {
          // Fallback to anon key if no session (e.g., public data or RLS handled by policy)
          headers.set('Authorization', `Bearer ${CONFIG.supabase.key}`);
          console.log('DEBUG_API_HEADERS: Using anon key (no session or session error).');
        }
        headers.set('apikey', CONFIG.supabase.key);
        headers.set('Content-Type', 'application/json');
        headers.set('Prefer', 'return=representation');
      } catch (error) {
        console.error('DEBUG_API_HEADERS: Error in prepareHeaders:', error); // Ensure headers are still set to prevent further errors, even if auth failed
        headers.set('Authorization', `Bearer ${CONFIG.supabase.key}`);
        headers.set('apikey', CONFIG.supabase.key);
        headers.set('Content-Type', 'application/json');
        headers.set('Prefer', 'return=representation');
      }
      return headers;
    },
  }),
  tagTypes: [
    'KPIs',
    'PlayerStats',
    'GameKPIs',
    'Games',
    'Profiles',
    'Teams',
    'DashboardStats',
    'Achievements',
  ], // ADDED 'Achievements' tag type
  endpoints: (builder) => ({
    // --- KPI Endpoints ---
    getKpis: builder.query({
      query: () => `kpis?select=id,name,description,points,icon_name`,
      providesTags: ['KPIs'],
      transformResponse: (response) => response.map(transformKpiData),
    }),
    getKpiById: builder.query({
      query: (id) => `kpis?id=eq.${id}&select=id,name,description,points,icon_name`,
      providesTags: (result, error, id) => [{ type: 'KPIs', id }],
      transformResponse: (response) => {
        if (Array.isArray(response) && response.length > 0) {
          return transformKpiData(response[0]);
        }
        return null;
      },
    }),
    createKpi: builder.mutation({
      query: (newKpiData) => ({
        url: 'kpis',
        method: 'POST',
        body: {
          name: newKpiData.name,
          description: newKpiData.description,
          points: newKpiData.points ? parseInt(newKpiData.points, 10) : null,
          icon_name: newKpiData.iconName || null,
        },
      }),
      invalidatesTags: ['KPIs'],
    }),
    updateKpi: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `kpis?id=eq.${id}`,
        method: 'PATCH',
        body: {
          name: patch.name,
          description: patch.description,
          points: patch.points ? parseInt(patch.points, 10) : null,
          icon_name: patch.iconName || null,
        },
      }),
      invalidatesTags: (result, error, { id }) => ['KPIs', { type: 'KPIs', id }],
    }),
    deleteKpi: builder.mutation({
      query: (id) => ({
        url: `kpis?id=eq.${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => ['KPIs', { type: 'KPIs', id }],
    }),
    getGameKpisByGameId: builder.query({
      query: (gameId) =>
        `game_kpis?game_id=eq.${gameId}&select=kpis(id,name,description,points,icon_name)`,
      providesTags: (result, error, gameId) => [{ type: 'GameKPIs', id: gameId }],
      transformResponse: (response) => response.map((item) => transformKpiData(item.kpis)),
    }), // --- Player Stats Endpoints ---

    getPlayerStats: builder.query({
      // This endpoint remains as is, providing raw player_stats for other potential uses
      query: ({ gameId, playerId, kpiId, teamId, startDate, endDate }) => {
        let queryString = `player_stats?select=id,value,date_recorded,game_id,player_id,kpi_id,team_id`;
        queryString += `&order=date_recorded.desc`; // Add ordering

        if (gameId) queryString += `&game_id=eq.${gameId}`;
        if (playerId) queryString += `&player_id=eq.${playerId}`;
        if (kpiId) queryString += `&kpi_id=eq.${kpiId}`;
        if (teamId) queryString += `&team_id=eq.${teamId}`;
        if (startDate) queryString += `&date_recorded=gte.${startDate}`;
        if (endDate) queryString += `&date_recorded=lte.${endDate}`;

        console.log('DEBUG_API: Constructed player_stats queryString:', queryString);
        return queryString;
      },
      providesTags: ['PlayerStats'],
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          console.log('DEBUG_API: player_stats query successful. Data:', data);
          if (!Array.isArray(data)) {
            console.error(
              'DEBUG_API: player_stats data is NOT an array after successful query:',
              data
            );
          }
        } catch (error) {
          console.error('DEBUG_API: player_stats query FAILED. Error:', error);
          if (error.status === 'FETCH_ERROR') {
            console.error('DEBUG_API: Network/Fetch Error details:', error.error);
          } else if (error.data) {
            console.error('DEBUG_API: API Error Response Data:', error.data);
          }
        }
      },
    }),

    getAllPlayerStats: builder.query({
      query: () =>
        `player_stats?select=*,profiles(id,first_name,last_name,display_name),kpis(name,description,points,icon_name)`,
      providesTags: ['PlayerStats'],
      transformResponse: (response) =>
        response.map((item) => ({
          ...item,
          kpis: transformKpiData(item.kpis),
        })),
    }),
    getGamePlayerStats: builder.query({
      query: (gameId) =>
        `player_stats?game_id=eq.${gameId}&select=*,profiles(id,first_name,last_name,display_name),kpis(name,description,points,icon_name)`,
      providesTags: (result, error, gameId) => [{ type: 'PlayerStats', id: gameId }],
      transformResponse: (response) =>
        response.map((item) => ({
          ...item,
          kpis: transformKpiData(item.kpis),
        })),
    }),
    getPlayerStatById: builder.query({
      query: (id) =>
        `player_stats?id=eq.${id}&select=*,profiles(id,first_name,last_name,display_name),kpis(name,description,points,icon_name)`,
      providesTags: (result, error, id) => [{ type: 'PlayerStats', id }],
      transformResponse: (response) => {
        if (Array.isArray(response) && response.length > 0) {
          return {
            ...response[0],
            kpis: transformKpiData(response[0].kpis),
          };
        }
        return null;
      },
    }),
    getPlayerOverallStats: builder.query({
      query: (playerId) =>
        `player_stats?player_id=eq.${playerId}&select=kpis(name,points,icon_name),value`,
      providesTags: (result, error, playerId) => [{ type: 'PlayerStats', id: playerId }],
      transformResponse: (response) =>
        response.map((item) => ({
          ...item,
          kpis: transformKpiData(item.kpis),
        })),
    }),
    createPlayerStats: builder.mutation({
      query: (newStatData) => ({
        url: 'player_stats',
        method: 'POST',
        body: newStatData,
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'PlayerStats', id: arg.game_id }],
    }),
    updatePlayerStat: builder.mutation({
      query: ({ id, patch }) => ({
        url: `player_stats?id=eq.${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => ['PlayerStats', { type: 'PlayerStats', id }],
    }),
    deletePlayerStat: builder.mutation({
      query: (id) => ({
        url: `player_stats?id=eq.${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => ['PlayerStats', { type: 'PlayerStats', id }],
    }),
    deletePlayerStatsByGameId: builder.mutation({
      query: (gameId) => ({
        url: `player_stats?game_id=eq.${gameId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, gameId) => [{ type: 'PlayerStats', id: gameId }],
    }), // --- Games, Teams, Profiles Endpoints (Existing, kept for filter dropdowns) ---

    getGames: builder.query({
      query: () => `games?select=id,name`,
      providesTags: ['Games'],
    }),
    getGameById: builder.query({
      query: (gameId) => `games?id=eq.${gameId}&select=*`,
      providesTags: (result, error, gameId) => [{ type: 'Games', id: gameId }],
      transformResponse: (response) => {
        if (Array.isArray(response) && response.length > 0) {
          return response[0];
        }
        return null;
      },
    }),
    getTeams: builder.query({
      query: () => `teams?select=id,name`,
      providesTags: ['Teams'],
    }),
    getProfiles: builder.query({
      // MODIFIED LINE: Added '3d_avatar_url' to the select statement
      query: () => `profiles?select=id,display_name,first_name,last_name,3d_avatar_url`,
      providesTags: ['Profiles'],
      transformResponse: (response) => {
        if (response === null || typeof response === 'undefined') {
          console.error(
            'DEBUG: transformResponse for getProfiles received NULL/UNDEFINED response! Returning empty array.'
          );
          return [];
        }
        if (!Array.isArray(response)) {
          console.error(
            'DEBUG: transformResponse for getProfiles received NON-ARRAY response:',
            typeof response,
            response
          );
          return [];
        }
        // Ensure 3d_avatar_url is included in the mapped object
        return response.map((profile) => ({
          id: profile.id,
          display_name: profile.display_name,
          first_name: profile.first_name,
          last_name: profile.last_name,
          '3d_avatar_url': profile['3d_avatar_url'], // Added this line
        }));
      },
    }), // --- NEW: Dashboard View Endpoint ---

    getDashboardStats: builder.query({
      query: ({ playerId, gameId, kpiId, teamId, startDate, endDate }) => {
        // FIX: Changed to select '*' to ensure all columns from your view are returned.
        // For filtering to work correctly on 'playerId', 'gameId', 'kpiId', 'teamId',
        // you MUST ensure these corresponding ID columns (e.g., 'game_id', 'player_id')
        // are included in your Supabase `player_stats_dashboard_view` definition.
        // (As provided in the SQL update above).
        let queryString = `player_stats_dashboard_view?select=*`;

        // Apply filters to the view. These will now work correctly if the ID columns
        // are present in your `player_stats_dashboard_view`.
        if (playerId) {
          queryString += `&player_id=eq.${playerId}`;
        }
        if (gameId) {
          queryString += `&game_id=eq.${gameId}`;
        }
        if (kpiId) {
          queryString += `&kpi_id=eq.${kpiId}`;
        }
        if (teamId) {
          queryString += `&team_id=eq.${teamId}`;
        }
        if (startDate) {
          queryString += `&date_recorded=gte.${startDate}`;
        }
        if (endDate) {
          queryString += `&date_recorded=lte.${endDate}`;
        }

        queryString += `&order=date_recorded.desc`;

        console.log('DEBUG_API: Constructed dashboard view queryString:', queryString);
        return queryString;
      },
      providesTags: ['DashboardStats'], // Using a new tag type for this view
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          console.log('DEBUG_API: Dashboard view query successful. Data:', data); // Logs the data received from Supabase
        } catch (error) {
          console.error('DEBUG_API: Dashboard view query FAILED. Error:', error);
          if (error.status === 'FETCH_ERROR') {
            console.error('DEBUG_API: Network/Fetch Error details:', error.error);
          } else if (error.data) {
            console.error('DEBUG_API: API Error Response Data:', error.data);
          }
        }
      },
    }),

    // NEW: Endpoint for Player Achievements
    getPlayerAchievements: builder.query({
      query: ({ playerId }) => {
        let queryString = `merit_transactions?select=id,amount,transaction_type,created_at,source_game_id,source_achievement_definition_id,achievements_definitions!source_achievement_definition_id(name,description,merit_reward)`;

        if (playerId) {
          queryString += `&player_id=eq.${playerId}`;
        }
        queryString += `&order=created_at.desc`;

        console.log('DEBUG_API: Constructed getPlayerAchievements queryString:', queryString);
        return queryString;
      },
      providesTags: (result, error, { playerId }) => [{ type: 'Achievements', id: playerId }], // Tag by player ID
      // FIX: Changed to concise arrow function body
      transformResponse: (response) =>
        response.map((mt) => ({
          ...mt,
          achievement_name: mt.achievements_definitions?.name,
          achievement_description: mt.achievements_definitions?.description,
          achievement_merit_reward: mt.achievements_definitions?.merit_reward,
          achievements_definitions: undefined, // Remove the nested object
        })),
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          console.log('DEBUG_API: Player Achievements query successful. Data:', data);
        } catch (error) {
          console.error('DEBUG_API: Player Achievements query FAILED. Error:', error);
          if (error.status === 'FETCH_ERROR') {
            console.error('DEBUG_API: Network/Fetch Error details:', error.error);
          } else if (error.data) {
            console.error('DEBUG_API: API Error Response Data:', error.data);
          }
        }
      },
    }),
  }),
});

export const {
  useGetKpisQuery,
  useGetKpiByIdQuery,
  useCreateKpiMutation,
  useUpdateKpiMutation,
  useDeleteKpiMutation,
  useGetGameKpisByGameIdQuery,
  useGetPlayerStatsQuery,
  useGetAllPlayerStatsQuery,
  useGetGamePlayerStatsQuery,
  useGetPlayerStatByIdQuery,
  useGetPlayerOverallStatsQuery,
  useCreatePlayerStatsMutation,
  useUpdatePlayerStatMutation,
  useDeletePlayerStatMutation,
  useDeletePlayerStatsByGameIdMutation,
  useGetGamesQuery,
  useGetGameByIdQuery,
  useGetTeamsQuery,
  useGetProfilesQuery,
  useGetDashboardStatsQuery,
  useGetPlayerAchievementsQuery, // Export the new hook for player achievements
} = statsApi;
