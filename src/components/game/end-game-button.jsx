import React, { useCallback, useState, useEffect } from 'react';

import { Button, CircularProgress, Alert, Box, Typography, Stack } from '@mui/material';

import { calculateGameAchievements } from 'src/utils/calculateGameAchievements'; // <--- Check this file

import {
  useCreateGameAchievementsMutation,
  useGetGameAchievementsQuery,
  useGetAchievementDefinitionsQuery,
  useCreateMeritTransactionsMutation,
  // REMOVED: useUpdateProfileMeritBalanceMutation is no longer needed
} from 'src/features/games/gamesAPI';

/**
 * Renders an "End Game" button that triggers achievement calculation and saving.
 * The button's state (disabled, loading, success/error messages) is managed internally.
 *
 * @param {object} props - The component props.
 * @param {string} props.gameId - The ID of the current game.
 * @param {Array} props.allProfiles - All player profiles data.
 * @param {Array} props.teamsData - All teams data for the game.
 * @param {Array} props.playerStatsData - Raw player statistics for the game.
 * @param {Array} props.draftPicksData - Raw draft picks data for the game.
 * @param {Array} props.gameKpisData - All game KPIs data.
 * @param {boolean} props.isParentLoading - A boolean indicating if the parent component is still loading data.
 */
export function EndGameButton({
  gameId,
  allProfiles,
  teamsData,
  playerStatsData,
  draftPicksData,
  gameKpisData,
  isParentLoading,
}) {
  const {
    data: gameAchievementsData,
    isLoading: isLoadingGameAchievements,
    isError: isErrorFetchingAchievements,
  } = useGetGameAchievementsQuery(gameId);

  const achievementsExist = !!gameAchievementsData && !!gameAchievementsData.game_id;

  const [
    createGameAchievements,
    {
      isLoading: isCreatingAchievementsSummary,
      isSuccess: createAchievementsSummarySuccess,
      isError: createAchievementsSummaryError,
      error: createAchievementsSummaryDetailedError,
    },
  ] = useCreateGameAchievementsMutation();

  const {
    data: achievementDefinitionsData,
    isLoading: isLoadingAchievementDefinitions,
    isError: isErrorFetchingAchievementDefinitions,
  } = useGetAchievementDefinitionsQuery();

  // Add a useEffect to log initial achievementDefinitionsData
  useEffect(() => {
    if (!isLoadingAchievementDefinitions) {
      console.log('--- Initial Achievement Definitions Data Fetch ---');
      if (achievementDefinitionsData) {
        console.log('Fetched Definitions:', JSON.stringify(achievementDefinitionsData, null, 2));
        achievementDefinitionsData.forEach((def) => {
          if (
            ['Overall Game MVP', 'KPI Achiever', 'Winning Team Member', 'Team Leader MVP'].includes(
              def.name
            )
          ) {
            console.log(`   - ${def.name}: merit_reward = ${def.merit_reward}`);
          }
        });
      } else if (isErrorFetchingAchievementDefinitions) {
        console.error('Error fetching achievement definitions!');
      } else {
        console.log('Achievement definitions data is null or undefined.');
      }
      console.log('--------------------------------------------------');
    }
  }, [
    achievementDefinitionsData,
    isLoadingAchievementDefinitions,
    isErrorFetchingAchievementDefinitions,
  ]);

  const [
    createMeritTransactions,
    {
      isLoading: isCreatingMeritTransactions,
      isSuccess: createMeritTransactionsSuccess,
      isError: createMeritTransactionsError,
      error: createMeritTransactionsDetailedError,
    },
  ] = useCreateMeritTransactionsMutation();

  // REMOVED: No longer need client-side update mutation for profile merits
  // const [updateProfileMeritBalance] = useUpdateProfileMeritBalanceMutation();

  // Consolidated status for the overall process (primarily based on transactions now)
  const [overallProcessStatus, setOverallProcessStatus] = useState({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null, // Can be a string
  });

  const isDisabled =
    isParentLoading ||
    isLoadingGameAchievements ||
    isLoadingAchievementDefinitions ||
    isCreatingAchievementsSummary ||
    isCreatingMeritTransactions ||
    overallProcessStatus.isLoading || // Reflect overall process loading
    achievementsExist ||
    isErrorFetchingAchievements ||
    isErrorFetchingAchievementDefinitions;

  const handleEndGame = useCallback(async () => {
    if (isDisabled) {
      console.warn(
        'Attempted to end game while button is disabled. This should not happen if onClick is wired correctly.'
      );
      return;
    }

    console.log('--- End Game process started ---');
    console.log('Input data for calculateGameAchievements:', {
      gameId,
      allProfiles,
      teamsData,
      playerStatsData,
      draftPicksData,
      gameKpis: gameKpisData,
      achievementDefinitions: achievementDefinitionsData,
    });
    console.log('Calculating achievements payload...');

    // Reset status at the start of a new attempt
    setOverallProcessStatus({ isLoading: true, isSuccess: false, isError: false, error: null });

    try {
      if (!achievementDefinitionsData) {
        throw new Error('Achievement definitions not loaded. Cannot calculate merits.');
      }

      const {
        gameAchievementsPayload = {},
        meritTransactions = [],
        meritsEarnedByPlayer = new Map(), // Still useful for logging/debug, but not for direct updates
      } = calculateGameAchievements({
        gameId,
        allProfiles,
        teamsData,
        playerStatsData,
        draftPicksData,
        gameKpis: gameKpisData,
        achievementDefinitions: achievementDefinitionsData,
      }) || {};

      console.log('Calculated Game Achievements Payload:', gameAchievementsPayload);
      console.log('Calculated Merit Transactions:', meritTransactions);
      console.log('Merits Earned By Player Map (for reference):', meritsEarnedByPlayer); // Log for verification

      console.log('--- DEBUGGING MERIT TRANSACTIONS PAYLOAD ---');
      console.log('Game ID passed to EndGameButton:', gameId);
      console.log('Number of merit transactions to send:', meritTransactions.length);
      if (meritTransactions.length > 0) {
        meritTransactions.slice(0, 3).forEach((tx, index) => {
          console.log(
            `Transaction ${index + 1}: Player ID: ${tx.player_id}, Amount: ${tx.amount}, Type: ${tx.transaction_type}`
          );
        });
      } else {
        console.log('No merit transactions were generated by calculateGameAchievements.');
      }
      console.log('--------------------------------------------');

      // --- Step 1: Create Game Achievements Summary ---
      let gameAchievementsResult = null;
      if (gameAchievementsPayload?.game_id) {
        console.log('Attempting to create game achievements summary...');
        gameAchievementsResult = await createGameAchievements(gameAchievementsPayload).unwrap();
        console.log(
          'Game Achievements Summary Mutation successful! Result:',
          gameAchievementsResult
        );
      } else {
        console.warn(
          'No game achievements summary could be calculated. Skipping game_achievements summary mutation.'
        );
      }

      // --- Step 2: Create Merit Transactions ---
      let meritTransactionsResult = null;
      if (meritTransactions.length > 0) {
        console.log(`Attempting to create ${meritTransactions.length} merit transactions...`);
        // The database trigger will automatically update profiles.merit_balance after this insert
        meritTransactionsResult = await createMeritTransactions(meritTransactions).unwrap();
        console.log('Merit Transactions Mutation successful! Result:', meritTransactionsResult);
        console.log('Merit balances should now be updated via database trigger.');
      } else {
        console.log('No individual merit transactions to create.');
      }

      // --- Final Status Update ---
      // Check overall success based on summary and transactions (profile updates handled by DB)
      if (
        gameAchievementsPayload &&
        gameAchievementsResult && // Game achievements summary must succeed if payload exists
        (meritTransactions.length === 0 || meritTransactionsResult) // Merit transactions must succeed (or none to create)
      ) {
        console.log('--- ALL GAME FINALIZATION STEPS COMPLETED SUCCESSFULLY ---');
        setOverallProcessStatus({ isLoading: false, isSuccess: true, isError: false, error: null });
      } else {
        console.warn(
          '--- GAME FINALIZATION: Some steps might have failed or been skipped. Check above logs. ---'
        );
        // If we reach here and not all are successful, it means an error occurred earlier
        // but was caught by a sub-mutation, or a payload was missing.
        // The individual RTK Query error states will reflect the specific failures.
        setOverallProcessStatus({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: 'Some game finalization steps failed. Check console for details.',
        });
      }
    } catch (err) {
      console.error('--- BEGIN DEBUG: Main handleEndGame Catch (Overall Process Failure) ---');
      console.error('Caught error object:', err);
      console.error('Type of caught error:', typeof err);

      let overallErrorDetail;
      if (err instanceof Error) {
        overallErrorDetail = err.message;
      } else if (err && typeof err === 'object' && err.data && err.data.message) {
        overallErrorDetail = err.data.message; // From RTK Query unwrap()
      } else if (err && typeof err === 'object' && err.message) {
        overallErrorDetail = err.message; // General JS Error message
      } else {
        overallErrorDetail = JSON.stringify(
          err || 'An unexpected error occurred during game finalization.'
        );
      }

      setOverallProcessStatus({
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: overallErrorDetail,
      });

      alert(
        `Error ending game: ${overallErrorDetail || 'An unexpected error occurred. Check console for details.'}`
      );
      console.error('--- END DEBUG: Main handleEndGame Catch ---');
    }
    console.log('--- End Game process finished ---');
  }, [
    gameId,
    allProfiles,
    teamsData,
    playerStatsData,
    draftPicksData,
    gameKpisData,
    achievementDefinitionsData,
    isDisabled,
    createGameAchievements,
    createMeritTransactions,
    // REMOVED: updateProfileMeritBalance is no longer in dependencies
    // REMOVED: meritUpdatesStatus.error is replaced by overallProcessStatus.error
  ]);

  const isOverallLoading =
    isCreatingAchievementsSummary || isCreatingMeritTransactions || overallProcessStatus.isLoading;

  // The overall success now depends only on the mutations that directly insert data
  const isOverallSuccess =
    createAchievementsSummarySuccess &&
    createMeritTransactionsSuccess &&
    overallProcessStatus.isSuccess;

  const isOverallError =
    createAchievementsSummaryError || createMeritTransactionsError || overallProcessStatus.isError;

  return (
    <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
      <Stack spacing={2}>
        {achievementsExist && (
          <Alert severity="info">
            Game achievements for this game have already been calculated and stored.
          </Alert>
        )}
        {isErrorFetchingAchievementDefinitions && (
          <Alert severity="error">
            Failed to load achievement definitions. Merits may not be calculated correctly.
          </Alert>
        )}
        {createAchievementsSummaryError && (
          <Alert severity="error">
            Failed to save game achievements summary:{' '}
            {createAchievementsSummaryDetailedError?.data?.message ||
              createAchievementsSummaryDetailedError?.message ||
              'Unknown error saving summary.'}
          </Alert>
        )}
        {createMeritTransactionsError && (
          <Alert severity="error">
            Failed to save individual merit transactions:{' '}
            {createMeritTransactionsDetailedError?.data?.message ||
              createMeritTransactionsDetailedError?.message ||
              'Unknown error saving transactions.'}
          </Alert>
        )}
        {overallProcessStatus.isError && ( // Use the new overall status
          <Alert severity="error">
            Overall game finalization failed:{' '}
            {typeof overallProcessStatus.error === 'string'
              ? overallProcessStatus.error
              : overallProcessStatus.error?.message || 'Unknown error.'}
          </Alert>
        )}
        {isOverallSuccess && (
          <Alert severity="success">Game results and merits saved successfully!</Alert>
        )}
        {isErrorFetchingAchievements && (
          <Alert severity="warning">
            Could not determine if achievements exist due to an error. You may try to save them.
          </Alert>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleEndGame}
          disabled={isDisabled}
          startIcon={isOverallLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isOverallLoading
            ? 'Saving Game Results & Merits...'
            : achievementsExist
              ? 'Achievements Already Saved'
              : 'End Game & Save Achievements'}
        </Button>
        {isDisabled && !achievementsExist && !isOverallLoading && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {isParentLoading && 'Button disabled: Parent data still loading.'}
            {isLoadingGameAchievements && 'Button disabled: Checking for existing achievements.'}
            {isLoadingAchievementDefinitions && 'Button disabled: Loading achievement definitions.'}
            {isErrorFetchingAchievements &&
              'Button disabled: Error checking for existing achievements.'}
            {isErrorFetchingAchievementDefinitions &&
              'Button disabled: Error loading achievement definitions.'}
            {!isParentLoading &&
              !isLoadingGameAchievements &&
              !isLoadingAchievementDefinitions &&
              !isOverallLoading &&
              !achievementsExist &&
              !isErrorFetchingAchievements &&
              !isErrorFetchingAchievementDefinitions &&
              'Button disabled: Unknown reason. Check console.'}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
