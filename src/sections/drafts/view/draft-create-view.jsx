import { useEffect, useState, useCallback, useRef } from 'react';

import {
  // <-- Add an empty line here
  Box,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  Divider,
  Alert,
  Snackbar,
  LinearProgress,
  Stack,
  Avatar,
  CircularProgress,
  Autocomplete,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material';

import { paths } from 'src/routes/paths'; // <-- Add an empty line here
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { supabase } from 'src/lib/supabase'; // <-- Add an empty line here
import { useGetTeamsQuery } from 'src/features/teams/teamsAPI';
import { useGetGameByIdQuery } from 'src/features/games/gamesAPI';
import { useGetPlayersQuery } from 'src/features/players/playersAPI';

import { Iconify } from 'src/components/iconify'; // <-- Add an empty line here

import { useAuthContext } from 'src/auth/context/supabase/auth-provider';

const TEAM_COLORS = [
  '#EF5350', // Red
  '#42A5F5', // Blue
  '#66BB6A', // Green
  '#FFCA28', // Yellow
  '#AB47BC', // Purple
  '#78909C', // Blue Grey
  '#FF7043', // Deep Orange
  '#26A69A', // Teal
];

export function DraftCreateView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId');

  const { user, loading: authLoading } = useAuthContext();
  const userCompanyName = user?.company;

  const {
    data: gameDetails,
    isLoading: isLoadingGame,
    isError: isErrorGame,
    error: gameError,
  } = useGetGameByIdQuery(gameId, {
    skip: !gameId,
  });

  const {
    data: allPlayers = [],
    isLoading: isLoadingPlayers,
    isError: isErrorPlayers,
    error: playersError,
  } = useGetPlayersQuery(userCompanyName, {
    skip: !userCompanyName || authLoading,
  });

  const {
    data: allTeams = [],
    isLoading: isLoadingAllTeams,
    isError: isErrorAllTeams,
    error: allTeamsError,
  } = useGetTeamsQuery(); // This query is fine as it fetches ALL teams for selection

  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedTeamsForDraft, setSelectedTeamsForDraft] = useState([]); // These are the teams the user selected in the Autocomplete
  const [teamsInDraft, setTeamsInDraft] = useState([]); // These are the teams currently participating in the draft with their players
  const [currentRound, setCurrentRound] = useState(1);
  const [currentPick, setCurrentPick] = useState(1);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [draftDirection, setDraftDirection] = useState(1);
  const [timer, setTimer] = useState(60);
  const [draftStarted, setDraftStarted] = useState(false);
  const [draftCompleted, setDraftCompleted] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isEndingDraft, setIsEndingDraft] = useState(false);
  // NEW STATE: Control whether managers are added as participants
  const [includeManagersAsParticipants, setIncludeManagersAsParticipants] = useState(true);

  const timerIntervalRef = useRef(null);

  const currentTeam = teamsInDraft[currentTeamIndex];

  const moveToNextPick = useCallback(() => {
    if (availablePlayers.length === 0) {
      setDraftCompleted(true);
      setSnackbarMessage('Draft completed! No more players available.');
      setSnackbarOpen(true);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      return;
    }

    let nextTeamIdx = currentTeamIndex + draftDirection;
    let nextRound = currentRound;

    if (nextTeamIdx >= teamsInDraft.length) {
      nextTeamIdx = teamsInDraft.length - 1;
      setDraftDirection(-1);
      nextRound += 1;
    } else if (nextTeamIdx < 0) {
      nextTeamIdx = 0;
      setDraftDirection(1);
      nextRound += 1;
    }

    setCurrentTeamIndex(nextTeamIdx);
    setCurrentRound(nextRound);
    setCurrentPick((prev) => prev + 1);
    setTimer(60);
  }, [currentTeamIndex, draftDirection, currentRound, teamsInDraft, availablePlayers.length]);

  const handlePlayerDraft = useCallback(
    (playerId) => {
      if (draftCompleted || !currentTeam || !draftStarted) {
        return;
      }

      const playerToDraft = availablePlayers.find((p) => p.id === playerId);
      if (!playerToDraft) {
        setSnackbarMessage('Player not found or already drafted!');
        setSnackbarOpen(true);
        return;
      }

      const playerWithPickInfo = {
        ...playerToDraft,
        _isManager: false, // Mark as a drafted player
        _draftRound: currentRound,
        _draftPick: currentPick,
      };

      setAvailablePlayers((prev) => prev.filter((p) => p.id !== playerId));

      setTeamsInDraft((prev) =>
        prev.map((team, idx) =>
          idx === currentTeamIndex
            ? { ...team, players: [...team.players, playerWithPickInfo] }
            : team
        )
      );

      setSnackbarMessage(
        `${playerToDraft.display_name || `${playerToDraft.first_name} ${playerToDraft.last_name}`} drafted by ${currentTeam.name}!`
      );
      setSnackbarOpen(true);

      moveToNextPick();
    },
    [
      availablePlayers,
      currentTeamIndex,
      teamsInDraft,
      draftCompleted,
      draftStarted,
      currentTeam,
      moveToNextPick,
      currentRound,
      currentPick,
    ]
  );

  const handleRandomPick = useCallback(() => {
    if (draftCompleted || !currentTeam || !draftStarted) return;

    if (availablePlayers.length === 0) {
      setSnackbarMessage('No players left to auto-draft!');
      setSnackbarOpen(true);
      moveToNextPick();
      return;
    }

    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    const playerToDraft = availablePlayers[randomIndex];

    setSnackbarMessage(
      `Time expired! ${playerToDraft.display_name || `${playerToDraft.first_name} ${playerToDraft.last_name}`} auto-drafted by ${currentTeam.name}.`
    );
    setSnackbarOpen(true);

    handlePlayerDraft(playerToDraft.id);
  }, [
    availablePlayers,
    currentTeam,
    draftCompleted,
    draftStarted,
    handlePlayerDraft,
    moveToNextPick,
  ]);

  const performDraftSetup = useCallback(() => {
    if (
      !gameDetails ||
      allPlayers.length === 0 ||
      allTeams.length === 0 ||
      selectedTeamsForDraft.length === 0 ||
      selectedTeamsForDraft.length !== gameDetails.number_of_teams
    ) {
      const msg =
        'Cannot start draft: Missing game details, players, teams, or incorrect team selection.';
      setSnackbarMessage(msg);
      setSnackbarOpen(true);
      return;
    }

    let profilesToDraft = [...allPlayers];

    const initialTeamsForDraft = selectedTeamsForDraft.map((selectedTeam) => {
      const teamManagerProfile = profilesToDraft.find(
        (profile) => profile.id === selectedTeam.manager_id
      );

      let teamPlayers = [];
      if (teamManagerProfile) {
        const playerWithPickInfo = {
          ...teamManagerProfile,
          _isManager: true, // Mark as a manager
          _draftRound: 0, // Managers are pre-assigned, not part of draft rounds
          _draftPick: 0, // Managers are pre-assigned, not part of draft picks
        };
        teamPlayers.push(playerWithPickInfo);

        // --- CRITICAL CHANGE HERE ---
        // ALWAYS remove the manager from profilesToDraft if they were pre-assigned.
        // This prevents them from being drafted again, resolving the duplicate key issue.
        profilesToDraft = profilesToDraft.filter((p) => p.id !== teamManagerProfile.id);
      }

      return {
        id: selectedTeam.id,
        name: selectedTeam.name,
        players: teamPlayers,
        color:
          TEAM_COLORS[
            allTeams.findIndex((team) => team.id === selectedTeam.id) % TEAM_COLORS.length
          ],
        manager_id: selectedTeam.manager_id,
      };
    });

    setAvailablePlayers(profilesToDraft);
    setTeamsInDraft(initialTeamsForDraft);

    setSnackbarMessage(`Draft setup complete for Game: ${gameDetails.name}. Draft has started!`);
    setSnackbarOpen(true);
    setDraftStarted(true);
  }, [gameDetails, allPlayers, allTeams, selectedTeamsForDraft]);

  const handleEndDraft = useCallback(async () => {
    setIsEndingDraft(true);
    setSnackbarMessage(
      'Ending draft and updating player profiles, draft picks, and game participants...'
    );
    setSnackbarOpen(true);

    const updates = []; // For profiles table (team_id)
    const draftPicks = []; // For draft_picks table
    const gameParticipants = []; // For game_participants table
    const gameTeamsToInsert = []; // For game_teams table

    const allDraftedPlayersWithActualPicks = [];

    teamsInDraft.forEach((team) => {
      // Collect game_teams data
      gameTeamsToInsert.push({
        game_id: gameId,
        team_id: team.id,
      });

      team.players.forEach((player) => {
        if (!player._isManager || includeManagersAsParticipants) {
          gameParticipants.push({
            player_id: player.id,
            game_id: gameId,
            team_id: team.id,
            is_manager: player._isManager,
          });
        }

        if (
          !player._isManager &&
          player._draftPick !== undefined &&
          player._draftRound !== undefined
        ) {
          allDraftedPlayersWithActualPicks.push({
            player,
            team,
            draftPick: player._draftPick,
            draftRound: player._draftRound,
          });
        }
        updates.push({
          id: player.id,
          team_id: team.id,
        });
      });
    });

    allDraftedPlayersWithActualPicks.sort((a, b) => a.draftPick - b.draftPick);

    allDraftedPlayersWithActualPicks.forEach(({ player, team }, index) => {
      const actualOverallPickNumber = index + 1;

      draftPicks.push({
        player_id: player.id,
        team_id: team.id,
        pick_number: actualOverallPickNumber,
        round_number: player._draftRound,
        game_id: gameId,
      });
    });

    try {
      const updateProfilesPromises = updates.map((update) =>
        supabase.from('profiles').update({ team_id: update.team_id }).eq('id', update.id)
      );

      const insertGameParticipantsPromise =
        gameParticipants.length > 0
          ? supabase.from('game_participants').upsert(gameParticipants, {
              onConflict: 'game_id,player_id',
              ignoreDuplicates: false,
            })
          : Promise.resolve({ data: [], error: null });

      const insertGameTeamsPromise =
        gameTeamsToInsert.length > 0
          ? supabase.from('game_teams').upsert(gameTeamsToInsert, {
              onConflict: 'game_id,team_id',
              ignoreDuplicates: false,
            })
          : Promise.resolve({ data: [], error: null });

      const insertDraftPicksPromise = supabase.from('draft_picks').insert(draftPicks);

      const [
        updateProfilesResults,
        insertDraftPicksResults,
        insertGameParticipantsResults,
        insertGameTeamsResults,
      ] = await Promise.all([
        Promise.all(updateProfilesPromises),
        insertDraftPicksPromise,
        insertGameParticipantsPromise,
        insertGameTeamsPromise,
      ]);

      const updateErrors = updateProfilesResults.filter((result) => result.error);
      const insertDraftErrors = insertDraftPicksResults.error
        ? [insertDraftPicksResults.error]
        : [];
      const insertParticipantsErrors = insertGameParticipantsResults.error
        ? [insertGameParticipantsResults.error]
        : [];
      const insertGameTeamsErrors = insertGameTeamsResults.error
        ? [insertGameTeamsResults.error]
        : [];

      if (
        updateErrors.length > 0 ||
        insertDraftErrors.length > 0 ||
        insertParticipantsErrors.length > 0 ||
        insertGameTeamsErrors.length > 0
      ) {
        console.error('Errors during batch profile update:', updateErrors);
        console.error('Errors during draft_picks insert:', insertDraftErrors);
        console.error('Errors during game_participants insert:', insertParticipantsErrors);
        console.error('Errors during game_teams insert:', insertGameTeamsErrors);
        setSnackbarMessage(
          `Draft ended, but some updates failed! Check console for profile, draft picks, game participants, or team-game associations.`
        );
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage(
          'Draft successfully ended! Player profiles, draft picks, game participants, and team-game associations updated.'
        );
        setSnackbarOpen(true);
        setDraftCompleted(true);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
        // router.push(paths.dashboard.game.details(gameId));
      }
    } catch (error) {
      console.error('Failed to end draft or update database entries:', error);
      setSnackbarMessage(`Failed to end draft: ${error.message || 'Unknown error'}`);
      setSnackbarOpen(true);
    } finally {
      setIsEndingDraft(false);
    }
  }, [teamsInDraft, gameId, selectedTeamsForDraft, includeManagersAsParticipants]);

  useEffect(() => {
    if (
      !isLoadingGame &&
      !isErrorGame &&
      gameDetails &&
      !isLoadingPlayers &&
      !isErrorPlayers &&
      allPlayers.length > 0 &&
      !isLoadingAllTeams &&
      !isErrorAllTeams &&
      allTeams.length > 0 &&
      !authLoading
    ) {
      setSnackbarMessage(`Game data loaded for ${gameDetails.name}. Select teams to begin draft.`);
      setSnackbarOpen(true);
    } else if (isErrorGame || isErrorPlayers || isErrorAllTeams) {
      const msg = `Error loading initial draft data: ${
        gameError?.message || playersError?.message || allTeamsError?.message || 'Unknown error'
      }`;
      setSnackbarMessage(msg);
      setSnackbarOpen(true);
    }
  }, [
    gameDetails,
    isLoadingGame,
    isErrorGame,
    gameError,
    allPlayers,
    isLoadingPlayers,
    isErrorPlayers,
    playersError,
    allTeams,
    isErrorAllTeams,
    allTeamsError,
    isLoadingAllTeams,
    authLoading,
  ]); // This dependency array seems correct for this useEffect

  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (draftStarted && !draftCompleted) {
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            handleRandomPick();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [draftStarted, draftCompleted, handleRandomPick]);

  if (!gameId) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        No game selected. Please navigate from a game details page to start a draft.
        <Button onClick={() => router.push(paths.dashboard.game.list)} sx={{ ml: 2 }}>
          Go to Games List
        </Button>
      </Alert>
    );
  }

  if (authLoading || isLoadingGame || isLoadingPlayers || isLoadingAllTeams) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
        <CircularProgress />
        <Typography variant="subtitle1" sx={{ mt: 2 }}>
          Loading draft data...
        </Typography>
      </Stack>
    );
  }

  if (!user || !userCompanyName) {
    return (
      <Box sx={{ mt: 5, textAlign: 'center' }}>
        <Typography variant="h6">User not authenticated or company information missing.</Typography>
        <Typography variant="body2">
          Please ensure you are logged in and your user profile has a company.
        </Typography>
      </Box>
    );
  }

  if (isErrorGame || isErrorPlayers || isErrorAllTeams || !gameDetails) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Error loading draft data:{' '}
        {gameError?.message ||
          playersError?.message ||
          allTeamsError?.message ||
          'Game details not found.'}
        <Button onClick={() => router.push(paths.dashboard.game.list)} sx={{ ml: 2 }}>
          Go to Games List
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Draft for {gameDetails.name} (Game ID: {gameId})
      </Typography>

      {!draftStarted && !draftCompleted && (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Select Teams for Draft ({selectedTeamsForDraft.length} /{' '}
            {gameDetails.number_of_teams || 'N/A'})
          </Typography>
          <Autocomplete
            multiple
            id="select-teams-for-draft"
            options={allTeams}
            getOptionLabel={(option) => option.name}
            value={selectedTeamsForDraft}
            onChange={(event, newValue) => {
              if (gameDetails && newValue.length > gameDetails.number_of_teams) {
                setSnackbarMessage(
                  `You can only select up to ${gameDetails.number_of_teams} teams for this game.`
                );
                setSnackbarOpen(true);
                return;
              }
              setSelectedTeamsForDraft(newValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Select Teams"
                placeholder="Choose teams to participate"
              />
            )}
            sx={{ mb: 2 }}
          />

          {/* Checkbox for including managers as participants */}
          <FormControlLabel
            control={
              <Checkbox
                checked={includeManagersAsParticipants}
                onChange={(event) => setIncludeManagersAsParticipants(event.target.checked)}
              />
            }
            label="Include team managers as game participants"
            sx={{ mb: 2 }}
          />

          {selectedTeamsForDraft.length !== gameDetails.number_of_teams && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please select exactly {gameDetails.number_of_teams} teams to start the draft for this
              game.
            </Alert>
          )}

          <Button
            variant="contained"
            color="success"
            onClick={performDraftSetup}
            startIcon={<Iconify icon="eva:play-circle-fill" />}
            sx={{ mb: 3 }}
            disabled={
              draftStarted ||
              draftCompleted ||
              !gameDetails ||
              selectedTeamsForDraft.length !== gameDetails.number_of_teams ||
              selectedTeamsForDraft.length === 0
            }
          >
            Start Draft
          </Button>
        </Paper>
      )}

      {draftStarted && !draftCompleted && (
        <Paper
          elevation={3}
          sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'background.paper',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">
              Round: {currentRound} | Pick: {currentPick}
            </Typography>
            <Typography variant="h6">
              Current Pick:{' '}
              <Box component="span" sx={{ color: currentTeam?.color, fontWeight: 'bold' }}>
                {currentTeam?.name}
              </Box>
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Iconify icon="eva:clock-fill" width={24} height={24} />
            <Typography variant="h5" color="primary">
              {timer}s
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(timer / 60) * 100}
              sx={{ width: 100, height: 8, borderRadius: 5 }}
            />
          </Stack>
        </Paper>
      )}

      {draftCompleted && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Draft Completed! All available players have been drafted.
        </Alert>
      )}

      {draftStarted && !draftCompleted && (
        <Box sx={{ mb: 3, textAlign: 'right' }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleEndDraft}
            startIcon={<Iconify icon="eva:stop-circle-fill" />}
            disabled={isEndingDraft}
          >
            {isEndingDraft ? 'Ending Draft...' : 'End Draft'}
          </Button>
          {isEndingDraft && <CircularProgress size={24} sx={{ ml: 2 }} />}
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={3}
            sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <Typography variant="h6" gutterBottom>
              Available Players ({availablePlayers.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 600 }}>
              <List>
                {availablePlayers.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="No players available." />
                  </ListItem>
                ) : (
                  availablePlayers.map((player) => (
                    <ListItem
                      key={player.id}
                      secondaryAction={
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handlePlayerDraft(player.id)}
                          disabled={!draftStarted || draftCompleted}
                          startIcon={<Iconify icon="eva:arrow-circle-right-fill" />}
                        >
                          Draft
                        </Button>
                      }
                    >
                      <ListItemText
                        primary={player.display_name || `${player.first_name} ${player.last_name}`}
                        secondary={`Email: ${player.email || 'N/A'}`}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={3}
            sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <Typography variant="h6" gutterBottom>
              Drafted Players
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 600 }}>
              {teamsInDraft.length === 0 ? (
                <Alert severity="info">Please select teams to start the draft.</Alert>
              ) : (
                teamsInDraft.map((team) => (
                  <Box
                    key={team.id}
                    sx={{ mb: 3, p: 1, border: `1px solid ${team.color}`, borderRadius: 1 }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Avatar sx={{ bgcolor: team.color, width: 24, height: 24 }}>
                        <Typography variant="caption" color="white">
                          {team.name.charAt(0)}
                        </Typography>
                      </Avatar>
                      <Typography variant="subtitle1" sx={{ color: team.color }}>
                        {team.name} ({team.players.length})
                      </Typography>
                    </Stack>
                    {team.players.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                        No players drafted yet.
                      </Typography>
                    ) : (
                      <List dense>
                        {team.players.map((player) => (
                          <ListItem key={player.id}>
                            <Avatar
                              src={player.photoURL || ''}
                              alt={player.display_name || player.first_name}
                              sx={{ width: 32, height: 32, mr: 2 }}
                            >
                              {!player.photoURL &&
                                (player.display_name || player.first_name)?.charAt(0).toUpperCase()}
                            </Avatar>
                            <ListItemText
                              primary={
                                player.display_name || `${player.first_name} ${player.last_name}`
                              }
                              secondary={
                                !player._isManager && player._draftRound && player._draftPick
                                  ? `Round ${player._draftRound}, Pick ${player._draftPick}`
                                  : `Email: ${player.email || 'N/A'}`
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  );
}
