import React, { useState, useMemo } from 'react';

import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Button,
} from '@mui/material';

import { supabase } from 'src/lib/supabase';
import { useGetH2HMatchesByGameIdQuery } from 'src/features/games/gamesAPI';
import {
  useGetProfilesQuery,
  useGetTeamsQuery,
  useGetKpisQuery,
  useGetPlayerStatsQuery,
} from 'src/features/stats/statsAPI';

import { H2HMatchDisplay } from './H2HMatchDisplay';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export function H2HScheduleDisplay({ game, h2hGameTypeIds }) {
  const isH2HGameType = game && h2hGameTypeIds && h2hGameTypeIds.includes(game.game_type_id);

  const draftH2HTypeIdFromProp = Array.isArray(h2hGameTypeIds)
    ? h2hGameTypeIds.find((id) => typeof id === 'string' && id.toLowerCase().includes('draft'))
    : undefined;

  const isTeamBasedGame = game?.game_type_id === draftH2HTypeIdFromProp;

  const skipFetchingMatches = !game?.id || !isH2HGameType;

  const {
    data: matches,
    refetch: refetchMatches,
    isLoading: isLoadingMatches,
    isFetching: isFetchingMatches,
    isError: isErrorMatches,
    error: matchesError,
  } = useGetH2HMatchesByGameIdQuery(game?.id, {
    skip: skipFetchingMatches,
  });

  const {
    data: profiles = [],
    isLoading: isLoadingProfiles,
    isError: isErrorProfiles,
    error: profilesError,
  } = useGetProfilesQuery();

  const {
    data: teams = [],
    isLoading: isLoadingTeams,
    isError: isErrorTeams,
    error: teamsError,
  } = useGetTeamsQuery();

  const {
    data: kpis = [],
    isLoading: isLoadingKpis,
    isError: isErrorKpis,
    error: kpisError,
  } = useGetKpisQuery();

  const groupedMatches = useMemo(() => {
    if (!matches || matches.length === 0) return {};
    const groups = {};
    matches.forEach((match) => {
      const date = match.match_date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(match);
    });
    return Object.fromEntries(Object.entries(groups).sort());
  }, [matches]);

  const dates = Object.keys(groupedMatches);

  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [savingRounds, setSavingRounds] = useState({});
  const [savedRounds, setSavedRounds] = useState({});

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    setSelectedMatch(null);
  };

  const handleMatchClick = (match) => {
    const enrichedMatch = {
      ...match,
      game_id: game?.id,
      player1_id: match.player1_id || match.player1?.id,
      player2_id: match.player2_id || match.player2?.id,
      team1_id: match.team1_id || match.team1?.id,
      team2_id: match.team2_id || match.team2?.id,
    };
    setSelectedMatch(enrichedMatch);
  };

  // New: fetch stats filtered by the currently selected tab date only
  const selectedDate = dates[selectedTab];

  const startDate = selectedDate ? `${selectedDate}T00:00:00Z` : undefined;
  const endDate = selectedDate ? `${selectedDate}T23:59:59Z` : undefined;

  const {
    data: dateFilteredStats = [],
    isLoading: isLoadingStats,
    isError: isErrorStats,
    error: statsError,
  } = useGetPlayerStatsQuery(
    {
      gameId: game?.id,
      startDate,
      endDate,
    },
    { skip: !game?.id || !startDate || !endDate }
  );

  const handleSaveRoundResults = async (date) => {
    const matchesToSave = groupedMatches[date];
    if (!matchesToSave || matchesToSave.length === 0) return;

    setSavingRounds((prev) => ({ ...prev, [date]: true }));

    for (const match of matchesToSave) {
      const isTeamBased = !!(match.team1_id || match.team1?.id);

      const id1 = isTeamBased
        ? match.team1_id || match.team1?.id
        : match.player1_id || match.player1?.id;
      const id2 = isTeamBased
        ? match.team2_id || match.team2?.id
        : match.player2_id || match.player2?.id;

      // Use dateFilteredStats instead of allGameStats here:
      const player1_score = dateFilteredStats
        .filter((stat) => (isTeamBased ? stat.team_id === id1 : stat.player_id === id1))
        .reduce((sum, stat) => sum + (stat.value || 0), 0);

      const player2_score = dateFilteredStats
        .filter((stat) => (isTeamBased ? stat.team_id === id2 : stat.player_id === id2))
        .reduce((sum, stat) => sum + (stat.value || 0), 0);

      let winner_id = null;
      let loser_id = null;
      let result = 'tie';

      if (player1_score > player2_score) {
        winner_id = id1;
        loser_id = id2;
        result = 'win';
      } else if (player2_score > player1_score) {
        winner_id = id2;
        loser_id = id1;
        result = 'win';
      }

      const payload = {
        player1_score,
        player2_score,
        winner_id,
        loser_id,
        result,
        status: 'completed',
      };

      try {
        const { error } = await supabase.from('h2h_matches').update(payload).eq('id', match.id);
        if (error) {
          console.error(`Failed to save match ${match.id}:`, error);
        }
      } catch (err) {
        console.error(`Exception saving match ${match.id}:`, err);
      }
    }

    setSavingRounds((prev) => ({ ...prev, [date]: false }));
    setSavedRounds((prev) => ({ ...prev, [date]: true }));
    await refetchMatches();
  };

  if (!isH2HGameType) return null;

  if (isLoadingProfiles || isLoadingTeams || isLoadingKpis || isLoadingMatches || isLoadingStats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading participant data, KPIs, matches or stats...</Typography>
      </Box>
    );
  }

  if (isErrorProfiles || isErrorTeams || isErrorKpis || isErrorMatches || isErrorStats) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading data. Please check network or try again.
        {isErrorProfiles &&
          ` (Profiles Error: ${profilesError?.message || profilesError?.status || 'Unknown'})`}
        {isErrorTeams &&
          ` (Teams Error: ${teamsError?.message || teamsError?.status || 'Unknown'})`}
        {isErrorKpis && ` (KPIs Error: ${kpisError?.message || kpisError?.status || 'Unknown'})`}
        {isErrorMatches &&
          ` (Matches Error: ${matchesError?.message || matchesError?.status || 'Unknown'})`}
        {isErrorStats &&
          ` (Stats Error: ${statsError?.message || statsError?.status || 'Unknown'})`}
      </Alert>
    );
  }

  if (selectedMatch) {
    return (
      <Box>
        <Button variant="outlined" onClick={() => setSelectedMatch(null)} sx={{ mb: 2 }}>
          &larr; Back to Schedule
        </Button>
        <H2HMatchDisplay match={selectedMatch} profiles={profiles} teams={teams} kpis={kpis} />
      </Box>
    );
  }

  return (
    <Card sx={{ mt: 3, p: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          H2H Match Schedule
        </Typography>

        {isLoadingMatches && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading Schedule...</Typography>
          </Box>
        )}

        {isErrorMatches && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error loading schedule:{' '}
            {matchesError?.message || matchesError?.status || 'Unknown error'}
          </Alert>
        )}

        {!isLoadingMatches && !matches?.length && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No H2H matches found for this game.
          </Alert>
        )}

        {!!matches?.length && (
          <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                aria-label="H2H schedule tabs"
                variant="scrollable"
                scrollButtons="auto"
              >
                {dates.map((date, index) => (
                  <Tab label={`Round ${index + 1} (${date})`} {...a11yProps(index)} key={date} />
                ))}
              </Tabs>
            </Box>
            {dates.map((date, index) => (
              <TabPanel value={selectedTab} index={index} key={`panel-${date}`}>
                <Box sx={{ mb: 2, textAlign: 'right' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleSaveRoundResults(date)}
                    disabled={savingRounds[date] === true || savedRounds[date] === true}
                  >
                    {savingRounds[date] ? (
                      <>
                        Saving...
                        <CircularProgress size={16} sx={{ ml: 1, color: 'inherit' }} />
                      </>
                    ) : savedRounds[date] ? (
                      'Saved'
                    ) : (
                      'Save All Matches in Round'
                    )}
                  </Button>
                </Box>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Match #</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>{isTeamBasedGame ? 'Team 1' : 'Player 1'}</TableCell>
                        <TableCell>{isTeamBasedGame ? 'Team 2' : 'Player 2'}</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {groupedMatches[date].map((match) => {
                        const enrichedMatch = {
                          ...match,
                          player1_id: match.player1_id || match.player1?.id,
                          player2_id: match.player2_id || match.player2?.id,
                          team1_id: match.team1_id || match.team1?.id,
                          team2_id: match.team2_id || match.team2?.id,
                          game_id: game?.id,
                        };

                        const isTeamBased = !!(enrichedMatch.team1_id && enrichedMatch.team2_id);

                        const id1 = isTeamBased ? enrichedMatch.team1_id : enrichedMatch.player1_id;
                        const id2 = isTeamBased ? enrichedMatch.team2_id : enrichedMatch.player2_id;

                        // Use dateFilteredStats instead of allGameStats here too:
                        const player1Total = dateFilteredStats
                          .filter((stat) =>
                            isTeamBased ? stat.team_id === id1 : stat.player_id === id1
                          )
                          .reduce((sum, stat) => sum + (stat.value || 0), 0);

                        const player2Total = dateFilteredStats
                          .filter((stat) =>
                            isTeamBased ? stat.team_id === id2 : stat.player_id === id2
                          )
                          .reduce((sum, stat) => sum + (stat.value || 0), 0);

                        return (
                          <TableRow
                            key={match.id}
                            onClick={() => handleMatchClick(enrichedMatch)}
                            sx={{
                              '&:hover': { cursor: 'pointer', backgroundColor: 'action.hover' },
                            }}
                            tabIndex={0}
                            role="button"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                handleMatchClick(enrichedMatch);
                              }
                            }}
                          >
                            <TableCell>{match.match_number}</TableCell>
                            <TableCell>{match.match_date}</TableCell>
                            <TableCell>
                              {isTeamBased
                                ? match.team1?.name || 'N/A'
                                : `${match.player1?.first_name || ''} ${match.player1?.last_name || ''}`.trim() ||
                                  match.player1?.display_name ||
                                  'N/A'}
                              <br />
                              <strong>Total: {player1Total}</strong>
                            </TableCell>
                            <TableCell>
                              {isTeamBased
                                ? match.team2?.name || 'N/A'
                                : `${match.player2?.first_name || ''} ${match.player2?.last_name || ''}`.trim() ||
                                  match.player2?.display_name ||
                                  'N/A'}
                              <br />
                              <strong>Total: {player2Total}</strong>
                            </TableCell>
                            <TableCell>{match.status}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
