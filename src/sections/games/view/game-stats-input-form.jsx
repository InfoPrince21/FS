// src/components/data-upload/game-stats-input-form.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Grid,
  Snackbar,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';

import { useGetGameParticipantsByGameIdQuery } from 'src/features/games/gamesAPI';
import {
  useGetGameKpisByGameIdQuery,
  useCreatePlayerStatsMutation,
} from 'src/features/stats/statsAPI';

import { KpiCsvUploadForm } from 'src/components/data-upload/kpi-csv-upload-form';

import { PlayerKpiInputRow } from './player-kpi-input-row';

// Helper component for Tab Panels
function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Helper function for accessibility props for tabs
function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export function GameStatsInputForm({ gameId }) {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  const [statsData, setStatsData] = useState({});

  const [currentTab, setCurrentTab] = useState(0); // 0 for Manual Entry, 1 for CSV Upload.

  const {
    data: gameKpis = [],
    isLoading: isLoadingKpis,
    isError: isErrorKpis,
    error: kpisError,
    refetch: refetchGameKpis,
  } = useGetGameKpisByGameIdQuery(gameId);

  const {
    data: gameParticipants = [],
    isLoading: isLoadingParticipants,
    isError: isErrorParticipants,
    error: participantsError,
    refetch: refetchGameParticipants,
  } = useGetGameParticipantsByGameIdQuery(gameId);

  const [
    createPlayerStats,
    { isLoading: isCreatingStats, isSuccess, isError: isMutationError, error: mutationError },
  ] = useCreatePlayerStatsMutation();

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
    return map;
  }, [gameParticipants]);

  useEffect(() => {
    console.log('DEBUG: Generated playerTeamMap (GameStatsInputForm):', playerTeamMap);
  }, [playerTeamMap]);

  // NEW: Function to initialize/reset the form
  const resetManualEntryForm = useCallback(() => {
    const initialStats = {};
    const today = new Date().toISOString().split('T')[0];

    gameParticipants.forEach((participant) => {
      if (!participant || !participant.player_id) {
        console.warn(
          'Skipping participant due to missing player_id in resetManualEntryForm:',
          participant
        );
        return;
      }

      const playerId = participant.player_id;
      const teamId = playerTeamMap.get(playerId);

      if (!teamId) {
        console.warn(
          `DEBUG: No team_id found for participant ${playerId} in playerTeamMap during reset. Skipping initialization for this participant.`,
          participant
        );
        return;
      }

      initialStats[playerId] = {};
      gameKpis.forEach((kpi) => {
        if (!kpi || !kpi.id) {
          console.warn('Skipping KPI due to missing id in resetManualEntryForm:', kpi);
          return;
        }
        initialStats[playerId][kpi.id] = {
          value: '',
          date_recorded: today,
          team_id: teamId,
        };
      });
    });
    console.log('DEBUG: Resetting statsData (GameStatsInputForm):', initialStats);
    setStatsData(initialStats);
  }, [gameKpis, gameParticipants, playerTeamMap]); // Dependencies for useCallback

  // Call the reset function on initial mount or when dependencies change
  useEffect(() => {
    // Only reset if KPIs and participants are loaded, to avoid resetting an empty form immediately
    if (gameKpis.length > 0 && gameParticipants.length > 0) {
      resetManualEntryForm();
    }
  }, [resetManualEntryForm, gameKpis.length, gameParticipants.length]); // Added length checks

  const handleChildStatChange = useCallback(
    (playerId, kpiId, updatedEntry) => {
      const teamId = playerTeamMap.get(playerId);
      console.log(
        `DEBUG: handleChildStatChange for Player ${playerId}, KPI ${kpiId}. Retrieved Team ID: ${teamId}`
      );

      setStatsData((prevStats) => {
        const updatedPlayerStats = {
          ...(prevStats[playerId] || {}),
          [kpiId]: {
            ...updatedEntry,
            team_id: teamId,
          },
        };
        return {
          ...prevStats,
          [playerId]: updatedPlayerStats,
        };
      });
    },
    [playerTeamMap]
  );

  const showSnackbar = useCallback((message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log('handleSubmit initiated. Final statsData:', statsData);

    const submissionPromises = [];
    let successfulSubmissionsCount = 0;
    let failedSubmissionsCount = 0;
    let skippedSubmissionsCount = 0;

    const playerMap = new Map(
      gameParticipants.map((p) => [
        p.player_id,
        p.profiles?.display_name ||
          `${p.profiles?.first_name || ''} ${p.profiles?.last_name || ''}`,
      ])
    );
    const kpiMap = new Map(gameKpis.map((k) => [k.id, k.name]));

    for (const playerId in statsData) {
      if (Object.prototype.hasOwnProperty.call(statsData, playerId)) {
        for (const kpiId in statsData[playerId]) {
          if (Object.prototype.hasOwnProperty.call(statsData[playerId], kpiId)) {
            const statEntry = statsData[playerId][kpiId];
            const parsedValue = parseInt(statEntry.value, 10);
            const dateRecorded = statEntry.date_recorded;
            const teamId = statEntry.team_id;

            if (!isNaN(parsedValue) && dateRecorded && teamId) {
              const statToRecord = {
                game_id: gameId,
                player_id: playerId,
                kpi_id: kpiId,
                value: parsedValue,
                date_recorded: dateRecorded,
                team_id: teamId,
              };

              console.log('DEBUG: Submitting stat:', statToRecord);

              submissionPromises.push(
                createPlayerStats(statToRecord)
                  .unwrap()
                  .then(() => {
                    successfulSubmissionsCount++;
                    console.log(
                      `Successfully recorded stat for participant ${playerMap.get(playerId) || playerId} / KPI ${kpiMap.get(kpiId) || kpiId}`
                    );
                  })
                  .catch((err) => {
                    failedSubmissionsCount++;
                    console.groupCollapsed(
                      `Error for ${playerMap.get(playerId) || 'Unknown Participant'} / ${kpiMap.get(kpiId) || 'Unknown KPI'}`
                    );
                    console.error('Full error object:', err);
                    console.error('Error status:', err.status);
                    console.error('Error data:', err.data);
                    console.error('Error message (from err.message):', err.message);
                    console.error('Error error (from err.error):', err.error);
                    console.groupEnd();
                  })
              );
            } else {
              skippedSubmissionsCount++;
              console.warn(
                `Skipping invalid stat entry for Participant ${playerMap.get(playerId) || playerId}, KPI ${kpiMap.get(kpiId) || kpiId}. Value: '${statEntry.value}' (parsed: ${parsedValue}), Date: '${dateRecorded}', Team ID: '${teamId}'`
              );
            }
          }
        }
      }
    }

    if (submissionPromises.length === 0) {
      showSnackbar('No valid stats to submit.', 'info');
      return;
    }

    try {
      await Promise.allSettled(submissionPromises);

      if (successfulSubmissionsCount > 0 && failedSubmissionsCount === 0) {
        showSnackbar('All valid stats submitted successfully!', 'success');
        resetManualEntryForm(); // <--- Clear the form on full success
      } else if (successfulSubmissionsCount > 0 && failedSubmissionsCount > 0) {
        showSnackbar(
          `Some stats submitted successfully (${successfulSubmissionsCount}), but ${failedSubmissionsCount} failed. Check console for details.`,
          'warning'
        );
      } else if (failedSubmissionsCount > 0) {
        showSnackbar('All stat submissions failed. Check console for details.', 'error');
      } else {
        showSnackbar('No valid stats were processed for submission.', 'info');
      }
    } catch (error) {
      console.error('An unexpected error occurred during stat submission:', error);
      showSnackbar('An unexpected error occurred during submission.', 'error');
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Handle CSV upload success (passed to KpiCsvUploadForm)
  const handleCsvUploadSuccess = () => {
    showSnackbar('CSV data uploaded successfully!', 'success');
    setCurrentTab(0); // Switch back to manual entry tab after successful CSV upload
    // Refetch data to ensure manual entry view reflects any changes from CSV upload
    refetchGameKpis();
    refetchGameParticipants();
    resetManualEntryForm(); // <--- Also reset manual form state if CSV upload success
  };

  if (isLoadingKpis || isLoadingParticipants) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 3 }}>
        <CircularProgress size={30} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Loading stats input data...
        </Typography>
      </Stack>
    );
  }

  if (isErrorKpis || isErrorParticipants) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        Error loading data for stats input:{' '}
        {kpisError?.message || participantsError?.message || 'Unknown error.'}{' '}
      </Alert>
    );
  }

  if (gameKpis.length === 0) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No KPIs defined for this game. Cannot enter participant stats.
      </Alert>
    );
  }

  if (gameParticipants.length === 0) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No participants found for this game yet. Cannot enter participant stats.
      </Alert>
    );
  }

  return (
    <Card sx={{ mt: 3, mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Enter Participant Stats
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="stats input tabs">
            <Tab label="Manual Entry" {...a11yProps(0)} />
            <Tab label="CSV Upload" {...a11yProps(1)} />
          </Tabs>
        </Box>

        <CustomTabPanel value={currentTab} index={0}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              {gameParticipants.map((participant) => {
                if (!participant || !participant.player_id) {
                  console.warn(
                    'Skipping participant section due to missing player_id:',
                    participant
                  );
                  return null;
                }

                const participantId = participant.player_id;
                const participantDisplayName =
                  participant.profiles?.display_name ||
                  `${participant.profiles?.first_name || ''} ${
                    participant.profiles?.last_name || ''
                  }`;

                return (
                  <Grid item xs={12} key={participantId}>
                    <Card variant="outlined" sx={{ p: 2, mb: 1 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Participant: {participantDisplayName}
                        {participant.teams?.name && (
                          <Box
                            component="span"
                            sx={{
                              ml: 1,
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              bgcolor: participant.teams.color || 'grey.200',
                              color: participant.teams.color ? 'white' : 'text.primary',
                              fontSize: '0.8rem',
                            }}
                          >
                            {participant.teams.name}
                          </Box>
                        )}
                      </Typography>
                      <Grid container spacing={1}>
                        {gameKpis.map((kpi) => {
                          if (!kpi || !kpi.id) {
                            console.warn(
                              `Skipping KPI input for Participant ${participantId} due to missing KPI or KPI ID:`,
                              kpi
                            );
                            return null;
                          }
                          const currentStatEntry = statsData[participantId]?.[kpi.id];

                          return (
                            <PlayerKpiInputRow
                              key={`${participantId}-${kpi.id}`}
                              playerId={participantId}
                              kpi={kpi}
                              initialStatValue={currentStatEntry}
                              onStatChange={handleChildStatChange}
                            />
                          );
                        })}
                      </Grid>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{ mt: 3 }}
              disabled={isCreatingStats}
            >
              {isCreatingStats ? <CircularProgress size={24} /> : 'Save All Participant Stats'}
            </Button>
          </form>
        </CustomTabPanel>

        <CustomTabPanel value={currentTab} index={1}>
          <KpiCsvUploadForm gameId={gameId} onUploadSuccess={handleCsvUploadSuccess} />
        </CustomTabPanel>
      </CardContent>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Card>
  );
}
