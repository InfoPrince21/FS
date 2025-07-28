// src/sections/games/view/game-list-view.jsx (your current file)
import { Link } from 'react-router'; // Changed from 'react-router' to 'react-router-dom' for Link
import { useEffect, useState, useCallback } from 'react';

import {
  Box,
  Typography,
  Card,
  CircularProgress,
  Alert,
  Stack,
  CardContent,
  Grid,
  Button,
  CardActions,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { useDeletePlayerStatsByGameIdMutation } from 'src/features/stats/statsAPI';
import {
  useGetGamesQuery,
  useDeleteGameMutation,
  useDeleteDraftPicksByGameIdMutation,
  useDeleteGameAchievementsByGameIdMutation, // Import the new hook
} from 'src/features/games/gamesAPI';

import { Iconify } from 'src/components/iconify';

// Helper function for robust date parsing and formatting (kept as is)
const formatRobustDate = (dateString, type = 'date') => {
  if (!dateString) {
    return 'N/A';
  }

  const isoRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;
  const match = String(dateString).match(isoRegex);

  let parseableString = null;
  if (match && match[1]) {
    parseableString = match[1];
  } else {
    if (String(dateString).includes(' ') && !String(dateString).includes('T')) {
      parseableString = String(dateString).replace(' ', 'T').substring(0, 19);
    } else {
      parseableString = String(dateString).substring(0, 19);
    }
  }

  if (!parseableString) {
    return 'N/A (Parse Error)';
  }

  const date = new Date(parseableString);

  if (isNaN(date.getTime())) {
    return 'N/A (Invalid Date)';
  }

  if (type === 'date') {
    return date.toLocaleDateString();
  }
  return date.toLocaleString();
};

export function GameListView() {
  const { data: games = [], isLoading, isError, error, refetch } = useGetGamesQuery();

  // Mutations for deletion
  const [deleteGame, { isLoading: isDeletingGame }] = useDeleteGameMutation();
  const [deleteDraftPicks, { isLoading: isDeletingDraftPicks }] =
    useDeleteDraftPicksByGameIdMutation();
  const [deletePlayerStats, { isLoading: isDeletingPlayerStats }] =
    useDeletePlayerStatsByGameIdMutation();
  const [deleteGameAchievements, { isLoading: isDeletingGameAchievements }] = // Use the new hook
    useDeleteGameAchievementsByGameIdMutation();

  // State for confirmation dialog
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [gameToDelete, setGameToDelete] = useState(null);

  // State for Snackbar notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  useEffect(() => {
    if (games.length > 0) {
      console.log('Fetched Games Data (CONFIRMED ISO FORMAT):', games);
    }
  }, [games]);

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

  const handleDeleteClick = (game) => {
    setGameToDelete(game);
    setOpenConfirmDialog(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!gameToDelete) return;

    setOpenConfirmDialog(false); // Close dialog immediately

    try {
      // Order is crucial: Delete children first, then the parent
      // 1. Delete associated player stats
      await deletePlayerStats(gameToDelete.id).unwrap();
      console.log(`Successfully deleted player stats for game ID: ${gameToDelete.id}`);

      // 2. Delete associated draft picks
      await deleteDraftPicks(gameToDelete.id).unwrap();
      console.log(`Successfully deleted draft picks for game ID: ${gameToDelete.id}`);

      // 3. Delete associated game achievements (NEW STEP)
      await deleteGameAchievements(gameToDelete.id).unwrap();
      console.log(`Successfully deleted game achievements for game ID: ${gameToDelete.id}`);

      // 4. Delete the game itself
      await deleteGame(gameToDelete.id).unwrap();
      console.log(`Successfully deleted game: ${gameToDelete.name} (ID: ${gameToDelete.id})`);

      showSnackbar(
        `Game "${gameToDelete.name}" and all associated data deleted successfully.`,
        'success'
      );
      // RTK Query's invalidatesTags will handle the UI refresh. No explicit refetch() needed here.
    } catch (err) {
      console.error('Failed to delete game and its associated data:', err);
      // Refine error message using the detailed 'data' if available from the backend
      const errorMessage = err.data?.message || err.message || 'Unknown error.';
      showSnackbar(`Failed to delete game "${gameToDelete.name}". Error: ${errorMessage}`, 'error');
    } finally {
      setGameToDelete(null); // Clear the game to delete state
    }
  }, [
    gameToDelete,
    deletePlayerStats,
    deleteDraftPicks,
    deleteGameAchievements,
    deleteGame,
    showSnackbar,
  ]); // Add new mutation to dependencies

  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
    setGameToDelete(null); // Clear the game to delete state
  };

  // Determine if any deletion is in progress
  const isAnyDeletionLoading =
    isDeletingGame || isDeletingDraftPicks || isDeletingPlayerStats || isDeletingGameAchievements; // Include new mutation's loading state

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        List of Games
      </Typography>

      <Button
        component={Link}
        to={paths.dashboard.game.new}
        variant="contained"
        color="primary"
        startIcon={<Iconify icon="eva:plus-fill" />}
        sx={{ mb: 3 }}
      >
        Create New Game
      </Button>

      {/* Loading State */}
      {(isLoading || isAnyDeletionLoading) && (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
          <CircularProgress />
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            {isAnyDeletionLoading ? 'Deleting game and associated data...' : 'Loading games...'}
          </Typography>
        </Stack>
      )}

      {/* Error State */}
      {isError && (
        <Alert severity="error" sx={{ my: 3 }}>
          Error: {error?.message || 'Failed to fetch games.'}
        </Alert>
      )}

      {/* Display Games using Cards */}
      {!isLoading && !isError && games.length > 0 && (
        <Grid container spacing={3} sx={{ mt: 3 }}>
          {games.map((game) => (
            <Grid item xs={12} sm={6} md={4} key={game.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="div">
                    {game.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    **Description:** {game.description || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    **Teams:** {game.number_of_teams || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    **Start Date:** {formatRobustDate(game.start_date, 'date')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    **End Date:** {formatRobustDate(game.end_date, 'date')}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                  <Button
                    component={Link}
                    to={paths.dashboard.game.details(game.id)}
                    variant="contained"
                    color="info"
                    size="small"
                    startIcon={<Iconify icon="eva:info-fill" />}
                    disabled={isAnyDeletionLoading}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<Iconify icon="eva:trash-2-outline" />}
                    onClick={() => handleDeleteClick(game)}
                    disabled={isAnyDeletionLoading}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty State */}
      {!isLoading && !isError && games.length === 0 && (
        <Alert severity="info" sx={{ my: 3 }}>
          No games found. Start by creating a new game!
        </Alert>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={openConfirmDialog}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-description"
      >
        <DialogTitle id="confirm-delete-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-delete-description">
            Are you sure you want to delete the game &quot;**{gameToDelete?.name}**&quot;?
            <br />
            **This action will permanently delete all associated player stats, draft picks,{' '}
            <span style={{ fontWeight: 'bold', color: 'red' }}>and game achievements</span> for this
            game.** This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseConfirmDialog}
            color="primary"
            disabled={isAnyDeletionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={isAnyDeletionLoading}
            startIcon={
              isAnyDeletionLoading ? (
                <CircularProgress size={20} />
              ) : (
                <Iconify icon="eva:trash-2-outline" />
              )
            }
          >
            {isAnyDeletionLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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
    </Box>
  );
}
