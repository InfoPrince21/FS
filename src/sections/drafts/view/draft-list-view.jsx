import { Box, Typography } from '@mui/material';

// ----------------------------------------------------------------------

export function DraftListView() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Draft List View
      </Typography>
      <Typography variant="body1">This is the UI for listing all drafts.</Typography>
    </Box>
  );
}
