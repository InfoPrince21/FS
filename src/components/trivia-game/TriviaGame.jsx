// src/components/trivia-game/TriviaGame.jsx
import { Canvas } from '@react-three/fiber';
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // ADDED useMemo

import {
  Box,
  Button,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from '@mui/material';

import { supabase } from 'src/lib/supabase';

import { useProfile } from 'src/auth/hooks/use-profile';
// Internal imports (based on 'internalPattern': ['^src/.+'])

// Sibling/Index imports (based on ['parent', 'sibling', 'index'] group)
import { MountainScene } from './MountainScene';

export function TriviaGame() {
  const { profile, loading: profileLoading, error: profileError } = useProfile();

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gamePhase, setGamePhase] = useState('loading');
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [error, setError] = useState(null);

  const [avatarAnimation, setAvatarAnimation] = useState('Idle');
  const [characterPosition, setCharacterPosition] = useState([0, -1, 0]);

  // --- START: MOVED ALL HOOKS TO THE TOP LEVEL ---

  // Use useMemo for mountainClimbPath to ensure its reference is stable
  const mountainClimbPath = useMemo(() => [
    [0, -1, 0],
    [0.5, 0, -0.5],
    [-0.5, 1, -1.0],
    [0.2, 2, -1.5],
    [0, 3, -2.0],
  ], []); // Empty dependency array ensures it's created only once

  const fetchGameQuestions = useCallback(async () => {
    setGamePhase('loading');
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('trivia_questions')
        .select('*')
        .limit(mountainClimbPath.length)
        .order('id', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      if (data && data.length > 0) {
        setQuestions(data);
        setCurrentQuestionIndex(0);
        setScore(0);
        setCharacterPosition(mountainClimbPath[0]);
        setAvatarAnimation('Idle');
        setGamePhase('playing');
      } else {
        setError('No questions available to start the game. Please add some in the manager.');
        setGamePhase('game-over');
      }
    } catch (err) {
      console.error('Error fetching game questions:', err);
      setError(err.message || 'Failed to load questions for the game.');
      setGamePhase('game-over');
    }
  }, [mountainClimbPath]); // Depend on the memoized mountainClimbPath

  // Memoize the avatar URL if it doesn't change frequently.
  // This helps prevent unnecessary re-renders of MountainScene if only the profile object reference changes
  // but the '3d_avatar_url' value itself is the same.
  // IMPORTANT: This Hook must be called unconditionally at the top level.
  const memoizedAvatarUrl = useMemo(() => profile?.['3d_avatar_url'], [profile]);
  // Added optional chaining `profile?.` just in case profile is null/undefined before the check below.

  // --- END: MOVED ALL HOOKS TO THE TOP LEVEL ---

  useEffect(() => {
    if (!profileLoading && !profileError) {
      fetchGameQuestions();
    }
  }, [fetchGameQuestions, profileLoading, profileError]);

  const handleAnswerClick = (answer) => {
    if (gamePhase !== 'playing' || selectedAnswer !== null) return;

    setSelectedAnswer(answer);
    const currentQuestion = questions[currentQuestionIndex];

    if (answer === currentQuestion.correct_answer) {
      setScore((prevScore) => prevScore + 1);
      setFeedbackMessage('Correct!');
      setAvatarAnimation('ThumbsUp');
    } else {
      setFeedbackMessage(`Incorrect. The correct answer was: ${currentQuestion.correct_answer}`);
      setAvatarAnimation('HeadShake');
    }
    setGamePhase('answer-revealed');

    setTimeout(() => {
      setSelectedAnswer(null);
      setFeedbackMessage('');

      if (currentQuestionIndex < questions.length - 1) {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        setCharacterPosition(mountainClimbPath[nextIndex]);
        setAvatarAnimation('Walking');
        setTimeout(() => setAvatarAnimation('Idle'), 1000); // Back to idle after walking
        setGamePhase('playing');
      } else {
        setAvatarAnimation('Victory');
        setGamePhase('game-over');
      }
    }, 2000);
  };

  const currentQuestion = questions[currentQuestionIndex];

  const overallLoading = profileLoading || gamePhase === 'loading';

  // --- Early Returns start here ---

  if (overallLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          {profileLoading ? 'Loading user profile...' : 'Loading game and mountain...'}
        </Typography>
      </Box>
    );
  }

  if (profileError || error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h4" color="error" gutterBottom>
            Error!
          </Typography>
          <Alert severity="error">
            {profileError?.message || error || 'An unknown error occurred.'}
          </Alert>
          <Button variant="contained" color="primary" onClick={fetchGameQuestions} sx={{ mt: 3 }}>
            Try Again
          </Button>
          {profileError && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Please ensure you are logged in and your profile is complete.
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!profile || !profile['3d_avatar_url']) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Avatar Missing!
          </Typography>
          <Typography variant="body1">
            It looks like your Ready Player Me avatar has not been set up yet. Please go to your
            profile settings to create or link your 3D avatar.
          </Typography>
          <Button variant="contained" color="primary" sx={{ mt: 3 }}>
            Go to Profile Settings{' '}
            {/* This line was missing quotes or was outside {} incorrectly */}
          </Button>
          <Button variant="outlined" sx={{ mt: 3, ml: 2 }} onClick={fetchGameQuestions}>
            Play Anyway (without avatar)
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (gamePhase === 'game-over') {
    return (
      <Card>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Game Over!
          </Typography>
          <Typography variant="h5">
            Your final score: {score} / {questions.length}
          </Typography>
          <Button variant="contained" color="primary" onClick={fetchGameQuestions} sx={{ mt: 3 }}>
            Play Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: 'auto' }}>
      <Box
        sx={{
          flex: 1,
          minHeight: { xs: '300px', md: '500px' }, // Ensure the Canvas has a size
          height: 'auto',
          bgcolor: 'background.paper',
          borderRight: { md: '1px solid', xs: 'none' },
          borderColor: 'divider',
        }}
      >
        {/* Wrap MountainScene with Canvas */}
        <Canvas>
          {/* Add basic lighting for visibility */}
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <MountainScene
            avatarUrl={memoizedAvatarUrl} // Use the memoized URL
            currentAnimation={avatarAnimation}
            onAnimationEnd={() => setAvatarAnimation('Idle')} // Reset animation after it plays
            characterPosition={characterPosition}
          />
        </Canvas>
      </Box>

      <CardContent sx={{ flex: 1, p: 3 }}>
        <Typography variant="h6">
          Question {currentQuestionIndex + 1} of {questions.length}
        </Typography>
        <Typography variant="h5" sx={{ my: 3 }}>
          {currentQuestion.question_text}
        </Typography>
        <Stack spacing={2}>
          {currentQuestion.options.map((option, index) => (
            <Button
              key={index}
              variant="outlined"
              onClick={() => handleAnswerClick(option)}
              disabled={selectedAnswer !== null}
              sx={{
                borderColor:
                  selectedAnswer === option
                    ? option === currentQuestion.correct_answer
                      ? 'success.main'
                      : 'error.main'
                    : 'grey.300',
                backgroundColor:
                  selectedAnswer === option
                    ? option === currentQuestion.correct_answer
                      ? 'success.light'
                      : 'error.light'
                    : 'transparent',
                '&:hover': {
                  backgroundColor: selectedAnswer === null ? 'action.hover' : null,
                },
              }}
            >
              {option}
            </Button>
          ))}
        </Stack>
        {feedbackMessage && (
          <Alert
            severity={selectedAnswer === currentQuestion.correct_answer ? 'success' : 'error'}
            sx={{ mt: 3 }}
          >
            {feedbackMessage}
          </Alert>
        )}
        <Typography variant="body1" sx={{ mt: 3 }}>
          Current Score: {score}
        </Typography>
      </CardContent>
    </Card>
  );
}