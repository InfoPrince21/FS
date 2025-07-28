import { useParams } from 'react-router'; // As per error: 'react-router' before 'react'
import { useEffect, useState, useMemo } from 'react'; // React core hooks

// External: Material-UI components (sorted alphabetically by component name for destructured imports)
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

// Internal Utilities (custom-utils group)
import { calculateGameTeamStandings } from 'src/utils/stats-helpers'; // As per error: 'src/utils' before 'src/features'

// Internal Features (internal group - assuming alphabetical for now, based on previous errors, but prioritizing any explicit "before" rules)
import { useGetTeamByIdQuery } from 'src/features/teams/teamsAPI'; // Placing teamsAPI first based on the *new* error from game-details-view, assuming a consistent rule across features.
import {
  useGetDraftPicksByTeamIdQuery,
  useGetAllDraftPicksByGameIdQuery,
} from 'src/features/games/gamesAPI';
import {
  // Placing statsAPI after teamsAPI and gamesAPI if it was previously after, or maintaining its spot if there's no conflict
  useGetGameKpisByGameIdQuery,
  useGetGamePlayerStatsQuery,
} from 'src/features/stats/statsAPI';

// --- Helper function for date formatting (from your previous code) ---
const formatRobustDate = (dateString, type = 'date') => {
  if (!dateString) return 'N/A';
  const isoRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;
  const match = String(dateString).match(isoRegex);
  let parseableString = null;
  if (match && match[1]) {
    parseableString = match[1];
  } else if (String(dateString).includes(' ') && !String(dateString).includes('T')) {
    parseableString = String(dateString).replace(' ', 'T').substring(0, 19);
  } else {
    parseableString = String(dateString).substring(0, 19);
  }
  if (!parseableString) return 'N/A (Parse Error)';
  const date = new Date(parseableString);
  if (isNaN(date.getTime())) return 'N/A (Invalid Date)';
  if (type === 'date') return date.toLocaleDateString();
  return date.toLocaleString();
};

// ----------------------------------------------------------------------

