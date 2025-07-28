// src/sections/games/view/AchievementDefinitionsManagement.jsx

import React, { useState, useCallback, useMemo } from 'react';

import { DataGrid } from '@mui/x-data-grid';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Switch, // Added for boolean is_streak
  FormControlLabel, // Added for Switch
} from '@mui/material';

// All API hooks related to games, KPIs, and achievement definitions
// are now correctly imported from 'src/features/games/gamesAPI'
import {
  useGetAchievementDefinitionsQuery,
  useCreateAchievementDefinitionMutation,
  useUpdateAchievementDefinitionMutation,
  useDeleteAchievementDefinitionMutation,
  // useGetAllKpisQuery, // No longer needed as kpi_id is removed from schema
} from 'src/features/games/gamesAPI';

export function AchievementDefinitionsManagement() {
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDefinition, setCurrentDefinition] = useState(null);

  const [formState, setFormState] = useState({
    id: null,
    name: '',
    description: '',
    merit_reward: 0, // Changed from reward_points
    is_streak: false, // New field
    streak_type: '', // New field
    streak_length: 0, // New field
  });

  const {
    data: definitions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAchievementDefinitionsQuery();
  // const { data: kpis = [], isLoading: isLoadingKpis } = useGetAllKpisQuery(); // No longer needed

  // const kpiMap = useMemo(() => new Map(kpis.map((kpi) => [kpi.id, kpi.name])), [kpis]); // No longer needed

  const [createAchievementDefinition, { isLoading: isCreating }] =
    useCreateAchievementDefinitionMutation();
  const [updateAchievementDefinition, { isLoading: isUpdating }] =
    useUpdateAchievementDefinitionMutation();
  const [deleteAchievementDefinition, { isLoading: isDeleting }] =
    useDeleteAchievementDefinitionMutation();

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentDefinition(null);
    setFormState({
      id: null,
      name: '',
      description: '',
      merit_reward: 0,
      is_streak: false,
      streak_type: '',
      streak_length: 0,
    });
    setOpenDialog(true);
  };

  const handleOpenEdit = useCallback((definition) => {
    setIsEditing(true);
    setCurrentDefinition(definition);
    setFormState({
      id: definition.id,
      name: definition.name,
      description: definition.description,
      merit_reward: definition.merit_reward,
      is_streak: definition.is_streak,
      streak_type: definition.is_streak ? definition.streak_type || '' : '', // Ensure consistent value if not streak
      streak_length: definition.is_streak ? definition.streak_length || 0 : 0, // Ensure consistent value if not streak
    });
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentDefinition(null);
    setFormState({
      id: null,
      name: '',
      description: '',
      merit_reward: 0,
      is_streak: false,
      streak_type: '',
      streak_length: 0,
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const dataToSubmit = { ...formState };
      // Clear streak-related fields if it's not a streak achievement
      if (!dataToSubmit.is_streak) {
        dataToSubmit.streak_type = null;
        dataToSubmit.streak_length = null;
      }

      if (isEditing) {
        await updateAchievementDefinition(dataToSubmit).unwrap();
      } else {
        await createAchievementDefinition(dataToSubmit).unwrap();
      }
      refetch(); // Re-fetch data after successful operation
      handleCloseDialog();
    } catch (err) {
      console.error('Failed to save achievement definition:', err);
      // You might want to display an error message to the user here
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this achievement definition?')) {
      try {
        await deleteAchievementDefinition(id).unwrap();
        refetch(); // Re-fetch data after successful deletion
      } catch (err) {
        console.error('Failed to delete achievement definition:', err);
        // You might want to display an error message to the user here
      }
    }
  };

  const columns = useMemo(
    () => [
      { field: 'name', headerName: 'Name', width: 200 },
      { field: 'description', headerName: 'Description', flex: 1, minWidth: 250 },
      { field: 'merit_reward', headerName: 'Merit Reward', type: 'number', width: 130 },
      {
        field: 'is_streak',
        headerName: 'Is Streak',
        width: 100,
        type: 'boolean',
        renderCell: (params) => (
          <Chip
            label={params.value ? 'Yes' : 'No'}
            color={params.value ? 'success' : 'error'}
            size="small"
          />
        ),
      },
      { field: 'streak_type', headerName: 'Streak Type', width: 150 },
      { field: 'streak_length', headerName: 'Streak Length', type: 'number', width: 130 },
      {
        field: 'actions',
        headerName: 'Actions',
        type: 'actions',
        width: 150,
        getActions: (params) => [
          <Button
            key="edit"
            variant="outlined"
            size="small"
            onClick={() => handleOpenEdit(params.row)}
          >
            Edit
          </Button>,
          <Button
            key="delete"
            variant="outlined"
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
          >
            Delete
          </Button>,
        ],
      },
    ],
    [handleOpenEdit, handleDelete] // kpiMap is no longer a dependency
  );

  // isLoadingKpis removed as useGetAllKpisQuery is no longer used
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading achievement definitions...</Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">
        Error loading achievement definitions: {error?.message || 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <Button variant="contained" onClick={handleOpenCreate} sx={{ mb: 2 }}>
        Create New Definition
      </Button>
      <DataGrid
        rows={definitions}
        columns={columns}
        pageSizeOptions={[5, 10, 25]}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 10 },
          },
        }}
        getRowId={(row) => row.id}
        disableRowSelectionOnClick
      />

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {isEditing ? 'Edit Achievement Definition' : 'Create Achievement Definition'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formState.name}
              onChange={handleChange}
            />
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={formState.description}
              onChange={handleChange}
            />
            <TextField
              margin="dense"
              name="merit_reward"
              label="Merit Reward"
              type="number"
              fullWidth
              variant="outlined"
              value={formState.merit_reward}
              onChange={handleChange}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formState.is_streak}
                  onChange={handleChange}
                  name="is_streak"
                  color="primary"
                />
              }
              label="Is Streak Achievement?"
            />

            {formState.is_streak && (
              <>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Streak Type</InputLabel>
                  <Select
                    name="streak_type"
                    value={formState.streak_type || ''} // Handle null/undefined for initial render
                    label="Streak Type"
                    onChange={handleChange}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  margin="dense"
                  name="streak_length"
                  label="Streak Length"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={formState.streak_length}
                  onChange={handleChange}
                  inputProps={{ step: '1' }} // Streak length is typically an integer
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} color="primary" disabled={isCreating || isUpdating}>
            {isEditing ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
