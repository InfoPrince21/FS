// src/sections/stats/view/enter-stats-form-view.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';

// MUI Material Imports
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Alert,
  Modal, // NEW: Import Modal for the pop-up dialog
} from '@mui/material';

// Import your RTK Query hooks
import {
  useGetKpisQuery,
  useGetPlayerStatsByGameIdQuery,
  useCreatePlayerStatMutation,
  useUpdatePlayerStatMutation,
  useGetGameParticipantsByGameIdQuery,
} from 'src/features/games/gamesAPI';

import { KpiCsvUploadForm } from 'src/components/data-upload/kpi-csv-upload-form';

import { PlayerKpiInputRow } from 'src/sections/games/view/player-kpi-input-row';

// ----------------------------------------------------------------------

// No need for TabPanel or STATS_INPUT_TABS constants anymore

export function EnterStatsForm({ contextId }) {
  const gameId = contextId; // Assuming contextId passed here is the gameId

  // NEW: State for modal open/close
  const [openCsvModal, setOpenCsvModal] = useState(false);

  // --- ALL REACT HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL ---

  // 1. Fetch Necessary Data for the Form
  const { data: kpis = [], isLoading: loadingKpis } = useGetKpisQuery();

  // Primary source for players/managers and their teams in this game
  const { data: gameParticipants = [], isLoading: loadingGameParticipants } =
    useGetGameParticipantsByGameIdQuery(gameId);

  const {
    data: existingPlayerStats = [],
    isLoading: loadingExistingStats,
    refetch: refetchPlayerStats,
  } = useGetPlayerStatsByGameIdQuery(gameId);

  // --- DEBUGGING LOGS FOR DATA FETCHED ---
  useEffect(() => {
    if (gameParticipants.length > 0) {
      console.log('DEBUG: Fetched gameParticipants:', gameParticipants);
      if (gameParticipants[0]) {
        console.log('DEBUG: First game participant structure:', gameParticipants[0]);
        console.log('DEBUG: First participant player_id:', gameParticipants[0].player_id);
        console.log('DEBUG: First participant team_id:', gameParticipants[0].team_id);
        console.log('DEBUG: First participant is_manager:', gameParticipants[0].is_manager);
        console.log('DEBUG: First participant profiles:', gameParticipants[0].profiles);
        console.log('DEBUG: First participant teams:', gameParticipants[0].teams);
      }
    } else if (!loadingGameParticipants) {
      console.warn('DEBUG: No game participants found for game ID:', gameId);
    }
    if (kpis.length > 0) {
      console.log('DEBUG: Fetched kpis:', kpis);
    }
    if (existingPlayerStats.length > 0) {
      console.log('DEBUG: Fetched existingPlayerStats:', existingPlayerStats);
    } else if (!loadingExistingStats) {
      console.info('DEBUG: No existing player stats found for this game.');
    }
  }, [
    gameParticipants,
    existingPlayerStats,
    gameId,
    loadingGameParticipants,
    loadingExistingStats,
    kpis,
  ]);
  // --- END DEBUGGING LOGS FOR DATA FETCHED ---

  // 2. Setup Mutations
  const [createPlayerStat, { isLoading: isCreatingStat }] = useCreatePlayerStatMutation();
  const [updatePlayerStat, { isLoading: isUpdatingStat }] = useUpdatePlayerStatMutation();

  // 3. Create Player-Team Mapping (Crucial for team_id from gameParticipants)
  const playerTeamMap = useMemo(() => {
    const map = new Map();
    gameParticipants.forEach((participant) => {
      if (participant.player_id && participant.team_id) {
        map.set(participant.player_id, participant.team_id);
      } else {
        console.warn(
          'DEBUG: Game participant missing player_id or team_id, skipping mapping:',
          participant
        );
      }
    });
    console.log('DEBUG: Generated playerTeamMap from gameParticipants:', map);
    return map;
  }, [gameParticipants]);

  // 4. State to hold ALL player stats for this form
  const [allGameStats, setAllGameStats] = useState({});

  // 5. Populate form with existing stats on load or data change
  useEffect(() => {
    if (existingPlayerStats.length > 0 && kpis.length > 0) {
      const initialStats = {};
      existingPlayerStats.forEach((stat) => {
        if (!initialStats[stat.player_id]) {
          initialStats[stat.player_id] = {};
        }
        initialStats[stat.player_id][stat.kpi_id] = {
          value: stat.value.toString(),
          date_recorded: stat.date_recorded || new Date().toISOString().split('T')[0],
          team_id: stat.team_id,
          stat_id: stat.id,
        };
      });
      console.log('DEBUG: Initializing allGameStats with existing stats:', initialStats);
      setAllGameStats(initialStats);
    } else if (existingPlayerStats.length === 0) {
      console.log('DEBUG: No existing stats, initializing allGameStats as empty.');
      setAllGameStats({}); // Clear state if no existing stats
    }
  }, [existingPlayerStats, kpis]);

  // 6. Handler for changes from PlayerKpiInputRow
  const handleStatChange = useCallback(
    (playerId, kpiId, updatedEntry) => {
      const teamId = playerTeamMap.get(playerId);
      console.log(
        `DEBUG: handleStatChange for Player ${playerId}, KPI ${kpiId}. Retrieved Team ID: ${teamId}`
      );

      setAllGameStats((prevStats) => ({
        ...prevStats,
        [playerId]: {
          ...(prevStats[playerId] || {}),
          [kpiId]: {
            ...updatedEntry,
            team_id: teamId, // This is where team_id is added to the state
            stat_id: prevStats[playerId]?.[kpiId]?.stat_id,
          },
        },
      }));
    },
    [playerTeamMap]
  );

  // 7. Handle Form Submission (Save all stats)
  const handleSubmit = useCallback(async () => {
    const statsToProcess = [];
    for (const playerId in allGameStats) {
      for (const kpiId in allGameStats[playerId]) {
        const statData = allGameStats[playerId][kpiId];
        // Ensure value is not empty/null and is a number before processing
        if (statData.value !== '' && statData.value !== null && !isNaN(Number(statData.value))) {
          statsToProcess.push({
            game_id: gameId,
            player_id: playerId,
            kpi_id: kpiId,
            value: Number(statData.value),
            date_recorded: statData.date_recorded,
            team_id: statData.team_id, // This `team_id` comes from `allGameStats` state
            stat_id: statData.stat_id,
          });
        }
      }
    }

    console.log('DEBUG: Stats to process before sending to API:', statsToProcess);

    try {
      for (const stat of statsToProcess) {
        if (stat.stat_id) {
          // If stat_id exists, it's an update
          await updatePlayerStat({ id: stat.stat_id, ...stat }).unwrap();
          console.log(`DEBUG: Updated stat ID ${stat.stat_id} for player ${stat.player_id}`);
        } else {
          // Otherwise, it's a new stat
          const { stat_id, ...newStatData } = stat; // Destructure stat_id before sending to create
          await createPlayerStat(newStatData).unwrap();
          console.log(`DEBUG: Created new stat for player ${stat.player_id}`);
        }
      }
      console.log('All player stats processed successfully!');
      refetchPlayerStats(); // Refetch to show updated stats
    } catch (error) {
      console.error('ERROR: Failed to process player stats:', error);
      // You might want to add user-facing error feedback here
    }
  }, [allGameStats, gameId, createPlayerStat, updatePlayerStat, refetchPlayerStats]);

  // 8. Group players/managers by team for better UI organization
  const teamsWithPlayers = useMemo(() => {
    const teamsDataMap = new Map();

    gameParticipants.forEach((participant) => {
      if (participant.teams?.id && participant.profiles?.id) {
        // Initialize team with basic details if not already present
        if (!teamsDataMap.has(participant.teams.id)) {
          teamsDataMap.set(participant.teams.id, { ...participant.teams, players: [] });
        }

        // Add player (or manager) profile to the respective team
        teamsDataMap.get(participant.teams.id)?.players.push({
          id: participant.profiles.id,
          display_name: participant.profiles.display_name,
          first_name: participant.profiles.first_name,
          last_name: participant.profiles.last_name,
          photoURL: participant.profiles.photo_url,
          is_manager: participant.is_manager, // Include is_manager status
        });
      } else {
        console.warn(
          'DEBUG: Game participant missing nested "teams" or "profiles" object, skipping:',
          participant
        );
      }
    });

    console.log(
      'DEBUG: Organized teamsWithPlayers (including managers) for display:',
      Array.from(teamsDataMap.values())
    );
    return Array.from(teamsDataMap.values());
  }, [gameParticipants]);

  // NEW: Handlers for modal
  const handleOpenCsvModal = () => setOpenCsvModal(true);
  const handleCloseCsvModal = () => {
    setOpenCsvModal(false);
    refetchPlayerStats(); // Refetch manual stats after CSV upload might have changed data
  };

  // --- CONDITIONAL RENDERING (AFTER ALL HOOKS) ---
  // Loading state for the form
  if (loadingKpis || loadingGameParticipants || loadingExistingStats) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="h4">Loading Game Statistics Form...</Typography>
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            Fetching participants, KPIs, and existing stats.
          </Typography>
        </Box>
      </Container>
    );
  }

  // Basic error handling
  const errors = [];
  if (!kpis.length) errors.push('No KPIs found.');
  if (!gameParticipants.length)
    errors.push('No game participants found (cannot determine teams or players/managers).');
  if (gameParticipants.length > 0 && playerTeamMap.size === 0) {
    errors.push(
      'Game participants data is malformed; no player-team mappings could be generated. Check console for warnings.'
    );
  }

  if (errors.length > 0) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="h4" color="error">
            Error Loading Form
          </Typography>
          {errors.map((error, index) => (
            <Typography key={index} variant="body2" color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          ))}
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Enter Game Statistics for Game ID: {gameId}
        </Typography>

        {/* Button to open CSV Upload Modal */}
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleOpenCsvModal}
          sx={{ mb: 4, mt: 2 }}
        >
          Upload Stats via CSV
        </Button>

        {/* Manual Entry Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {teamsWithPlayers.length > 0 ? (
            teamsWithPlayers.map((team) => (
              <Paper key={team.id} elevation={2} sx={{ mb: 4, p: 3 }}>
                <Typography variant="h5" color="primary" sx={{ mb: 2 }}>
                  {team.name} ({team.color})
                </Typography>
                {team.players.length > 0 ? (
                  team.players.map((player) => (
                    <Box key={player.id} sx={{ mb: 3 }}>
                      <Typography
                        variant="h6"
                        sx={{ mb: 1, borderBottom: '1px solid #eee', pb: 0.5 }}
                      >
                        {player.display_name || `${player.first_name} ${player.last_name}`}
                        {player.is_manager && ' (Manager)'}
                      </Typography>
                      <Grid container spacing={2}>
                        {kpis.map((kpi) => (
                          <PlayerKpiInputRow
                            key={`${player.id}-${kpi.id}`}
                            playerId={player.id}
                            kpi={kpi}
                            initialStatValue={allGameStats[player.id]?.[kpi.id]}
                            onStatChange={handleStatChange}
                          />
                        ))}
                      </Grid>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No participants assigned to this team in this game.
                  </Typography>
                )}
              </Paper>
            ))
          ) : (
            <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
              No teams or participants found for this game to enter stats.
            </Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={isCreatingStat || isUpdatingStat}
            sx={{ mt: 3 }}
          >
            {isCreatingStat || isUpdatingStat ? 'Saving Stats...' : 'Save All Stats'}
          </Button>
        </form>
      </Box>

      {/* NEW: Modal for CSV Upload */}
      <Modal
        open={openCsvModal}
        onClose={handleCloseCsvModal}
        aria-labelledby="csv-upload-modal-title"
        aria-describedby="csv-upload-modal-description"
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: '80%', md: 600 }, // Responsive width
            bgcolor: 'background.paper',
            border: '2px solid #000',
            boxShadow: 24,
            p: 4,
            maxHeight: '90vh', // Ensure it doesn't overflow tall screens
            overflowY: 'auto', // Add scroll if content is too long
          }}
        >
          <Typography id="csv-upload-modal-title" variant="h6" component="h2" gutterBottom>
            Upload Game Stats via CSV
          </Typography>
          <KpiCsvUploadForm gameId={gameId} onUploadSuccess={handleCloseCsvModal} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button onClick={handleCloseCsvModal} variant="outlined" color="primary">
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
    </Container>
  );
}