export function TeamDetailsView() {
  // --- ALL REACT HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL ---

  const { id: teamId } = useParams();
  const [selectedGameId, setSelectedGameId] = useState('');
  // RTK Query Hooks (called unconditionally, `skip` doesn't violate rules of hooks)
  const {
    data: team,
    isLoading: isLoadingTeam,
    isError: isErrorTeam,
    error: teamError,
  } = useGetTeamByIdQuery(teamId);

  const {
    data: teamDraftPicks = [],
    isLoading: isLoadingTeamDraftPicks,
    isError: isErrorTeamDraftPicks,
    error: teamDraftPicksError,
  } = useGetDraftPicksByTeamIdQuery(teamId);

  const {
    data: gameKpis = [],
    isLoading: isLoadingGameKpis,
    isError: isErrorGameKpis,
    error: gameKpisError,
  } = useGetGameKpisByGameIdQuery(selectedGameId, { skip: !selectedGameId });

  const {
    data: playerStats = [],
    isLoading: isLoadingPlayerStats,
    isError: isErrorPlayerStats,
    error: playerStatsError,
  } = useGetGamePlayerStatsQuery(selectedGameId, { skip: !selectedGameId });

  const {
    data: allGameDraftPicks = [],
    isLoading: isLoadingAllGameDraftPicks,
    isError: isErrorAllGameDraftPicks,
    error: allGameDraftPicksError,
  } = useGetAllDraftPicksByGameIdQuery(selectedGameId, { skip: !selectedGameId });

  // --- useMemo and useEffect hooks (also called unconditionally) ---

  // KPI Names for display in rankings table (Moved to top of hooks section)
  // FIX: This useMemo is now safely at the very top of the component logic.
  const kpiColumnNames = useMemo(() => gameKpis.map((kpi) => kpi.name), [gameKpis]);

  // Determine unique games this team participated in
  const uniqueGames = useMemo(() => {
    const gamesMap = new Map();
    teamDraftPicks.forEach((pick) => {
      if (pick.games && !gamesMap.has(pick.games.id)) {
        gamesMap.set(pick.games.id, {
          id: pick.games.id,
          name: pick.games.name,
          startDate: pick.games.start_date,
        });
      }
    });
    // Sort games by start date, most recent first
    return Array.from(gamesMap.values()).sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  }, [teamDraftPicks]);

  // Set the most recent game as default if available
  useEffect(() => {
    if (uniqueGames.length > 0 && !selectedGameId) {
      setSelectedGameId(uniqueGames[0].id);
    }
  }, [uniqueGames, selectedGameId]);

  // FIX for `arrow-body-style` and redundancy: REMOVED `draftPicksForSelectedGame` useMemo.
  // It is no longer needed as `allGameDraftPicks` is fetched directly.
  // The line numbers in your error output for this section will now be off, as the lines are removed.

  // Calculate team's ranking data for the selected game
  const teamRankingData = useMemo(() => {
    // Logic inside useMemo can be conditional, but the useMemo hook call itself cannot be.
    if (!selectedGameId || !playerStats.length || !gameKpis.length || !allGameDraftPicks.length) {
      return null;
    }

    const allTeamsStandingsInGame = calculateGameTeamStandings(
      playerStats,
      gameKpis,
      allGameDraftPicks
    );

    return allTeamsStandingsInGame.find((t) => t.teamId === teamId) || null;
  }, [selectedGameId, playerStats, gameKpis, allGameDraftPicks, teamId]);

  // Get unique player profiles drafted by this team
  const playersOnTeam = useMemo(() => {
    const playersMap = new Map();
    teamDraftPicks.forEach((pick) => {
      if (pick.profiles?.id && !playersMap.has(pick.profiles.id)) {
        playersMap.set(pick.profiles.id, {
          id: pick.profiles.id,
          displayName: pick.profiles.display_name,
          firstName: pick.profiles.first_name,
          lastName: pick.profiles.last_name,
          photoUrl: pick.profiles.photo_url,
        });
      }
    });
    return Array.from(playersMap.values());
  }, [teamDraftPicks]);

  const currentSelectedGame = uniqueGames.find((game) => game.id === selectedGameId);

  // --- Derived loading/error states (not hooks themselves) ---
  const isLoading =
    isLoadingTeam ||
    isLoadingTeamDraftPicks ||
    (selectedGameId && (isLoadingGameKpis || isLoadingPlayerStats || isLoadingAllGameDraftPicks));

  const isError =
    isErrorTeam ||
    isErrorTeamDraftPicks ||
    (selectedGameId && (isErrorGameKpis || isErrorPlayerStats || isErrorAllGameDraftPicks));

  const error =
    teamError || teamDraftPicksError || gameKpisError || playerStatsError || allGameDraftPicksError;

  // --- Conditional Renders (placed AFTER all hook calls) ---
  if (isLoading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
        <CircularProgress />
        <Typography variant="subtitle1" sx={{ mt: 2 }}>
          Loading team details and associated data...
        </Typography>
      </Stack>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ my: 3 }}>
        Error: {error?.message || `Failed to fetch team data for ID: ${teamId}`}
      </Alert>
    );
  }

  if (!team) {
    return (
      <Alert severity="warning" sx={{ my: 3 }}>
        Team with ID: {teamId} not found.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Team Details: {team.name}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Team Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Team Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                <strong>ID:</strong> {team.id}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Name:</strong> {team.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Description:</strong> {team.description || 'N/A'}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Color:</strong>
                </Typography>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: team.color || '#9E9E9E',
                    border: '1px solid #ccc',
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  ({team.color || 'N/A'})
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Team Roster / Players */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Players Drafted by {team.name} ({playersOnTeam.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {playersOnTeam.length === 0 ? (
                <Alert severity="info">No players have been drafted by this team yet.</Alert>
              ) : (
                <List dense>
                  {playersOnTeam.map((player) => (
                    <ListItem key={player.id}>
                      <Avatar
                        src={player.photoUrl || ''}
                        alt={player.displayName || `${player.firstName} ${player.lastName}`}
                        sx={{ mr: 2 }}
                      />
                      <ListItemText
                        primary={player.displayName || `${player.firstName} ${player.lastName}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Game Performance & Rankings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Game Performance & Rankings
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {uniqueGames.length === 0 ? (
                <Alert severity="info">
                  This team has not participated in any games with recorded draft picks yet.
                </Alert>
              ) : (
                <Box sx={{ mb: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel id="select-game-label">Select a Game</InputLabel>
                    <Select
                      labelId="select-game-label"
                      id="select-game"
                      value={selectedGameId}
                      label="Select a Game"
                      onChange={(e) => setSelectedGameId(e.target.value)}
                    >
                      {uniqueGames.map((game) => (
                        <MenuItem key={game.id} value={game.id}>
                          {game.name} ({formatRobustDate(game.startDate, 'date')})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedGameId && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Performance in{' '}
                        {currentSelectedGame ? currentSelectedGame.name : 'Selected Game'}
                      </Typography>
                      {isLoadingGameKpis || isLoadingPlayerStats || isLoadingAllGameDraftPicks ? (
                        <Stack alignItems="center" justifyContent="center" sx={{ py: 2 }}>
                          <CircularProgress size={24} />
                          <Typography variant="caption" sx={{ mt: 1 }}>
                            Loading game stats...
                          </Typography>
                        </Stack>
                      ) : isErrorGameKpis || isErrorPlayerStats || isErrorAllGameDraftPicks ? (
                        <Alert severity="error">Failed to load stats for this game.</Alert>
                      ) : (
                        <TableContainer component={Paper} sx={{ mt: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Rank</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Team</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">
                                  Total Points
                                </TableCell>
                                {kpiColumnNames.map((kpiName) => (
                                  <TableCell
                                    key={kpiName}
                                    sx={{ fontWeight: 'bold' }}
                                    align="right"
                                  >
                                    {kpiName.replace(/_/g, ' ')}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {teamRankingData ? (
                                <TableRow>
                                  <TableCell>{teamRankingData.rank}</TableCell>
                                  <TableCell>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                      <Avatar
                                        sx={{
                                          bgcolor: teamRankingData.teamColor,
                                          width: 24,
                                          height: 24,
                                        }}
                                      >
                                        <Typography variant="caption" color="white">
                                          {teamRankingData.teamName.charAt(0)}
                                        </Typography>
                                      </Avatar>
                                      <Typography
                                        variant="subtitle2"
                                        sx={{ color: teamRankingData.teamColor }}
                                      >
                                        {teamRankingData.teamName}
                                      </Typography>
                                    </Stack>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="subtitle1" color="primary.main">
                                      {teamRankingData.totalScore}
                                    </Typography>
                                  </TableCell>
                                  {kpiColumnNames.map((kpiName) => (
                                    <TableCell key={kpiName} align="right">
                                      {teamRankingData.kpis[kpiName] || 0}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={3 + kpiColumnNames.length}>
                                    <Alert severity="info" sx={{ width: '100%' }}>
                                      No detailed stats found for this team in the selected game.
                                    </Alert>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
