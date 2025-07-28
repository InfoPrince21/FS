// src/sections/games/view/game-info-kpi-section.jsx
import React from 'react';

import { Box, Typography, Paper } from '@mui/material';

export function GameInfoKpiSection({ gameId }) {
  // This component will display key performance indicators (KPIs) or general game information.
  // You can fetch data based on gameId or receive it as props.

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Game Information & KPIs for Game ID: {gameId}
      </Typography>
      <Box sx={{ mt: 2 }}>
        {/* Add your KPI cards, statistics, or general game info here */}
        <Typography variant="body1">- Total Players: [Dynamic Data]</Typography>
        <Typography variant="body1">- Game Duration: [Dynamic Data]</Typography>
        <Typography variant="body1">- Key Metric 1: [Dynamic Data]</Typography>
        {/* ... more KPIs or info */}
      </Box>
    </Paper>
  );
}
