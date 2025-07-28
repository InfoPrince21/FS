// src/components/game/H2HMatchDisplay.jsx
import React, { useMemo, useState, useEffect } from 'react';

import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';

import { saveH2HMatchResult } from 'src/utils/h2h';

import { supabase } from 'src/lib/supabase';
import { useGetPlayerStatsQuery } from 'src/features/stats/statsAPI'; // <-- CORRECTED THIS LINE

import { Iconify } from 'src/components/iconify';
import { AvatarDisplay } from 'src/components/ready-player-me/AvatarDisplay';

// Define the default RPM avatar URLs for Player 1 and Player 2
const DEFAULT_RPM_AVATAR_URL_PLAYER1 = 'https://models.readyplayer.me/686f12b0f439768e54fa6bd6.glb';
const DEFAULT_RPM_AVATAR_URL_PLAYER2 = 'https://models.readyplayer.me/68867358a5d9e1a75bb50d85.glb'; // New URL for the second player

const getParticipantName = (match, participantNum, profiles, teams) => {
  const isTeamBased = match.team1_id || match.team2_id;
  if (isTeamBased) {
    const teamId = participantNum === 1 ? match.team1_id : match.team2_id;
    const fallback = match[`team${participantNum}`]?.name;
    return teams?.find((t) => t.id === teamId)?.name || fallback || `Team ${participantNum}`;
  } else {
    const playerId = participantNum === 1 ? match.player1_id : match.player2_id;
    const fallback = match[`player${participantNum}`];
    const player = profiles?.find((p) => p.id === playerId);
    return (
      (player
        ? `${player.first_name || ''} ${player.last_name || ''}`.trim() || player.display_name
        : fallback?.display_name ||
          `${fallback?.first_name || ''} ${fallback?.last_name || ''}`.trim()) ||
      `Player ${participantNum}`
    );
  }
};

// Helper function to get player avatar URL, now takes a flag for which player
const getPlayerAvatarUrl = (playerId, profiles, isPlayerTwo = false) => {
  // Determine which default URL to use
  const defaultUrl = isPlayerTwo ? DEFAULT_RPM_AVATAR_URL_PLAYER2 : DEFAULT_RPM_AVATAR_URL_PLAYER1;

  if (!playerId || !Array.isArray(profiles)) {
    console.warn(
      `getPlayerAvatarUrl: Invalid input. playerId: ${playerId}, profiles type: ${typeof profiles}. Returning default. (Current time: ${new Date().toLocaleString()})`
    );
    return defaultUrl;
  }

  const playerProfile = profiles.find((p) => p.id === playerId);

  if (playerProfile) {
    const avatarUrl = playerProfile['3d_avatar_url'];
    console.log(
      `getPlayerAvatarUrl: Raw '3d_avatar_url' for player ${playerId}:`,
      avatarUrl,
      `(Type: ${typeof avatarUrl})`
    );
    if (avatarUrl) {
      console.log(
        `getPlayerAvatarUrl: Found custom avatar for player ${playerId}: ${avatarUrl} (Current time: ${new Date().toLocaleString()})`
        
      );
      return avatarUrl;
    } else {
      console.log(
        `getPlayerAvatarUrl: Player ${playerId} profile found but no custom avatar URL. Returning default RPM URL for player ${isPlayerTwo ? '2' : '1'}. (Current time: ${new Date().toLocaleString()})`
      );
      return defaultUrl;
    }
  }

  // If no profile found for the given ID, return the appropriate default
  console.log(
    `getPlayerAvatarUrl: No profile found in provided 'profiles' for playerId: ${playerId}. Returning default RPM URL for player ${isPlayerTwo ? '2' : '1'}. (Current time: ${new Date().toLocaleString()})`
  );
  return defaultUrl;
};

