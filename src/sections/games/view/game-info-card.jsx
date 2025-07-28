// src/sections/games/view/game-info-card.jsx
import dayjs from 'dayjs';
import React, { useState, useEffect, useCallback } from 'react';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Box,
  Card,
  Grid,
  List,
  Alert,
  Stack,
  Button,
  Divider,
  ListItem,
  Typography,
  CardContent,
  ListItemText,
  CircularProgress,
} from '@mui/material';

import { useUpdateGameMutation } from 'src/features/games/gamesAPI'; // Only keep useUpdateGameMutation

import { Iconify } from 'src/components/iconify';
import { getDefaultIcon } from 'src/components/icon-picker/icon-picker';
import { H2HScheduleDisplay } from 'src/components/game/h2h-schedule-display'; // <-- ADDED THIS IMPORT

const formatRobustDate = (dateString, type = 'date') => {
  if (!dateString) return 'N/A';
  const isoRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;
  const match = String(dateString).match(isoRegex);
  let parseableString = null;
  if (match && match[1]) {
    parseableString = match[1];
  } else {
    // Handle cases where 'T' might be missing but is space-separated or needs substring
    if (String(dateString).includes(' ') && !String(dateString).includes('T')) {
      parseableString = String(dateString).replace(' ', 'T').substring(0, 19);
    } else {
      // Fallback for various date string formats, attempt to get first 19 chars for YYYY-MM-DDTHH:MM:SS
      parseableString = String(dateString).substring(0, 19);
    }
  }
  if (!parseableString) return 'N/A (Parse Error)';
  const date = new Date(parseableString);
  if (isNaN(date.getTime())) return 'N/A (Invalid Date)';
  if (type === 'date') return date.toLocaleDateString();
  return date.toLocaleString();
};

