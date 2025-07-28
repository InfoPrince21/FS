// src/sections/games/view/game-stats-input-section.jsx
import React from 'react';

import { Box, Typography, Paper, TextField, Button, Stack } from '@mui/material';

export function GameStatsInputSection({ gameId }) {
  // This component will likely contain forms or input fields for recording game statistics.
  // You might manage form state here and a function to submit the data.

  const [playerScore, setPlayerScore] = React.useState('');
  const [teamScore, setTeamScore] = React.useState('');

  const handleSubmitStats = () => {
    console.log(`Submitting stats for Game ID: ${gameId}`);
    console.log(`Player Score: ${playerScore}, Team Score: ${teamScore}`);
    // Add logic to save these stats (e.g., API call)
    // Clear form fields
    setPlayerScore('');
    setTeamScore('');
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Input Game Statistics for Game ID: {gameId}
      </Typography>
      <Box component="form" sx={{ mt: 2 }} noValidate autoComplete="off">
        <Stack spacing={2}>
          <TextField
            label="Player Score"
            variant="outlined"
            type="number"
            value={playerScore}
            onChange={(e) => setPlayerScore(e.target.value)}
            fullWidth
          />
          <TextField
            label="Team Score"
            variant="outlined"
            type="number"
            value={teamScore}
            onChange={(e) => setTeamScore(e.target.value)}
            fullWidth
          />
          {/* Add more input fields as needed for various stats */}
          <Button variant="contained" onClick={handleSubmitStats} sx={{ alignSelf: 'flex-end' }}>
            Submit Stats
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
