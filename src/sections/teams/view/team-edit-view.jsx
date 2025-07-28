// src/sections/teams/view/team-edit-view.jsx

import { useParams } from 'react-router';

import { Box, Typography } from '@mui/material';

// ----------------------------------------------------------------------

export function TeamEditView() {
  const { id } = useParams();
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Team Edit View
      </Typography>
      <Typography variant="body1">
        This is the UI for editing **Team ID: {id || 'N/A'}**.
      </Typography>
    </Box>
  );
}