// src/sections/games/view/game-edit-view.jsx
import { Box, Typography } from '@mui/material';

export function GameEditView() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Edit Game
      </Typography>
      <Typography variant="body1">
        This page will contain a form to edit an existing game.&nbsp;{' '}
        {/* Added &nbsp; and fixed apostrophe */}
        You&apos;ll use `useGetGameByIdQuery()` and `useUpdateGameMutation()` here.
      </Typography>
    </Box>
  );
}
