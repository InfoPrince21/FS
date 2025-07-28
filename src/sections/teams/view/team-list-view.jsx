// src/sections/teams/view/team-list-view.jsx
import { Link } from 'react-router'; // Use react-router-dom's Link
import { useEffect, useState, useCallback } from 'react'; // Import useState and useCallback

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
  Dialog, // For confirmation dialog
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar, // For success/error messages
} from '@mui/material';

import { paths } from 'src/routes/paths'; // Import paths for navigation

import { useDeleteDraftPicksByTeamIdMutation } from 'src/features/games/gamesAPI'; // Import the new draft pick deletion hook
import { useGetTeamsQuery, useDeleteTeamMutation } from 'src/features/teams/teamsAPI'; // Import the team deletion hook

import { Iconify } from 'src/components/iconify';

// Helper function for robust date parsing and formatting (consistent with your other views)
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
    // Attempt to handle cases where there's a space instead of 'T' for date-time
    if (String(dateString).includes(' ') && !String(dateString).includes('T')) {
      parseableString = String(dateString).replace(' ', 'T').substring(0, 19);
    } else {
      // Fallback for just date strings or malformed strings, try to get first 19 chars
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

export function TeamListView() {
  const { data: teams = [], isLoading, isError, error } = useGetTeamsQuery();

  // Mutations for deletion
  const [deleteTeam, { isLoading: isDeletingTeam }] = useDeleteTeamMutation();
  const [deleteDraftPicks, { isLoading: isDeletingDraftPicks }] =
    useDeleteDraftPicksByTeamIdMutation();

  // State for confirmation dialog
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);

  // State for Snackbar notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  useEffect(() => {
    if (teams.length > 0) {
      console.log('Fetched Teams Data:', teams);
    }
  }, [teams]);

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

  const handleDeleteClick = (team) => {
    setTeamToDelete(team);
    setOpenConfirmDialog(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!teamToDelete) return;

    setOpenConfirmDialog(false); // Close dialog immediately

    try {
      // 1. Delete associated draft picks for this team
      // Note: Draft picks are linked to both game_id and team_id.
      // Deleting by team_id will remove players drafted to this specific team across all games.
      // If you want to delete only draft picks FOR A SPECIFIC GAME related to this team,
      // you'd need a more complex query or direct database cascade.
      // For now, this will delete ALL draft picks where this team was assigned.
      await deleteDraftPicks(teamToDelete.id).unwrap();
      console.log(`Successfully deleted draft picks for team ID: ${teamToDelete.id}`);

      // 2. Delete the team itself
      await deleteTeam(teamToDelete.id).unwrap();
      console.log(`Successfully deleted team: ${teamToDelete.name} (ID: ${teamToDelete.id})`);

      showSnackbar(
        `Team "${teamToDelete.name}" and associated draft picks deleted successfully.`,
        'success'
      );
    } catch (err) {
      console.error('Failed to delete team and its associated data:', err);
      showSnackbar(
        `Failed to delete team "${teamToDelete.name}". Error: ${err.message || 'Unknown error.'}`,
        'error'
      );
    } finally {
      setTeamToDelete(null); // Clear the team to delete state
    }
  }, [teamToDelete, deleteDraftPicks, deleteTeam, showSnackbar]);

  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
    setTeamToDelete(null); // Clear the team to delete state
  };

  // Determine if any deletion is in progress
  const isAnyDeletionLoading = isDeletingTeam || isDeletingDraftPicks;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        List of Teams
      </Typography>

      {/* Create New Team Button */}
      <Button
        component={Link}
        to={paths.dashboard.team.new} // Link to the Team Create View
        variant="contained"
        color="primary"
        startIcon={<Iconify icon="eva:plus-fill" />}
        sx={{ mb: 3 }}
      >
        Create New Team
      </Button>

      {/* Loading State */}
      {(isLoading || isAnyDeletionLoading) && (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
          <CircularProgress />
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            {isAnyDeletionLoading ? 'Deleting team and associated data...' : 'Loading teams...'}
          </Typography>
        </Stack>
      )}

      {/* Error State */}
      {isError && (
        <Alert severity="error" sx={{ my: 3 }}>
          Error: {error?.message || 'Failed to fetch teams.'}
          {error?.data && (
            <Typography variant="body2">Details: {JSON.stringify(error.data)}</Typography>
          )}
        </Alert>
      )}

      {/* Display Teams using Cards */}
      {!isLoading && !isError && teams.length > 0 && (
        <Grid container spacing={3} sx={{ mt: 3 }}>
          {teams.map((team) => (
            <Grid item xs={12} sm={6} md={4} key={team.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="div">
                    {team.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    **Description:** {team.description || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    **Manager ID:** {team.manager_id || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    **Created At:** {formatRobustDate(team.created_at, 'datetime')}
                  </Typography>
                  {team.game_id && (
                    <Typography variant="body2" color="text.secondary">
                      **Associated Game ID:** {team.game_id}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                  <Button
                    component={Link}
                    to={paths.dashboard.team.details(team.id)} // Link to team details page
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
                    color="error" // Red color for delete
                    size="small"
                    startIcon={<Iconify icon="eva:trash-2-outline" />} // Trash icon
                    onClick={() => handleDeleteClick(team)} // Open confirmation dialog
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
      {!isLoading && !isError && teams.length === 0 && (
        <Alert severity="info" sx={{ my: 3 }}>
          No teams found. Start by creating a new team!
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
            Are you sure you want to delete the team &quot;**{teamToDelete?.name}**&quot;?
            <br />
            **This action will permanently delete all associated draft picks for this team.** This
            cannot be undone.
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
