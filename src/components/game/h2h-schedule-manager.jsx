// src/components/game/h2h-schedule-manager.jsx
import React, { useState, useEffect } from 'react';

import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
  Alert,
  Card,
  CardContent,
} from '@mui/material';

import { supabase } from 'src/lib/supabase';
import { useGetGameParticipantsByGameIdQuery } from 'src/features/games/gamesAPI';

export function H2HScheduleManager({ game, hasDraftOccurred, isParentLoading, h2hGameTypeIds }) {
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [isH2HGameType, setIsH2HGameType] = useState(false);
  const [isScheduleGenerated, setIsScheduleGenerated] = useState(false);

  const {
    data: gameParticipants,
    isLoading: participantsLoading,
    isError: participantsError,
    error: participantsFetchError,
  } = useGetGameParticipantsByGameIdQuery(game?.id, {
    skip: !game?.id,
  });

  useEffect(() => {
    if (game && h2hGameTypeIds && h2hGameTypeIds.length > 0) {
      const isH2H = h2hGameTypeIds.includes(game.game_type_id);
      setIsH2HGameType(isH2H);

      async function checkExistingSchedule() {
        if (!isH2H || !game?.id) return;
        try {
          const { count, error } = await supabase
            .from('h2h_matches')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', game.id);

          if (error) throw error;
          setIsScheduleGenerated(count > 0);
        } catch (err) {
          console.error('Error checking existing schedule:', err.message);
          setScheduleError(`Failed to check existing schedule: ${err.message}`);
          setIsScheduleGenerated(false);
        }
      }
      checkExistingSchedule();
    } else {
      setIsH2HGameType(false);
      setIsScheduleGenerated(false);
    }
  }, [game, h2hGameTypeIds]);

  const draftH2HTypeIdFromProp = h2hGameTypeIds?.find((id) => id.toLowerCase().includes('draft'));
  const isDraftH2H = game?.game_type_id === draftH2HTypeIdFromProp;

  // --- MODIFIED: Client-side schedule generation logic ---
  const generateMatches = (
    participants,
    gameId,
    isTeamBasedGame,
    gameStartDateStr,
    gameEndDateStr
  ) => {
    let entities = [];

    if (!gameStartDateStr || !gameEndDateStr) {
      console.error('Game start or end date is missing for schedule generation.');
      return [];
    }

    const startDate = new Date(gameStartDateStr);
    const endDate = new Date(gameEndDateStr);
    endDate.setHours(23, 59, 59, 999); // Set to end of day for inclusive comparison

    if (isTeamBasedGame) {
      const teamIds = Array.from(new Set(participants.map((p) => p.team_id))).filter(
        (id) => id !== null
      );
      entities = teamIds;
      if (entities.length < 2) {
        console.warn('Not enough unique teams to generate H2H matches.');
        return [];
      }
    } else {
      entities = participants.map((p) => p.player_id).filter((id) => id !== null);
      if (entities.length < 2) {
        console.warn('Not enough players to generate H2H matches.');
        return [];
      }
    }

    let playersOrTeams = [...entities];
    if (playersOrTeams.length % 2 !== 0) {
      playersOrTeams.push('BYE_ENTITY'); // Add a dummy entity for odd numbers
    }

    const numEntities = playersOrTeams.length;
    const totalRoundsToGenerate = numEntities - 1; // Total rounds in a round-robin
    let matchCounter = 0;

    // Generate all raw matches using the round-robin algorithm
    const rawMatchesPerRound = []; // This will store matches grouped by their inherent round-robin round
    let tempPlayersOrTeams = [...playersOrTeams]; // Use a temporary array for rotation

    for (let round = 0; round < totalRoundsToGenerate; round++) {
      const currentRoundMatches = [];
      for (let i = 0; i < numEntities / 2; i++) {
        const entity1 = tempPlayersOrTeams[i];
        const entity2 = tempPlayersOrTeams[numEntities - 1 - i];

        if (entity1 === 'BYE_ENTITY' || entity2 === 'BYE_ENTITY') {
          continue; // Skip matches with BYE entity
        }

        matchCounter++;
        const matchEntry = {
          game_id: gameId,
          match_number: matchCounter,
          status: 'scheduled',
        };

        if (isTeamBasedGame) {
          matchEntry.team1_id = entity1;
          matchEntry.team2_id = entity2;
          matchEntry.player1_id = null;
          matchEntry.player2_id = null;
        } else {
          matchEntry.player1_id = entity1;
          matchEntry.player2_id = entity2;
          matchEntry.team1_id = null;
          matchEntry.team2_id = null;
        }
        currentRoundMatches.push(matchEntry);
      }
      if (currentRoundMatches.length > 0) {
        rawMatchesPerRound.push(currentRoundMatches);
      }

      // Rotate players/teams for the next round
      const lastEntity = tempPlayersOrTeams.pop();
      tempPlayersOrTeams.splice(1, 0, lastEntity);
    }

    // Now, assign these matches to specific dates, ensuring one match per player/team per day
    const scheduledMatches = [];
    let currentDate = new Date(startDate);
    let roundIndex = 0;

    // Loop through the rounds generated by the round-robin algorithm
    while (roundIndex < rawMatchesPerRound.length) {
      if (currentDate > endDate) {
        console.warn(
          'Ran out of available dates before scheduling all matches. Some matches might not be scheduled or will overflow the last date.'
        );
        break; // Stop if we exceed the game's end date
      }

      const dateString = currentDate.toISOString().split('T')[0];
      const currentDayMatches = rawMatchesPerRound[roundIndex];

      // Assign all matches from the current round-robin round to the current date
      // This ensures that players from the same round-robin round play on the same day,
      // which inherently follows the "one match per player per day" for that round.
      currentDayMatches.forEach((match) => {
        match.match_date = dateString;
        scheduledMatches.push(match);
      });

      // Move to the next round-robin round and the next day
      roundIndex++;
      currentDate.setDate(currentDate.getDate() + 1); // Increment date for the next group of matches
    }

    return scheduledMatches;
  };

  const handleGenerateSchedule = async () => {
    setScheduleLoading(true);
    setScheduleError('');
    setScheduleSuccess('');

    if (!game?.id) {
      setScheduleError('Game ID is missing. Cannot generate schedule.');
      setScheduleLoading(false);
      return;
    }

    if (!gameParticipants || gameParticipants.length < 2) {
      setScheduleError(
        'Not enough players/teams found for this game. Add at least two to generate a schedule.'
      );
      setScheduleLoading(false);
      return;
    }

    if (!game.start_date || !game.end_date) {
      setScheduleError('Game start and/or end date missing. Cannot generate schedule.');
      setScheduleLoading(false);
      return;
    }

    const isTeamBasedGame = isDraftH2H;

    try {
      const generatedMatches = generateMatches(
        gameParticipants,
        game.id,
        isTeamBasedGame,
        game.start_date,
        game.end_date
      );

      if (generatedMatches.length === 0) {
        setScheduleError(
          'No matches were generated. Check participant/team count or algorithm logic.'
        );
        setScheduleLoading(false);
        return;
      }

      // Delete existing matches for this game before inserting new ones
      const { error: deleteError } = await supabase
        .from('h2h_matches')
        .delete()
        .eq('game_id', game.id);

      if (deleteError) {
        throw new Error(`Failed to delete existing schedule: ${deleteError.message}`);
      }

      // Use upsert to handle potential conflicts or simply insert
      const { error } = await supabase.from('h2h_matches').insert(generatedMatches);

      if (error) {
        throw new Error(error.message);
      }

      setScheduleSuccess('H2H Schedule generated successfully!');
      setIsScheduleGenerated(true);
    } catch (err) {
      console.error('Error generating and saving schedule:', err);
      setScheduleError(`Failed to generate or save schedule: ${err.message}`);
    } finally {
      setScheduleLoading(false);
    }
  };

  const disableButton =
    isParentLoading ||
    participantsLoading ||
    scheduleLoading ||
    isScheduleGenerated ||
    (isDraftH2H && !hasDraftOccurred) ||
    participantsError ||
    !gameParticipants ||
    gameParticipants.length < 2 ||
    !game?.start_date ||
    !game?.end_date;

  const buttonText = isScheduleGenerated
    ? 'Schedule Already Generated'
    : scheduleLoading
      ? 'Generating Schedule...'
      : 'Generate H2H Schedule';

  if (!isH2HGameType) {
    return null;
  }

  return (
    <Card sx={{ mt: 3, p: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          H2H Schedule Management
        </Typography>

        {isDraftH2H && !hasDraftOccurred && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            For Draft H2H games, please ensure the draft has occurred and teams are finalized before
            generating the schedule.
          </Alert>
        )}

        {participantsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error fetching participants: {participantsFetchError?.message || 'Unknown error'}
          </Alert>
        )}

        {!game?.start_date || !game?.end_date ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Game start and end dates are required to generate a schedule. Please set them in game
            details.
          </Alert>
        ) : (
          !participantsLoading &&
          !participantsError &&
          (!gameParticipants || gameParticipants.length < 2) && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Not enough players/teams found for this game to generate a schedule. Add at least two.
            </Alert>
          )
        )}

        {scheduleError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {scheduleError}
          </Alert>
        )}
        {scheduleSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {scheduleSuccess}
          </Alert>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handleGenerateSchedule}
          disabled={disableButton}
          startIcon={scheduleLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {buttonText}
        </Button>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          *Ensure all players are added to the game (and teams are finalized for Draft H2H) before
          generating the schedule.
        </Typography>
      </CardContent>
    </Card>
  );
}
