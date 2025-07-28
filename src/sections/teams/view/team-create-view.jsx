// src/sections/teams/view/team-create-view.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { LoadingButton } from '@mui/lab';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  TextField,
  Button,
  CircularProgress,
  Alert,
  InputAdornment, // Import for InputAdornment
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { useCreateTeamMutation } from 'src/features/teams/teamsAPI';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/context/supabase/auth-provider';

export function TeamCreateView() {
  const navigate = useNavigate();

  const { user } = useAuthContext();
  const managerId = user?.id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // New state for color, initialized to a default bright color
  const [color, setColor] = useState('#1976D2'); // Default to a standard blue for visibility

  const [createTeam, { isLoading, isError, isSuccess, error }] = useCreateTeamMutation();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      alert('Team Name is required.');
      return;
    }

    if (!managerId) {
      alert('Authentication error: Manager ID not found. Please log in.');
      return;
    }

    const newTeamData = {
      name,
      description: description || null,
      manager_id: managerId,
      color, // Include the color in the new team data
    };

    try {
      const result = await createTeam(newTeamData).unwrap();
      console.log('Team created successfully:', result);
      navigate(paths.dashboard.team.list);
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Create New Team
      </Typography>

      <Card>
        <CardContent>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <TextField
              label="Team Name"
              variant="outlined"
              fullWidth
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!name.trim() && !isLoading}
              helperText={!name.trim() && !isLoading ? 'Team Name is required' : ''}
            />

            <TextField
              label="Description (Optional)"
              variant="outlined"
              fullWidth
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Color Chooser */}
            <TextField
              label="Team Color"
              variant="outlined"
              fullWidth
              value={color}
              onChange={(e) => setColor(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      style={{
                        width: 36,
                        height: 36,
                        border: 'none',
                        padding: 0,
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                      }}
                    />
                  </InputAdornment>
                ),
                // Optionally display the color swatch directly in the text field's end adornment
                endAdornment: (
                  <InputAdornment position="end">
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '4px',
                        backgroundColor: color,
                        border: '1px solid #ccc',
                      }}
                    />
                  </InputAdornment>
                ),
              }}
              // Add a helper text explaining the color format or purpose
              helperText="Choose a color for your team (hex code)"
            />

            <TextField
              label="Manager ID (Auto-Populated from User)"
              variant="filled"
              fullWidth
              value={managerId || 'Not authenticated'}
              InputProps={{
                readOnly: true,
              }}
              helperText="The authenticated user will be set as the team manager."
            />

            {/* Submission Feedback */}
            {isSuccess && <Alert severity="success">Team created successfully!</Alert>}

            {isError && (
              <Alert severity="error">
                Error creating team: {error?.data?.message || error?.error || 'Unknown error'}
              </Alert>
            )}

            <LoadingButton
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              loading={isLoading}
              loadingIndicator={<CircularProgress size={24} color="inherit" />}
              startIcon={<Iconify icon="eva:plus-fill" />}
              sx={{ mt: 2 }}
              disabled={isLoading || !name.trim() || !managerId}
            >
              Create Team
            </LoadingButton>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