// ADDED h2hGameTypeIds to props
export function GameInfoCard({ game, gameKpis, onGameUpdated, h2hGameTypeIds }) {
  const [isEditing, setIsEditing] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const [
    updateGame,
    {
      isLoading: isUpdatingGame,
      isSuccess: updateGameSuccess,
      isError: updateGameError,
      error: updateGameDetailedError,
    },
  ] = useUpdateGameMutation();

  // Effect to initialize start/end dates from game prop
  useEffect(() => {
    if (game.start_date) {
      setStartDate(dayjs(game.start_date));
    } else {
      setStartDate(null); // Ensure it's null if not set
    }
    if (game.end_date) {
      setEndDate(dayjs(game.end_date));
    } else {
      setEndDate(null); // Ensure it's null if not set
    }
  }, [game.start_date, game.end_date]);

  // Effect to handle feedback after game date update mutation
  useEffect(() => {
    if (updateGameSuccess) {
      setEditSuccess('Game dates updated successfully!');
      setIsEditing(false); // Exit editing mode on success
      // Optional: Call onGameUpdated if prop is provided, to trigger parent re-fetch or state update
      if (onGameUpdated) {
        onGameUpdated();
      }
    }
    if (updateGameError) {
      // Use the detailed error message if available, otherwise a generic one
      setEditError(
        `Failed to update game dates: ${updateGameDetailedError?.data?.message || updateGameDetailedError?.message || 'Unknown error'}`
      );
    }
  }, [updateGameSuccess, updateGameError, updateGameDetailedError, onGameUpdated]);

  // Toggle edit mode and reset states
  const handleEditToggle = useCallback(() => {
    setIsEditing((prev) => {
      // If turning off edit mode (i.e., prev was true), reset dates to original game dates
      if (prev) {
        setStartDate(game.start_date ? dayjs(game.start_date) : null);
        setEndDate(game.end_date ? dayjs(game.end_date) : null);
      }
      setEditError('');
      setEditSuccess('');
      return !prev;
    });
  }, [game.start_date, game.end_date]); // Dependencies for useCallback

  // Handle saving updated game dates
  const handleSave = async () => {
    setEditError('');
    setEditSuccess('');

    // Basic client-side validation
    if (!startDate || !endDate || !startDate.isValid() || !endDate.isValid()) {
      setEditError('Both start and end dates must be valid.');
      return;
    }

    if (endDate.isBefore(startDate, 'day')) {
      setEditError('End date cannot be before start date.');
      return;
    }

    try {
      // unwrap() throws an error if the mutation fails, caught by the outer try/catch
      await updateGame({
        id: game.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      }).unwrap();
      // Success handled by useEffect
    } catch (err) {
      // Error is handled by the useEffect watching updateGameError, so no need to set state here again.
      // console.error('Error in handleSave mutation:', err);
    }
  };

  // Add a check for 'game' object itself. If it's undefined, we can't render anything meaningful.
  if (!game) {
    return (
      <Grid item xs={12} md={6}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Alert severity="warning">No game data available.</Alert>
          </CardContent>
        </Card>
      </Grid>
    );
  }

  // Determine if the current game type is considered 'H2H' to conditionally render the display
  const isH2HGameType = h2hGameTypeIds && h2hGameTypeIds.includes(game.game_type_id);

  console.log('***DEBUG*** GameInfoCard received gameKpis:', gameKpis);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" gutterBottom>
                Game Information
              </Typography>
              <Button variant="outlined" onClick={handleEditToggle} disabled={isUpdatingGame}>
                {isEditing ? 'Cancel' : 'Edit Dates'}
              </Button>
            </Stack>

            {editError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {editError}
              </Alert>
            )}
            {/* Consolidated updateGameError alert */}
            {updateGameError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Error updating game dates:{' '}
                {updateGameDetailedError?.data?.message ||
                  updateGameDetailedError?.message ||
                  'Unknown error'}
              </Alert>
            )}
            {/* Consolidated updateGameSuccess alert */}
            {editSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {editSuccess}
              </Alert>
            )}

            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Description:</strong> {game.description || 'N/A'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              <strong>Number of Teams:</strong> {game.number_of_teams || 'N/A'}
            </Typography>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                {isEditing ? (
                  <>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={(newValue) => setStartDate(newValue)}
                      slotProps={{
                        textField: {
                          id: 'game-start-date-edit',
                          required: true,
                          error: !startDate || !startDate.isValid(),
                          helperText:
                            !startDate || !startDate.isValid() ? 'Start date is required.' : '',
                        },
                      }}
                      sx={{ flex: 1 }}
                      disabled={isUpdatingGame}
                    />
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={(newValue) => setEndDate(newValue)}
                      slotProps={{
                        textField: {
                          id: 'game-end-date-edit',
                          required: true,
                          error:
                            !endDate ||
                            !endDate.isValid() ||
                            (startDate && endDate && endDate.isBefore(startDate, 'day')),
                          helperText:
                            !endDate || !endDate.isValid()
                              ? 'End date is required.'
                              : startDate && endDate && endDate.isBefore(startDate, 'day')
                                ? 'End date cannot be before start date.'
                                : '',
                        },
                      }}
                      sx={{ flex: 1 }}
                      disabled={isUpdatingGame}
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="body1" color="text.secondary">
                      <strong>Start Date:</strong> {formatRobustDate(game.start_date, 'date')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      <strong>End Date:</strong> {formatRobustDate(game.end_date, 'date')}
                    </Typography>
                  </>
                )}
              </Stack>
            </LocalizationProvider>
            {isEditing && (
              <Button
                variant="contained"
                onClick={handleSave}
                sx={{ mt: 3 }}
                disabled={
                  isUpdatingGame ||
                  !startDate ||
                  !endDate ||
                  !startDate.isValid() ||
                  endDate.isBefore(startDate, 'day')
                }
                startIcon={isUpdatingGame ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {isUpdatingGame ? 'Saving...' : 'Save Dates'}
              </Button>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Associated KPIs
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {gameKpis && gameKpis.length > 0 ? (
              <List dense>
                {gameKpis.map((kpi) => (
                  <ListItem key={kpi.id}>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {kpi.icon_name && (
                            <Iconify icon={getDefaultIcon(kpi.icon_name)} width={20} height={20} />
                          )}
                          <Typography variant="body2" fontWeight="bold">
                            {kpi.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            (Points: {kpi.points})
                          </Typography>
                        </Stack>
                      }
                      secondary={kpi.description}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">No KPIs associated with this game.</Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* --- ADDED: H2H Schedule Display --- */}
      {isH2HGameType && (
        <Grid item xs={12}>
          <H2HScheduleDisplay game={game} h2hGameTypeIds={h2hGameTypeIds} />
        </Grid>
      )}
      {/* --- END ADDED --- */}
    </Grid>
  );
}
