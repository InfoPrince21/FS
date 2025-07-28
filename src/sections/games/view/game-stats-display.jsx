// src/sections/games/view/game-stats-display.jsx

import React, { useMemo, useState, useEffect } from 'react';

import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

import {
  useGetGamePlayerStatsQuery,
  useDeletePlayerStatMutation,
  useUpdatePlayerStatMutation,
} from 'src/features/stats/statsAPI';

export function GameStatsDisplay({ gameId }) {
  const {
    data: playerStats = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useGetGamePlayerStatsQuery(gameId);

  const [openEditDeleteModal, setOpenEditDeleteModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState(null);
  const [editedValue, setEditedValue] = useState('');
  const [editedDate, setEditedDate] = useState('');

  // Use separate error states for better feedback
  const [deletePlayerStat, { isLoading: isDeleting, isError: isDeleteError, error: deleteError }] =
    useDeletePlayerStatMutation();
  const [updatePlayerStat, { isLoading: isUpdating, isError: isUpdateError, error: updateError }] =
    useUpdatePlayerStatMutation();
  const [modalError, setModalError] = useState(null); // State for errors within the modal

  useEffect(() => {
    if (selectedStat) {
      setEditedValue(selectedStat.value.toString());
      if (selectedStat.dateRecorded) {
        const dateString = selectedStat.dateRecorded.split('T')[0];
        setEditedDate(dateString);
      } else {
        setEditedDate('');
      }
      setModalError(null); // Clear previous errors when a new stat is selected
    }
  }, [selectedStat]);

  const handleOpenEditDeleteModal = (stat) => {
    setSelectedStat(stat);
    setOpenEditDeleteModal(true);
  };

  const handleCloseEditDeleteModal = () => {
    setOpenEditDeleteModal(false);
    setSelectedStat(null);
    setEditedValue('');
    setEditedDate('');
    setModalError(null); // Clear errors on close
  };

  const handleUpdateStat = async () => {
    setModalError(null); // Clear previous error before new attempt
    if (!selectedStat) {
      setModalError('No stat selected for update.');
      return;
    }

    const parsedValue = parseFloat(editedValue);
    if (isNaN(parsedValue)) {
      setModalError('Please enter a valid number for the stat value.');
      return;
    }

    try {
      const dateForDb = editedDate || null;

      // --- DEBUGGING CONSOLE LOGS ---
      console.log('Attempting to update stat with payload:');
      console.log('Stat ID:', selectedStat.statId);
      console.log('New Value:', parsedValue);
      console.log('New Date Recorded:', dateForDb);
      // Ensure selectedStat contains all necessary IDs for the backend if needed
      console.log('Full selectedStat object:', selectedStat);
      // --- END DEBUGGING CONSOLE LOGS ---

      await updatePlayerStat({
        id: selectedStat.statId, // This must be the unique ID for the player_stats record
        patch: {
          value: parsedValue,
          date_recorded: dateForDb,
        },
      }).unwrap();

      refetch();
      handleCloseEditDeleteModal();
      console.log(`Stat ${selectedStat.statId} updated successfully.`);
    } catch (err) {
      console.error('Failed to update stat:', err);
      // Provide a more detailed error message to the user/modal
      setModalError(
        `Failed to update stat: ${err?.data?.message || err.message || JSON.stringify(err)}`
      );
    }
  };

  const handleDeleteStat = async () => {
    setModalError(null); // Clear previous error before new attempt
    if (!selectedStat) {
      setModalError('No stat selected for deletion.');
      return;
    }

    if (window.confirm('Are you sure you want to permanently delete this stat entry?')) {
      try {
        // --- DEBUGGING CONSOLE LOG ---
        console.log('Attempting to delete stat with ID:', selectedStat.statId);
        // --- END DEBUGGING CONSOLE LOG ---

        await deletePlayerStat(selectedStat.statId).unwrap();
        refetch();
        handleCloseEditDeleteModal();
        console.log(`Stat ${selectedStat.statId} deleted successfully.`);
      } catch (err) {
        console.error('Failed to delete stat:', err);
        setModalError(
          `Failed to delete stat: ${err?.data?.message || err.message || JSON.stringify(err)}`
        );
      }
    }
  };

  const organizedStats = useMemo(() => {
    const statsByPlayer = {};
    playerStats.forEach((stat) => {
      const playerId = stat.profiles?.id;
      const playerName =
        stat.profiles?.display_name ||
        `${stat.profiles?.first_name || ''} ${stat.profiles?.last_name || ''}`;
      const kpiName = stat.kpis?.name;
      const kpiPoints = stat.kpis?.points;
      const kpiId = stat.kpi_id;
      const statGameId = stat.game_id;

      if (!playerId || !playerName || !kpiName) {
        console.warn('GameStatsDisplay - Skipping stat due to missing profiles/KPI data:', stat);
        return;
      }

      if (!statsByPlayer[playerId]) {
        statsByPlayer[playerId] = {
          name: playerName,
          totalScore: 0,
          kpis: [],
          id: playerId,
        };
      }
      const score = (stat.value || 0) * (kpiPoints || 0);
      statsByPlayer[playerId].kpis.push({
        kpiName,
        kpiPoints,
        value: stat.value,
        score,
        dateRecorded: stat.date_recorded,
        statId: stat.id, // This is critical for identifying the record to update/delete
        kpiId,
        playerId,
        gameId: statGameId,
      });
      statsByPlayer[playerId].totalScore += score;
    });

    return Object.values(statsByPlayer)
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((playerInfo) => ({
        ...playerInfo,
        kpis: playerInfo.kpis.sort((a, b) => a.kpiName.localeCompare(b.kpiName)),
      }));
  }, [playerStats]);

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return 'Unknown Date';

    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const monthName = monthNames[parseInt(month, 10) - 1];

    return `${monthName} ${parseInt(day, 10)}, ${year}`;
  };

  if (isLoading || isDeleting || isUpdating) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
        <CircularProgress size={24} />
        <Typography sx={{ ml: 2 }}>
          {isDeleting
            ? 'Deleting stat...'
            : isUpdating
              ? 'Updating stat...'
              : 'Loading player stats...'}
        </Typography>
      </Box>
    );
  }

  // General API errors (not specific to modal operations)
  if (isError) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        Error loading player stats: {error?.message || JSON.stringify(error)}
      </Alert>
    );
  }

  // Errors for delete/update operations are now handled by modalError state for better UX
  // if (isDeleteError) {
  //   return ( /* ... */ );
  // }
  // if (isUpdateError) {
  //   return ( /* ... */ );
  // }

  if (organizedStats.length === 0) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No stats recorded for this game yet.
      </Alert>
    );
  }

  return (
    <Card sx={{ mt: 3, mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recorded Player Stats
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {organizedStats.map((playerInfo) => (
          <Box key={playerInfo.id} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              {playerInfo.name} (Total Score: {playerInfo.totalScore})
            </Typography>
            <Grid container spacing={1} sx={{ pl: 2 }}>
              {playerInfo.kpis.map((kpiStat, index) => (
                <Grid item xs={12} sm={6} md={4} key={kpiStat.statId || index}>
                  <ListItem disablePadding sx={{ py: 0.5, pr: 0 }}>
                    <ListItemText
                      primary={`${kpiStat.kpiName}: ${kpiStat.value} (${kpiStat.kpiPoints} pts/unit = ${kpiStat.score} score)`}
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          Recorded on: {formatDateForDisplay(kpiStat.dateRecorded)}
                        </Typography>
                      }
                    />
                    {kpiStat.statId && (
                      <IconButton
                        edge="end"
                        aria-label="edit/delete"
                        onClick={() => handleOpenEditDeleteModal(kpiStat)}
                        disabled={isDeleting || isUpdating}
                        size="small"
                        sx={{ ml: 1 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                  </ListItem>
                </Grid>
              ))}
            </Grid>
            <Divider sx={{ mt: 2 }} />
          </Box>
        ))}
      </CardContent>

      <Dialog
        open={openEditDeleteModal}
        onClose={handleCloseEditDeleteModal}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Edit/Delete Stat
          <IconButton
            aria-label="close"
            onClick={handleCloseEditDeleteModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {modalError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {modalError}
            </Alert>
          )}
          {selectedStat && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Player: {selectedStat.name || 'N/A'}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                KPI: {selectedStat.kpiName}
              </Typography>
              {/* Ensure statId is correct */}
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Stat ID: {selectedStat.statId}
              </Typography>
              <TextField
                autoFocus
                margin="dense"
                id="value"
                label="Stat Value"
                type="number"
                fullWidth
                variant="outlined"
                value={editedValue}
                onChange={(e) => setEditedValue(e.target.value)}
                sx={{ mt: 2 }}
              />
              <TextField
                margin="dense"
                id="date"
                label="Date Recorded"
                type="date"
                fullWidth
                variant="outlined"
                value={editedDate}
                onChange={(e) => setEditedDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteStat}
            color="error"
            disabled={isDeleting || isUpdating}
            variant="outlined"
          >
            Delete
          </Button>
          <Button
            onClick={handleUpdateStat}
            color="primary"
            disabled={isDeleting || isUpdating || isNaN(parseFloat(editedValue))}
            variant="contained"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
