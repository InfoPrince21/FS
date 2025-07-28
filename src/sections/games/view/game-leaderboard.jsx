import React, { useCallback, useMemo, useState } from 'react';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';

import {
  useGetGameKpisByGameIdQuery,
  useGetGamePlayerStatsQuery,
} from 'src/features/stats/statsAPI';
import {
  useGetAllDraftPicksByGameIdQuery,
  useGetAllProfilesQuery,
  useGetGameParticipantsByGameIdQuery,
  useGetTeamsByGameIdQuery,
} from 'src/features/games/gamesAPI';

import { Iconify } from 'src/components/iconify';
import { EndGameButton } from 'src/components/game/end-game-button';
import { getDefaultIcon } from 'src/components/icon-picker/icon-picker';

import { TeamStandingsTable } from 'src/sections/games/view/team-standings-table';

export function GameLeaderboard({ gameId, onPlayerClick, onTeamClick }) {
  const [orderBy, setOrderBy] = useState('totalScore');
  const [order, setOrder] = useState('desc');

  const { data: playerStats = [], isLoading: isLoadingPlayerStats } =
    useGetGamePlayerStatsQuery(gameId);
  const { data: gameKpis = [], isLoading: isLoadingGameKpis } = useGetGameKpisByGameIdQuery(gameId);

  const { data: gameParticipants = [], isLoading: isLoadingGameParticipants } =
    useGetGameParticipantsByGameIdQuery(gameId);

  const { data: allProfiles = [], isLoading: isLoadingProfiles } = useGetAllProfilesQuery();
  const { data: teamsData = [], isLoading: isLoadingTeams } = useGetTeamsByGameIdQuery(gameId);
  const { data: draftPicks = [], isLoading: isLoadingDraftPicks } =
    useGetAllDraftPicksByGameIdQuery(gameId);

  const overallLoading =
    isLoadingPlayerStats ||
    isLoadingGameKpis ||
    isLoadingGameParticipants ||
    isLoadingProfiles ||
    isLoadingTeams ||
    isLoadingDraftPicks;

  const kpiDetailsMap = useMemo(() => {
    const map = new Map();
    gameKpis.forEach((kpi) => {
      map.set(kpi.name, { id: kpi.id, points: kpi.points, icon_name: kpi.icon_name });
    });
    return map;
  }, [gameKpis]);

  const {
    leaderboardData,
    overallTopScorer,
    kpiGameLeaders,
    teamScoresCalculated,
    teamLeaderMvps,
    teamStandingsForCurrentGame,
  } = useMemo(() => {
    if (overallLoading) {
      console.log('Overall loading, returning initial state for useMemo.');
      return {
        leaderboardData: [],
        overallTopScorer: null,
        kpiGameLeaders: {},
        teamScoresCalculated: {},
        teamLeaderMvps: [],
        teamStandingsForCurrentGame: [],
      };
    }

    // --- START DEBUGGING LOGS ---
    console.log('--- GameLeaderboard Data Check ---');
    console.log('playerStats (raw):', playerStats);
    console.log('gameKpis (raw):', gameKpis);
    console.log('gameParticipants (raw):', gameParticipants);
    console.log('teamsData (raw):', teamsData);
    // --- END DEBUGGING LOGS ---

    const playerInfoMap = new Map();
    const teamPlayersMap = new Map();

    gameParticipants.forEach((participant) => {
      const profile = participant.profiles;
      const team = participant.teams;
      const role = participant.role;

      if (profile) {
        const displayName =
          profile.display_name ||
          (profile.first_name && profile.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : null) ||
          profile.first_name ||
          profile.last_name ||
          `Player ${profile.id}`;

        // IMPORTANT: Log the profile.id when setting it in the map
        console.log(
          `Setting playerInfoMap for profile.id: ${profile.id}, displayName: ${displayName}`
        );

        playerInfoMap.set(profile.id, {
          profile_id: profile.id,
          displayName: displayName,
          team: team,
          teamId: team?.id || null,
          avatarChar: displayName.charAt(0).toUpperCase(),
          role: role,
        });

        if (team?.id && profile.id && role === 'player') {
          if (!teamPlayersMap.has(team.id)) {
            teamPlayersMap.set(team.id, []);
          }
          teamPlayersMap.get(team.id).push(profile.id);
        }
      }
    });

    console.log('playerInfoMap after processing participants:', playerInfoMap);
    console.log('teamPlayersMap after processing participants:', teamPlayersMap);

    const aggregatedPlayerStats = new Map();
    const kpiGameLeadersTemp = {};
    const teamScoresTemp = {};
    const teamLeaderMvpsTemp = [];

    playerStats.forEach((stat) => {
      const pId = stat.player_id;
      const kpi = gameKpis.find((gKpi) => gKpi.id === stat.kpi_id);
      const playerInfo = playerInfoMap.get(pId);

      // IMPORTANT: Log stat.player_id before using it to get playerInfo
      console.log(
        `Processing player stat for player_id: ${pId}, kpi_id: ${stat.kpi_id}, value: ${stat.value}`
      );

      if (kpi && playerInfo && playerInfo.role === 'player') {
        if (!aggregatedPlayerStats.has(pId)) {
          aggregatedPlayerStats.set(pId, {
            profile_id: pId,
            totalScore: 0,
            kpis: {},
            displayName: playerInfo.displayName,
            team: playerInfo.team,
            teamId: playerInfo.teamId,
            avatarChar: playerInfo.avatarChar,
            role: playerInfo.role,
          });
        }
        const currentStats = aggregatedPlayerStats.get(pId);
        const kpiPoints = kpi.points || 0;
        currentStats.totalScore += stat.value * kpiPoints;
        currentStats.kpis[kpi.name] = (currentStats.kpis[kpi.name] || 0) + stat.value;

        // KPI Game Leaders should also only consider actual players
        if (!kpiGameLeadersTemp[kpi.name] || stat.value > kpiGameLeadersTemp[kpi.name].value) {
          kpiGameLeadersTemp[kpi.name] = {
            playerId: pId,
            playerName: playerInfo.displayName,
            value: stat.value,
            avatarChar: playerInfo.avatarChar,
            teamColor: playerInfo.team?.color || '#9E9E9E',
          };
        }
      } else {
        // Log if a stat is skipped due to missing KPI or player info, or wrong role
        if (!kpi) console.warn(`Skipping stat: KPI with ID ${stat.kpi_id} not found.`);
        if (!playerInfo) console.warn(`Skipping stat: PlayerInfo for ID ${pId} not found.`);
        if (playerInfo && playerInfo.role !== 'player')
          console.warn(`Skipping stat: Player ${pId} has role '${playerInfo.role}', not 'player'.`);
      }
    });

    console.log('aggregatedPlayerStats after processing playerStats:', aggregatedPlayerStats);

    // Calculate Team Scores and aggregate KPIs for the current game
    teamsData.forEach((team) => {
      let teamTotalScore = 0;
      const playersOnTeam = teamPlayersMap.get(team.id) || [];

      console.log(`Processing team: ${team.name} (ID: ${team.id})`);
      console.log(`Players on this team:`, playersOnTeam);

      const teamKpiAggregates = {}; // Initialize teamKpiAggregates for the current game

      playersOnTeam.forEach((playerId) => {
        const currentPlayerAggregatedStats = aggregatedPlayerStats.get(playerId);
        if (currentPlayerAggregatedStats) {
          teamTotalScore += currentPlayerAggregatedStats.totalScore;

          // Aggregate KPIs for the team for the current game
          for (const kpiName in currentPlayerAggregatedStats.kpis) {
            teamKpiAggregates[kpiName] =
              (teamKpiAggregates[kpiName] || 0) + currentPlayerAggregatedStats.kpis[kpiName];
          }
        }
      });
      teamScoresTemp[team.id] = teamTotalScore;
      team.kpis = teamKpiAggregates; // Attach aggregated KPIs to the team object
      console.log(` Team ${team.name} total score: ${teamTotalScore}`);
      console.log(` Team ${team.name} aggregated KPIs:`, team.kpis);
    });

    console.log('teamScoresTemp (final):', teamScoresTemp);

    const allPlayersCalculatedStats = Array.from(aggregatedPlayerStats.values());

    // Calculate Team Leader MVPs (only based on players in teamPlayersMap)
    teamsData.forEach((team) => {
      let teamMvp = null;
      let maxPlayerScoreOnTeam = -Infinity;
      const playersOnTeam = teamPlayersMap.get(team.id) || [];

      playersOnTeam.forEach((playerId) => {
        const currentPlayerAggregatedStats = aggregatedPlayerStats.get(playerId);
        if (
          currentPlayerAggregatedStats &&
          currentPlayerAggregatedStats.totalScore > maxPlayerScoreOnTeam
        ) {
          maxPlayerScoreOnTeam = currentPlayerAggregatedStats.totalScore;
          teamMvp = playerId;
        }
      });

      if (teamMvp) {
        teamLeaderMvpsTemp.push({
          team_id: team.id,
          leader_profile_id: teamMvp,
          score: maxPlayerScoreOnTeam,
          leader_display_name: playerInfoMap.get(teamMvp)?.displayName,
          leader_avatar_char: playerInfoMap.get(teamMvp)?.avatarChar,
          team_name: team.name,
          team_color: team.color,
        });
      }
    });

    const topScorer =
      [...allPlayersCalculatedStats].sort((a, b) => b.totalScore - a.totalScore)[0] || null;

    const sortedPlayers = [...allPlayersCalculatedStats].sort((a, b) => {
      let comparison = 0;
      if (orderBy === 'totalScore') {
        comparison = b.totalScore - a.totalScore;
      } else if (orderBy === 'displayName') {
        comparison = a.displayName.localeCompare(b.displayName);
      } else if (orderBy.startsWith('kpi_')) {
        const kpiName = orderBy.substring(4);
        const aKpiValue = a.kpis[kpiName] || 0;
        const bKpiValue = b.kpis[kpiName] || 0;
        comparison = bKpiValue - aKpiValue;
      }

      return order === 'asc' ? -comparison : comparison;
    });

    const teamStandingsForCurrentGameTemp = teamsData
      .map((team) => {
        const teamScore = teamScoresTemp[team.id] || 0;
        const teamKpisAggregated = team.kpis || {};

        return {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color,
          totalScore: teamScore,
          kpis: teamKpisAggregated,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);

    console.log('teamStandingsForCurrentGameTemp (final output):', teamStandingsForCurrentGameTemp);

    return {
      leaderboardData: sortedPlayers.map((player, index) => ({
        ...player,
        rank: index + 1,
      })),
      overallTopScorer: topScorer,
      kpiGameLeaders: kpiGameLeadersTemp,
      teamScoresCalculated: teamScoresTemp,
      teamLeaderMvps: teamLeaderMvpsTemp,
      teamStandingsForCurrentGame: teamStandingsForCurrentGameTemp,
    };
  }, [playerStats, gameKpis, gameParticipants, teamsData, overallLoading, orderBy, order]);

  const winningTeam = useMemo(() => {
    if (Object.keys(teamScoresCalculated).length === 0) return null;

    let highestScore = -1;
    let winningTeamId = null;

    Object.entries(teamScoresCalculated).forEach(([teamId, score]) => {
      if (score > highestScore) {
        highestScore = score;
        winningTeamId = teamId;
      }
    });

    return teamsData.find((team) => team.id === winningTeamId) || null;
  }, [teamScoresCalculated, teamsData]);

  const kpiColumnNames = useMemo(() => gameKpis.map((kpi) => kpi.name), [gameKpis]);

  const handleRequestSort = useCallback(
    (property) => {
      const isAsc = orderBy === property && order === 'asc';

      if (orderBy === property) {
        setOrder(isAsc ? 'desc' : 'asc');
      } else {
        if (property === 'totalScore' || property.startsWith('kpi_')) {
          setOrder('desc');
        } else if (property === 'displayName') {
          setOrder('asc');
        }
        setOrderBy(property);
      }
    },
    [orderBy, order]
  );

  const [teamOrderBy, setTeamOrderBy] = useState('totalScore');
  const [teamOrder, setTeamOrder] = useState('desc');

  const handleTeamRequestSort = useCallback(
    (property) => {
      const isAsc = teamOrderBy === property && teamOrder === 'asc';
      setTeamOrder(isAsc ? 'desc' : 'asc');
      setTeamOrderBy(property);
    },
    [teamOrderBy, teamOrder]
  );

  if (overallLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography>Loading game data...</Typography>
      </Box>
    );
  }

  if (leaderboardData.length === 0 && !overallLoading) {
    return (
      <Alert severity="info">
        No player stats or participants available for this game to generate a leaderboard.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Game Leaders
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {overallTopScorer && (
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Overall Game MVP
                </Typography>
                <Button
                  onClick={() => {
                    console.log(
                      'Overall Game MVP clicked. profile_id:',
                      overallTopScorer.profile_id
                    ); // ADDED LOG
                    onPlayerClick(overallTopScorer.profile_id);
                  }}
                  sx={{
                    textTransform: 'none',
                    justifyContent: 'flex-start',
                    p: 0,
                    minWidth: 0,
                    color: 'inherit',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      sx={{
                        bgcolor: overallTopScorer.team?.color || '#9E9E9E',
                        width: 40,
                        height: 40,
                        fontSize: '1rem',
                      }}
                    >
                      {overallTopScorer.avatarChar}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {overallTopScorer.displayName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Score: {overallTopScorer.totalScore.toFixed(2)}
                      </Typography>
                    </Box>
                  </Stack>
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
        <Grid item xs={12} md={overallTopScorer ? 6 : 12}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Top Leaders Per KPI
              </Typography>
              <Grid container spacing={1}>
                {Object.entries(kpiGameLeaders)
                  .sort(([kpiNameA], [kpiNameB]) => kpiNameA.localeCompare(kpiNameB))
                  .map(([kpiName, leader]) => {
                    const kpiIcon = kpiDetailsMap.get(kpiName)?.icon_name;
                    return (
                      <Grid item xs={12} sm={6} key={kpiName}>
                        <Button
                          onClick={() => {
                            console.log(
                              `KPI Leader (${kpiName}) clicked. playerId:`,
                              leader.playerId
                            ); // ADDED LOG
                            onPlayerClick(leader.playerId);
                          }}
                          sx={{
                            textTransform: 'none',
                            justifyContent: 'flex-start',
                            p: 0,
                            minWidth: 0,
                            color: 'inherit',
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {kpiIcon && (
                              <Iconify
                                icon={getDefaultIcon(kpiIcon)}
                                width={24}
                                height={24}
                                sx={{ mr: 0.5, color: 'text.secondary' }}
                              />
                            )}
                            <Avatar
                              sx={{
                                bgcolor: leader.teamColor,
                                width: 24,
                                height: 24,
                                fontSize: '0.8rem',
                              }}
                            >
                              {leader.avatarChar}
                            </Avatar>
                            <Typography variant="body2">
                              <Box component="span" fontWeight="medium">
                                {kpiName.replace(/_/g, ' ')}:
                              </Box>{' '}
                              {leader.playerName} ({leader.value.toFixed(2)})
                            </Typography>
                          </Stack>
                        </Button>
                      </Grid>
                    );
                  })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Team Standings (Current Game)
              </Typography>
              <TeamStandingsTable
                teamStandings={teamStandingsForCurrentGame}
                kpiColumnNames={kpiColumnNames}
                kpiDetailsMap={kpiDetailsMap}
                teamOrderBy={teamOrderBy}
                teamOrder={teamOrder}
                handleTeamRequestSort={handleTeamRequestSort}
                onTeamClick={onTeamClick}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Team Leader MVPs
              </Typography>
              <Grid container spacing={1}>
                {teamLeaderMvps
                  .sort((a, b) => b.score - a.score)
                  .map((leader) => (
                    <Grid item xs={12} sm={6} key={leader.team_id}>
                      <Button
                        onClick={() => {
                          console.log(
                            `Team Leader MVP clicked. leader_profile_id:`,
                            leader.leader_profile_id
                          ); // ADDED LOG
                          onPlayerClick(leader.leader_profile_id);
                        }}
                        sx={{
                          textTransform: 'none',
                          justifyContent: 'flex-start',
                          p: 0,
                          minWidth: 0,
                          color: 'inherit',
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar
                            sx={{
                              bgcolor: leader.team_color,
                              width: 24,
                              height: 24,
                              fontSize: '0.8rem',
                            }}
                          >
                            {leader.leader_avatar_char}
                          </Avatar>
                          <Typography variant="body2">
                            <Box component="span" fontWeight="medium">
                              {leader.team_name}:
                            </Box>{' '}
                            {leader.leader_display_name} ({leader.score.toFixed(2)})
                          </Typography>
                        </Stack>
                      </Button>
                    </Grid>
                  ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Player Leaderboard
      </Typography>
      <TableContainer component={Paper}>
        <Table aria-label="game leaderboard">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Rank</TableCell>
              <TableCell
                sx={{ fontWeight: 'bold' }}
                sortDirection={orderBy === 'displayName' ? order : false}
              >
                <TableSortLabel
                  active={orderBy === 'displayName'}
                  direction={orderBy === 'displayName' ? order : 'asc'}
                  onClick={() => handleRequestSort('displayName')}
                >
                  Player
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Team</TableCell>
              <TableCell
                sx={{ fontWeight: 'bold' }}
                align="right"
                sortDirection={orderBy === 'totalScore' ? order : false}
              >
                <TableSortLabel
                  active={orderBy === 'totalScore'}
                  direction={orderBy === 'totalScore' ? order : 'desc'}
                  onClick={() => handleRequestSort('totalScore')}
                >
                  Total Score
                </TableSortLabel>
              </TableCell>
              {kpiColumnNames.map((kpiName) => {
                const kpiIcon = kpiDetailsMap.get(kpiName)?.icon_name;
                return (
                  <TableCell
                    key={kpiName}
                    sx={{ fontWeight: 'bold' }}
                    align="right"
                    sortDirection={orderBy === `kpi_${kpiName}` ? order : false}
                  >
                    <TableSortLabel
                      active={orderBy === `kpi_${kpiName}`}
                      direction={orderBy === `kpi_${kpiName}` ? order : 'desc'}
                      onClick={() => handleRequestSort(`kpi_${kpiName}`)}
                    >
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        {kpiIcon && (
                          <Iconify
                            icon={getDefaultIcon(kpiIcon)}
                            width={18}
                            height={18}
                            sx={{ mr: 0.5, color: 'text.secondary' }}
                          />
                        )}
                        <span>{kpiName.replace(/_/g, ' ')}</span>
                      </Stack>
                    </TableSortLabel>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {leaderboardData.map((player) => (
              <TableRow key={player.profile_id}>
                <TableCell>{player.rank}</TableCell>
                <TableCell>
                  <Button
                    onClick={() => {
                      console.log('Player Table row clicked. profile_id:', player.profile_id); // ADDED LOG
                      onPlayerClick(player.profile_id);
                    }}
                    sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
                    color="inherit"
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar
                        sx={{
                          bgcolor: player.team?.color || '#9E9E9E',
                          width: 30,
                          height: 30,
                          fontSize: '0.8rem',
                        }}
                      >
                        {player.avatarChar}
                      </Avatar>
                      <Typography variant="body2" noWrap>
                        {player.displayName}
                      </Typography>
                    </Stack>
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => {
                      onTeamClick(player.teamId);
                    }}
                    sx={{ textTransform: 'none', justifyContent: 'flex-start', p: 0, minWidth: 0 }}
                    color="inherit"
                    disabled={!player.teamId}
                  >
                    <Box
                      component="span"
                      sx={{ color: player.team?.color || '#9E9E9E', fontWeight: 'bold' }}
                    >
                      {player.team?.name || 'N/A'}
                    </Box>
                  </Button>
                </TableCell>
                <TableCell align="right">{player.totalScore.toFixed(2)}</TableCell>
                {kpiColumnNames.map((kpiName) => (
                  <TableCell key={`${player.profile_id}-${kpiName}`} align="right">
                    {player.kpis[kpiName]?.toFixed(2) || 0}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <EndGameButton
        gameId={gameId}
        allProfiles={allProfiles}
        teamsData={teamsData}
        playerStatsData={playerStats}
        gameParticipantsData={gameParticipants}
        draftPicksData={draftPicks}
        gameKpisData={gameKpis}
        isParentLoading={overallLoading}
      />
    </Box>
  );
}