export function H2HMatchDisplay({ match: initialMatch, profiles, teams, kpis }) {
  const [match, setMatch] = useState(initialMatch);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(initialMatch.status === 'completed');

  useEffect(() => {
    setMatch(initialMatch);
    setSaved(initialMatch.status === 'completed');
  }, [initialMatch]);

  // Debugging: Log match and profiles data on component render/update
  useEffect(() => {
    console.log('H2HMatchDisplay: current match:', match);
    console.log('H2HMatchDisplay: current profiles:', profiles);
  }, [match, profiles]);

  const player1Name = useMemo(
    () => getParticipantName(match, 1, profiles, teams),
    [match, profiles, teams]
  );
  const player2Name = useMemo(
    () => getParticipantName(match, 2, profiles, teams),
    [match, profiles, teams]
  );

  // Get player avatar URLs, passing the isPlayerTwo flag
  const player1AvatarUrl = useMemo(
    () => (match.player1_id ? getPlayerAvatarUrl(match.player1_id, profiles, false) : null), // false for Player 1
    [match.player1_id, profiles]
  );
  const player2AvatarUrl = useMemo(
    () => (match.player2_id ? getPlayerAvatarUrl(match.player2_id, profiles, true) : null), // true for Player 2
    [match.player2_id, profiles]
  );

  // Debugging: Log the resolved avatar URLs
  useEffect(() => {
    console.log(`H2HMatchDisplay: player1AvatarUrl: ${player1AvatarUrl}`);
    console.log(`H2HMatchDisplay: player2AvatarUrl: ${player2AvatarUrl}`);
  }, [player1AvatarUrl, player2AvatarUrl]);

  const startDate = match?.match_date ? `${match.match_date}T00:00:00Z` : undefined;
  const endDate = match?.match_date ? `${match.match_date}T23:59:59Z` : undefined;

  const {
    data: allGameStats = [],
    isLoading: isLoadingStats,
    isFetching: isFetchingStats,
    isError: isErrorStats,
    error: statsError,
  } = useGetPlayerStatsQuery(
    {
      gameId: match?.game_id,
      startDate,
      endDate,
    },
    {
      skip: !match?.id || !match?.game_id || !match?.match_date,
    }
  );

  const kpiMap = useMemo(() => {
    if (!kpis || kpis.length === 0) return new Map();
    return new Map(kpis.map((kpi) => [kpi.id, kpi]));
  }, [kpis]);

  const combinedKpiStats = useMemo(() => {
    const combined = {};
    if (!allGameStats?.length) return [];

    const isTeamBased = match.team1_id || match.team2_id;
    const id1 = isTeamBased ? match.team1_id : match.player1_id;
    const id2 = isTeamBased ? match.team2_id : match.player2_id;

    allGameStats.forEach((stat) => {
      const belongsTo1 = isTeamBased ? stat.team_id === id1 : stat.player_id === id1;
      const belongsTo2 = isTeamBased ? stat.team_id === id2 : stat.player_id === id2;

      if (belongsTo1 || belongsTo2) {
        if (!combined[stat.kpi_id]) {
          combined[stat.kpi_id] = {
            kpi: kpiMap.get(stat.kpi_id),
            player1_value: null,
            player2_value: null,
          };
        }
        if (belongsTo1) combined[stat.kpi_id].player1_value = stat.value;
        if (belongsTo2) combined[stat.kpi_id].player2_value = stat.value;
      }
    });

    return Object.values(combined);
  }, [allGameStats, match, kpiMap]);

  const totalPoints1 = useMemo(() => {
    if (!allGameStats?.length) return null;
    const isTeamBased = match.team1_id || match.team2_id;
    const id1 = isTeamBased ? match.team1_id : match.player1_id;

    return allGameStats
      .filter((stat) => (isTeamBased ? stat.team_id === id1 : stat.player_id === id1))
      .reduce((sum, stat) => sum + (stat.value || 0), 0);
  }, [allGameStats, match]);

  const totalPoints2 = useMemo(() => {
    if (!allGameStats?.length) return null;
    const isTeamBased = match.team1_id || match.team2_id;
    const id2 = isTeamBased ? match.team2_id : match.player2_id;

    return allGameStats
      .filter((stat) => (isTeamBased ? stat.team_id === id2 : stat.player_id === id2))
      .reduce((sum, stat) => sum + (stat.value || 0), 0);
  }, [allGameStats, match]);

  const handleSaveMatch = async () => {
    setSaving(true);

    const winnerId =
      totalPoints1 > totalPoints2
        ? match.player1_id || match.team1_id
        : match.player2_id || match.team2_id;
    const loserId =
      totalPoints1 < totalPoints2
        ? match.player1_id || match.team1_id
        : match.player2_id || match.team2_id;

    const payload = {
      player1_score: totalPoints1,
      player2_score: totalPoints2,
      winner_id: winnerId,
      loser_id: loserId,
      status: 'completed',
    };

    const result = await saveH2HMatchResult(match.id, payload);

    if (result.success) {
      const { data: updatedMatch, error } = await supabase
        .from('h2h_matches')
        .select('*')
        .eq('id', match.id)
        .single();

      if (!error) {
        setMatch(updatedMatch);
        setSaved(true);
      } else {
        console.error('Error reloading match:', error);
      }
    } else {
      alert('Failed to save match result.');
    }

    setSaving(false);
  };

  return (
    <Card sx={{ mt: 3, p: 3 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom align="center">
          Match #{match.match_number} Details: {player1Name} vs {player2Name}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" align="center" sx={{ mb: 2 }}>
          Date: {match.match_date} | Status:{' '}
          <Chip
            label={match.status}
            size="small"
            color={match.status === 'completed' ? 'success' : 'info'}
          />
        </Typography>

        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs={5} textAlign="center">
            <Typography variant="h6">{player1Name}</Typography>
            <Box sx={{ width: '100%', height: 200, mt: 1 }}>
              {match.player1_id ? ( // If it's a player match
                <AvatarDisplay avatarUrl={player1AvatarUrl} height={200} />
              ) : (
                // If it's a team match (player1_id is null/undefined)
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    border: '1px dashed grey',
                    borderRadius: '4px',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Team Match
                  </Typography>
                </Box>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Total Points: {totalPoints1 !== null ? totalPoints1 : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={2} textAlign="center">
            <Typography variant="h5">VS</Typography>
          </Grid>
          <Grid item xs={5} textAlign="center">
            <Typography variant="h6">{player2Name}</Typography>
            <Box sx={{ width: '100%', height: 200, mt: 1 }}>
              {match.player2_id ? ( // If it's a player match
                <AvatarDisplay avatarUrl={player2AvatarUrl} height={200} />
              ) : (
                // If it's a team match (player2_id is null/undefined)
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    border: '1px dashed grey',
                    borderRadius: '4px',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Team Match
                  </Typography>
                </Box>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Total Points: {totalPoints2 !== null ? totalPoints2 : 'N/A'}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          KPI Raw Stats
        </Typography>

        {isLoadingStats || isFetchingStats ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>
              Loading KPI stats for {player1Name} and {player2Name}...
            </Typography>
          </Box>
        ) : isErrorStats ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error loading KPI stats: {statsError?.message || statsError?.status || 'Unknown error'}
          </Alert>
        ) : combinedKpiStats.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No KPI stats found for {player1Name} or {player2Name}.
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>KPI</TableCell>
                  <TableCell align="center">{player1Name}</TableCell>
                  <TableCell align="center">{player2Name}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {combinedKpiStats.map((kpiStat) => (
                  <TableRow key={kpiStat.kpi?.id || Math.random()}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {kpiStat.kpi?.icon_name && (
                          <Iconify
                            icon={kpiStat.kpi.icon_name}
                            width={24}
                            height={24}
                            style={{ marginRight: 8 }}
                            aria-label={kpiStat.kpi.name || 'KPI Icon'}
                          />
                        )}
                        {kpiStat.kpi?.name || 'Unknown KPI'}
                      </Box>
                    </TableCell>
                    <TableCell align="center">{kpiStat.player1_value ?? '-'}</TableCell>
                    <TableCell align="center">{kpiStat.player2_value ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveMatch}
            disabled={
              saving ||
              saved ||
              match.status === 'completed' ||
              totalPoints1 === null ||
              totalPoints2 === null
            }
          >
            {saved ? 'Match Saved' : saving ? 'Saving...' : 'Save Match Result'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
