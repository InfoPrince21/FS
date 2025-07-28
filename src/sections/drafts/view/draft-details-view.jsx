import { useParams } from 'react-router';

import { Box, Typography } from '@mui/material';
// ----------------------------------------------------------------------
export function DraftDetailsView() {
  const { id } = useParams();
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Draft Details View
      </Typography>
      <Typography variant="body1">
        This is the UI for displaying details for **Draft ID: {id || 'N/A'}**.
      </Typography>
    </Box>
  );
}
