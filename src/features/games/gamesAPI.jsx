// src/features/games/gamesAPI.jsx

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { CONFIG } from 'src/global-config';
import { supabase } from 'src/lib/supabase';

export const gamesApi = createApi({
  reducerPath: 'gamesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${CONFIG.supabase.url}/rest/v1/`,
    prepareHeaders: async (headers, { getState }) => {
      headers.set('apikey', CONFIG.supabase.key);
      headers.set('Content-Type', 'application/json');
      headers.set('Prefer', 'return=representation');

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
      } else {
        // Fallback to anonymous key if no session (e.g., for public read access)
        headers.set('Authorization', `Bearer ${CONFIG.supabase.key}`);
      }
      return headers;
    },
  }),
  tagTypes: [
    'Games',
    'DraftPicks',
    'GameAchievements',
    'Profiles',
    'Kpis',
    'Teams',
    'PlayerStats',
    'AchievementDefinitions',
    'MeritTransactions',
    'GameParticipants',
    'PlayerAchievements', // <-- NEW TAG TYPE
    'GameTypes', // <-- NEW TAG TYPE
    'H2HMatches', // <-- ADDED: H2HMatches tag type
  ],
  endpoints: (builder) => ({
    getGames: builder.query({
      query: () => `games?select=*`, // Select all for game_date
      providesTags: ['Games'],
    }),

    getGameById: builder.query({
      query: (gameId) => `games?id=eq.${gameId}&select=*`,
      providesTags: (result, error, id) => [{ type: 'Games', id }],
      transformResponse: (response) => {
        if (Array.isArray(response) && response.length > 0) {
          return response[0];
        }
        return null;
      },
    }),

    createGame: builder.mutation({
      query: (newGameData) => ({
        url: 'games',
        method: 'POST',
        body: newGameData,
      }),
      invalidatesTags: ['Games'],
    }),

    updateGame: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `games?id=eq.${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => ['Games', { type: 'Games', id }],
    }),

    deleteGame: builder.mutation({
      query: (id) => ({
        url: `games?id=eq.${id}`,
        method: 'DELETE',
        body: id,
      }),
      invalidatesTags: (result, error, id) => ['Games', { type: 'Games', id }],
    }),

    // Draft pick related queries
    getDraftPicksByGameId: builder.query({
      query: (gameId) =>
        `draft_picks?game_id=eq.${gameId}&select=*,profiles(id,first_name,last_name,display_name,photo_url),teams(id,name,color)&order=pick_number.asc`,
      providesTags: (result, error, gameId) => [{ type: 'DraftPicks', id: gameId }],
    }),

    getAllDraftPicksByGameId: builder.query({
      query: (gameId) =>
        `draft_picks?game_id=eq.${gameId}&select=*,profiles(id,first_name,last_name,display_name,photo_url),teams(id,name,color)&order=pick_number.asc`,
      providesTags: (result, error, gameId) => [{ type: 'DraftPicks', id: `all-${gameId}` }],
    }),

    deleteDraftPicksByGameId: builder.mutation({
      query: (gameId) => ({
        url: `draft_picks?game_id=eq.${gameId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, gameId) => [{ type: 'DraftPicks', id: gameId }],
    }),

    deleteDraftPicksByTeamId: builder.mutation({
      query: (teamId) => ({
        url: `draft_picks?team_id=eq.${teamId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, teamId) => [{ type: 'DraftPicks', id: teamId }],
    }),

    getDraftPicksByTeamId: builder.query({
      query: (teamId) =>
        `draft_picks?team_id=eq.${teamId}&select=*,profiles(id,first_name,last_name,display_name,photo_url),games(id,name,start_date,end_date),teams(id,name,color)&order=game_id.asc,pick_number.asc`,
      providesTags: (result, error, teamId) => [{ type: 'DraftPicks', id: `team-${teamId}` }],
    }),

    getGameParticipantsByGameId: builder.query({
      query: (gameId) =>
        `game_participants?game_id=eq.${gameId}&select=player_id,team_id,profiles!player_id(id,display_name,first_name,last_name,photo_url),teams(id,name,color),is_manager`,
      providesTags: (result, error, gameId) => [{ type: 'GameParticipants', id: gameId }],
    }),

    getGameAchievements: builder.query({
      query: (gameId) =>
        `game_achievements?game_id=eq.${gameId}&select=
          *,
          profiles!overall_mvp_player_id(id,display_name,photo_url,first_name,last_name),
          teams!winning_team_id(id,name,color)
        `,
      providesTags: (result, error, gameId) => [{ type: 'GameAchievements', id: gameId }],
      transformResponse: (response, meta, arg) => {
        const gameId = arg;
        if (!Array.isArray(response) || response.length === 0) {
          console.log(`No game achievements found for gameId: ${gameId}`);
          return null;
        }

        const rawAchievement = response[0];

        const kpiWinnersActual = rawAchievement.kpi_winners || [];
        const teamLeaderMvpsActual = rawAchievement.team_leader_mvps || [];
        const performanceDataActual = rawAchievement.performance_data || [];
        const teamScoresActual = rawAchievement.team_scores || {};
        const podiumFinishersActual = rawAchievement.podium_finishers || []; // <-- ADDED THIS

        const overallMvp = rawAchievement.profiles
          ? {
              profile: rawAchievement.profiles,
              total_score:
                performanceDataActual.find(
                  (p) => p.profile_id === rawAchievement.overall_mvp_player_id
                )?.total_score || 0,
            }
          : null;

        const gameWinners = rawAchievement.teams
          ? [
              {
                team: rawAchievement.teams,
                total_score: teamScoresActual[rawAchievement.winning_team_id] || 0,
              },
            ]
          : [];

        return {
          overall_mvp: overallMvp,
          game_winners: gameWinners,
          kpi_winners: kpiWinnersActual,
          team_leader_mvps: teamLeaderMvpsActual,
          performance_data: performanceDataActual,
          team_scores: teamScoresActual,
          podium_finishers: podiumFinishersActual, // <-- ADDED THIS
          id: rawAchievement.id,
          game_id: rawAchievement.game_id,
          created_at: rawAchievement.created_at,
        };
      },
    }),

    deleteGameAchievementsByGameId: builder.mutation({
      query: (gameId) => ({
        url: `game_achievements?game_id=eq.${gameId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, gameId) => [{ type: 'GameAchievements', id: gameId }],
    }),

    getPlayerStatsByGameId: builder.query({
      query: (gameId) =>
        `player_stats?game_id=eq.${gameId}&select=id,player_id,kpi_id,value,date_recorded,team_id,teams(id,name,color)`,
      providesTags: (result, error, gameId) => [{ type: 'PlayerStats', id: gameId }],
    }),

    createPlayerStat: builder.mutation({
      query: (playerStatData) => ({
        url: 'player_stats',
        method: 'POST',
        body: playerStatData,
      }),
      invalidatesTags: (result, error, { game_id }) => [{ type: 'PlayerStats', id: game_id }],
    }),

    updatePlayerStat: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `player_stats?id=eq.${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { game_id }) => [{ type: 'PlayerStats', id: game_id }],
    }),

    createGameAchievements: builder.mutation({
      query: (achievementsData) => ({
        url: 'game_achievements',
        method: 'POST',
        body: achievementsData,
      }),
      invalidatesTags: (result, error, { game_id }) => [{ type: 'GameAchievements', id: game_id }],
    }),

    getAchievementDefinitions: builder.query({
      query: () => `achievements_definitions?select=*`,
      providesTags: ['AchievementDefinitions'],
    }),

    // NEW: Mutations for Achievement Definitions
    createAchievementDefinition: builder.mutation({
      query: (newDefinition) => ({
        url: 'achievements_definitions',
        method: 'POST',
        body: newDefinition,
      }),
      invalidatesTags: ['AchievementDefinitions'],
    }),
    updateAchievementDefinition: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `achievements_definitions?id=eq.${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        'AchievementDefinitions',
        { type: 'AchievementDefinitions', id },
      ],
    }),
    deleteAchievementDefinition: builder.mutation({
      query: (id) => ({
        url: `achievements_definitions?id=eq.${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        'AchievementDefinitions',
        { type: 'AchievementDefinitions', id },
      ],
    }),

    createMeritTransactions: builder.mutation({
      query: (meritTransactionsArray) => ({
        url: 'merit_transactions',
        method: 'POST',
        body: meritTransactionsArray,
      }),
      invalidatesTags: ['MeritTransactions', 'Profiles'],
    }),

    updateProfileMeritBalance: builder.mutation({
      query: ({ profileId, newMeritBalance }) => ({
        url: `profiles?id=eq.${profileId}`,
        method: 'PATCH',
        body: { merit_balance: newMeritBalance },
      }),
      invalidatesTags: (result, error, { profileId }) => [
        'Profiles',
        { type: 'Profiles', id: profileId },
      ],
    }),

    getTeamsByGameId: builder.query({
      query: (gameId) => `teams?game_id=eq.${gameId}&select=id,name,color,manager_id`,
      providesTags: (result, error, gameId) => [{ type: 'Teams', id: gameId }],
    }),

    getAllProfiles: builder.query({
      query: () => `profiles?select=id,display_name,first_name,last_name,photo_url,merit_balance`,
      providesTags: ['Profiles'],
    }),

    getAllKpis: builder.query({
      query: () => `kpis?select=id,name,description,points,icon_name`,
      providesTags: ['Kpis'],
    }),

    getAllTeams: builder.query({
      query: () => `teams?select=id,name,color`,
      providesTags: ['Teams'],
    }),

    uploadCsvPreview: builder.mutation({
      query: ({ file, gameId }) => {
        const formData = new FormData();
        formData.append('csvFile', file);
        return {
          url: `upload/csv-preview?gameId=${gameId}`,
          method: 'POST',
          body: formData,
        };
      },
    }),

    // NEW: Get all achievements for a specific user
    getUserAchievements: builder.query({
      query: (profileId) =>
        `player_achievements?player_id=eq.${profileId}&select=*,achievement_definitions(id,name,description,icon_name),games(id,name,game_date)&order=date_earned.desc`,
      providesTags: (result, error, profileId) => [{ type: 'PlayerAchievements', id: profileId }],
    }),

    // --- NEW ENDPOINT FOR GAME TYPES ---
    getGameTypes: builder.query({
      query: () => `game_types?select=*`, // Select all columns from game_types table
      providesTags: ['GameTypes'], // Tag for invalidation if game types can change
    }),
    // --- END NEW ENDPOINT ---

    // --- ADDED: H2H Matches Query ---
    getH2HMatchesByGameId: builder.query({
      query: (gameId) =>
        `h2h_matches?game_id=eq.${gameId}&select=
          id,
          match_number,
          match_date,
          player1:player1_id(id,first_name,last_name,display_name,photo_url),
          player2:player2_id(id,first_name,last_name,display_name,photo_url),
          team1:team1_id(id,name,color),
          team2:team2_id(id,name,color),
          status
        &order=match_date.asc,match_number.asc`,
      providesTags: (result, error, gameId) => [{ type: 'H2HMatches', id: gameId }],
    }),
    // --- END ADDED: H2H Matches Query ---
  }),
});

export const {
  useGetGamesQuery,
  useGetGameByIdQuery,
  useCreateGameMutation,
  useUpdateGameMutation,
  useDeleteGameMutation,
  useGetDraftPicksByGameIdQuery,
  useGetAllDraftPicksByGameIdQuery,
  useDeleteDraftPicksByGameIdMutation,
  useDeleteDraftPicksByTeamIdMutation,
  useGetDraftPicksByTeamIdQuery,
  useGetGameAchievementsQuery,
  useDeleteGameAchievementsByGameIdMutation,
  useGetPlayerStatsByGameIdQuery,
  useCreatePlayerStatMutation,
  useUpdatePlayerStatMutation,
  useCreateGameAchievementsMutation,
  useGetTeamsByGameIdQuery,
  useGetAllProfilesQuery,
  useGetAllKpisQuery,
  useGetAllTeamsQuery,
  useGetAchievementDefinitionsQuery,
  useCreateAchievementDefinitionMutation,
  useUpdateAchievementDefinitionMutation,
  useDeleteAchievementDefinitionMutation,
  useCreateMeritTransactionsMutation,
  useUpdateProfileMeritBalanceMutation,
  useGetGameParticipantsByGameIdQuery,
  useUploadCsvPreviewMutation,
  useGetUserAchievementsQuery, // <-- NEW EXPORT
  useGetGameTypesQuery, // **CHANGED: Corrected export name**
  useGetH2HMatchesByGameIdQuery, // <-- ADDED: H2H Matches Hook Export
} = gamesApi;
