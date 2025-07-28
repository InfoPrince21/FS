import { Box, Container, Typography } from '@mui/material';

import { StatsDashboard } from 'src/components/stats/stats-dashboard'; // Import your new component

// ----------------------------------------------------------------------

export function PlayerPerformanceView() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ p: 5 }}>
        {' '}
        {/* Removed textAlign: 'center' and some spacing if the dashboard fills it */}
        <Typography variant="h3" gutterBottom>
          Scored Stats History
        </Typography>
        {/* Remove the placeholder text */}
        {/* <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
          This is a placeholder page.
        </Typography> */}
        {/* Render your StatsDashboard component here */}
        <StatsDashboard />
      </Box>
    </Container>
  );
}
