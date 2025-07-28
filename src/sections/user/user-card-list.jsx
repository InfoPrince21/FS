// src/sections/user/user-card-list.jsx
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState, useCallback } from 'react'; // Removed useContext

import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import {
  fetchPlayers,
  selectPlayers,
  selectPlayersLoading,
  selectPlayersError,
} from 'src/features/players/playersSlice';

// NEW: Import the useAuthContext hook
import { useAuthContext } from 'src/auth/context/supabase/auth-provider';

import { UserCard } from './user-card';

export function UserCardList() {
  const dispatch = useDispatch();
  const players = useSelector(selectPlayers);
  const loading = useSelector(selectPlayersLoading);
  const error = useSelector(selectPlayersError);

  // NEW: Use the custom hook
  const { user, loading: authLoading } = useAuthContext();

  const [contextReady, setContextReady] = useState(false);

  const [page, setPage] = useState(1);
  const rowsPerPage = 12;
  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);
  const paginatedPlayers = players.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => {
    console.log('AuthContext Loading (Context Ready Effect):', authLoading);
    console.log('User (Context Ready Effect):', user);
    if (!authLoading && user && user.company) {
      setContextReady(true);
    } else {
      setContextReady(false);
    }
    console.log('Context Ready (Context Ready Effect):', contextReady);
  }, [authLoading, user]);

  useEffect(() => {
    console.log('Context Ready (Fetch Effect):', contextReady);
    console.log('User Company (Fetch Effect):', user?.company);
    if (contextReady && user?.company) {
      console.log('Dispatching fetchPlayers with company:', user.company);
      dispatch(fetchPlayers(user.company));
    } else if (!contextReady) {
      console.log('Context not ready, delaying fetchPlayers.');
    } else if (!user?.company) {
      console.log('User or company not available, delaying fetchPlayers.');
    }
  }, [dispatch, user?.company, contextReady]);

  // Handle the loading state from both auth context and Redux slice
  if (authLoading || loading) {
    // Combine loading states
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Handle errors for player data fetch
  if (error) {
    return (
      <Box sx={{ mt: 5, textAlign: 'center', color: 'error.main' }}>
        <Typography variant="h6">Error loading players:</Typography>
        <Typography variant="body2">{error}</Typography>
      </Box>
    );
  }

  // If auth is not loading and user is null (not authenticated)
  // This case should be handled by AuthGuard if your route is protected,
  // but it's good to have a fallback.
  if (!user || !user.company) {
    return (
      <Box sx={{ mt: 5, textAlign: 'center' }}>
        <Typography variant="h6">User not authenticated or company information missing.</Typography>
        <Typography variant="body2">
          Please ensure you are logged in and your user profile has a company.
        </Typography>
      </Box>
    );
  }

  console.log('Players:', players);
  console.log('Loading (Redux):', loading);
  console.log('Error (Redux):', error);
  console.log('Auth Loading:', authLoading);
  console.log('Auth User:', user);

  return (
    <Box
      sx={{
        gap: 3,
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
      }}
    >
      {paginatedPlayers.map((player) => (
        <UserCard key={player.id} user={player} />
      ))}
    </Box>
  );
}
