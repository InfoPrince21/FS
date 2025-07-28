// src/sections/trivia/trivia-game-portal-view.jsx
import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router';

import {
  // @mui/material is custom-mui, so it comes after external imports
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { TriviaGame } from 'src/components/trivia-game/TriviaGame';

import { useProfile } from 'src/auth/hooks/use-profile';

// Optional: If you want to show a trivia-specific leaderboard/stats
// You might need a new RTK Query hook to fetch trivia game scores from 'mini_game_scores' table
// import { useGetTriviaScoresQuery } from 'src/features/stats/statsAPI'; // Hypothetical new hook

export default function TriviaGamePortalView() {
  const { profile, loading: profileLoading, error: profileError } = useProfile();

  // You can decide if the TriviaGame should immediately start or have a "Start Game" button
  const [gameStarted, setGameStarted] = useState(false); // Corrected: using useState directly

  // Hypothetical: Fetch trivia specific scores for a mini-leaderboard
  // const { data: triviaScores, isLoading: triviaScoresLoading } = useGetTriviaScoresQuery(
  //   profile?.id, // Pass player ID if fetching personal best
  //   { skip: !profile?.id }
  // );

  if (profileLoading) {
    return (
      <Container>
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Typography variant="h5">Loading User Profile...</Typography>
        </Box>
      </Container>
    );
  }

  if (profileError) {
    return (
      <Container>
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Typography variant="h5" color="error">
            Error Loading Profile
          </Typography>
          <Typography variant="body1" color="error">
            {profileError.message}
          </Typography>
        </Box>
      </Container>
    );
  }

  // If user is not logged in, prompt them
  if (!profile) {
    return (
      <Container>
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Trivia Game
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            Please log in to play the Trivia Game and track your scores!
          </Typography>
          <Button
            component={RouterLink}
            to={paths.auth.jwt.login} // Adjust to your login path
            variant="contained"
            color="primary"
          >
            Go to Login
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="lg">
        <Typography variant="h3" sx={{ mb: 5 }}>
          Welcome to the Trivia Game!
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  About the Game
                </Typography>
                <Typography variant="body1">
                  Test your knowledge and earn points for your profile! Every correct answer
                  contributes to your overall score in the main game. Your avatar will climb the
                  mountain as you progress!
                </Typography>
                <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                  This game contributes to your &quot;Knowledge&quot; activity points.
                </Typography>
                {!gameStarted && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={() => setGameStarted(true)}
                    sx={{ mt: 3 }}
                  >
                    Start Trivia Game
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Your Trivia Stats
                </Typography>
                {/* You can display personal bests, total games played, etc., here */}
                <Typography variant="body1">
                  Coming Soon: Your personal best scores and game history for trivia!
                </Typography>
                {/* Example of displaying a fetched score */}
                {/* {triviaScoresLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Typography variant="h6">Personal Best Score: {triviaScores?.maxScore || 0}</Typography>
                )} */}
              </CardContent>
            </Card>
          </Grid>

          {gameStarted && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <TriviaGame /> {/* Embed your existing TriviaGame component here */}
                </CardContent>
              </Card>
            </Grid>
          )}

          {!gameStarted && ( // Option to navigate back to dashboard if game not started
            <Grid item xs={12} sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                component={RouterLink}
                to={paths.dashboard.root} // Or a more specific dashboard path
                variant="outlined"
                color="secondary"
              >
                Back to Dashboard
              </Button>
            </Grid>
          )}
        </Grid>
      </Container>
    </>
  );
}
// <-- REMOVED THE EXTRA '}' FROM HERE
