// src/sections/stats/view/overview-view.jsx

import { Box, Container, Typography, Grid, Card, CardContent } from '@mui/material';

// ----------------------------------------------------------------------

export function StatsOverviewView() {
  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 5 }}>
        Overall Game Stats Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Placeholder for Total Games Played */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Total Games
              </Typography>
              <Typography variant="h3">XX</Typography>
              <Typography variant="caption" color="text.secondary">
                (Placeholder: Number of games played)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Placeholder for Avg. Player Score */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Avg. Player Score
              </Typography>
              <Typography variant="h3">YYY</Typography>
              <Typography variant="caption" color="text.secondary">
                (Placeholder: Average score across all players)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Placeholder for Most Active Game Type */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Most Active Type
              </Typography>
              <Typography variant="h3">[Type Name]</Typography>
              <Typography variant="caption" color="text.secondary">
                (Placeholder: E.g., &apos;Draft&apos;, &apos;Individual&apos;)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Placeholder for New Players (Last 30 Days) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                New Players (30D)
              </Typography>
              <Typography variant="h3">ZZ</Typography>
              <Typography variant="caption" color="text.secondary">
                (Placeholder: Number of new player registrations)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Larger section for charts or more detailed stats */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Game Activity Over Time
            </Typography>
            <Box
              sx={{
                height: 360,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100',
                borderRadius: 1,
              }}
            >
              <Typography variant="body1" color="text.secondary">
                [Placeholder for Line Chart - e.g., Games Created per Month]
              </Typography>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Game Type Distribution
            </Typography>
            <Box
              sx={{
                height: 360,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100',
                borderRadius: 1,
              }}
            >
              <Typography variant="body1" color="text.secondary">
                [Placeholder for Pie Chart - e.g., % of Draft vs Individual games]
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
