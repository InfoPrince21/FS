// src/sections/games/view/game-details-header.jsx
import React from 'react';
import { Link } from 'react-router'; // Assuming Link from react-router, not MUI Link

import { Box, Button, Stack, Typography } from '@mui/material';

import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';
// import { EndGameButton } from 'src/components/game/end-game-button'; // If you want to include it here

export function GameDetailsHeader({ game, hasDraftOccurred }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
      <Typography variant="h4" gutterBottom>
        Game Details: {game.name}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          component={Link}
          to={`${paths.dashboard.draft.new}?gameId=${game.id}`}
          variant="contained"
          color="primary"
          startIcon={<Iconify icon="eva:flash-fill" />}
          disabled={hasDraftOccurred}
        >
          {hasDraftOccurred ? 'Draft Completed for This Game' : 'Start Draft for This Game'}
        </Button>
        {/* You can place EndGameButton here if it fits the header logic */}
        {/* <EndGameButton gameId={game.id} onGameEnded={() => console.log('Game ended')} /> */}
      </Box>
    </Stack>
  );
}
