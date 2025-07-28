import { useMemo } from 'react';

import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  Button,
} from '@mui/material';

import { useGetGameParticipantsByGameIdQuery } from 'src/features/games/gamesAPI';
import {
  useGetGameKpisByGameIdQuery,
  useGetGamePlayerStatsQuery,
} from 'src/features/stats/statsAPI';

import { Iconify } from 'src/components/iconify';
import { getDefaultIcon } from 'src/components/icon-picker/icon-picker';

import { TeamLeaderboard } from './team-leaderboard';

const getOrdinalSuffix = (n) => {
  if (typeof n !== 'number' || isNaN(n)) {
    return '';
  }
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function TeamDetails({ gameId, teamId, onPlayerClick }) {
  const { data: playerStats = [], isLoading: isLoadingPlayerStats } =
    useGetGamePlayerStatsQuery(gameId);
  const { data: gameKpis = [], isLoading: isLoadingGameKpis } = useGetGameKpisByGameIdQuery(gameId);
  const { data: gameParticipants = [], isLoading: isLoadingGameParticipants } =
    useGetGameParticipantsByGameIdQuery(gameId);

  const teamData = useMemo(() => {
    if (!teamId || isLoadingPlayerStats || isLoadingGameKpis || isLoadingGameParticipants) {
      return null;
    }

    const teamSpecificParticipants = gameParticipants.filter((p) => p.team_id === teamId);

    if (teamSpecificParticipants.length === 0) {
      return null;
    }

    const teamInfo = teamSpecificParticipants[0]?.teams;
    const teamDisplayName = teamInfo?.name || 'Unknown Team';
    const teamColor = teamInfo?.color || '#9E9E9E';

    // Map all participants, regardless of the current teamId being displayed,
    // to build a comprehensive map for KPI aggregation across all teams.
    const allParticipantsMap = new Map();
    gameParticipants.forEach((participant) => {
      if (participant.player_id && participant.profiles && participant.teams) {
        allParticipantsMap.set(participant.player_id, {
          displayName:
            participant.profiles.display_name ||
            `${participant.profiles.first_name} ${participant.profiles.last_name}`,
          avatarChar: (
            participant.profiles.display_name || participant.profiles.first_name
          )?.charAt(0),
          teamId: participant.team_id,
          teamName: participant.teams.name, // Added teamName for easier debugging/display if needed
          role: participant.role,
        });
      }
    });

    const aggregatedParticipantStatsInTeam = new Map();
    let teamTotalScore = 0;
    const teamKpiTotals = {}; // This will hold KPI totals for the *current* teamId being viewed
    const kpiLeaders = {}; // This will hold KPI leaders for the *current* teamId being viewed

    // This Map will store KPI totals for ALL teams in the game
    const allTeamsKpiTotals = new Map(); // Key: teamId, Value: Map (Key: kpiName, Value: totalValue)

    const kpiDetailsMap = new Map();
    gameKpis.forEach((kpi) => {
      kpiDetailsMap.set(kpi.name, {
        id: kpi.id,
        points: kpi.points,
        iconName: kpi.icon_name || 'mdi:help-circle-outline',
      });
    });

    playerStats.forEach((stat) => {
      const pId = stat.player_id;
      const participantProfile = allParticipantsMap.get(pId); // Use the map containing all participants

      const kpi = gameKpis.find((gKpi) => gKpi.id === stat.kpi_id);

      if (kpi && participantProfile) {
        // Removed the teamId filter here for allTeamsKpiTotals
        // Populate allTeamsKpiTotals for ALL teams
        if (!allTeamsKpiTotals.has(participantProfile.teamId)) {
          allTeamsKpiTotals.set(participantProfile.teamId, new Map());
        }
        const teamKpiMap = allTeamsKpiTotals.get(participantProfile.teamId);
        teamKpiMap.set(kpi.name, (teamKpiMap.get(kpi.name) || 0) + stat.value);

        // Populate aggregatedParticipantStatsInTeam, teamKpiTotals, and kpiLeaders ONLY for the current team being viewed
        if (participantProfile.teamId === teamId) {
          if (!aggregatedParticipantStatsInTeam.has(pId)) {
            aggregatedParticipantStatsInTeam.set(pId, {
              profile_id: pId,
              totalScore: 0,
              kpis: {},
              displayName: participantProfile.displayName,
              avatarChar: participantProfile.avatarChar,
              role: participantProfile.role,
            });
          }
          const currentStats = aggregatedParticipantStatsInTeam.get(pId);
          const scoreForStat = stat.value * (kpi.points || 0);
          currentStats.totalScore += scoreForStat;
          currentStats.kpis[kpi.name] = (currentStats.kpis[kpi.name] || 0) + stat.value;

          teamKpiTotals[kpi.name] = (teamKpiTotals[kpi.name] || 0) + stat.value;

          if (!kpiLeaders[kpi.name] || stat.value > kpiLeaders[kpi.name].value) {
            kpiLeaders[kpi.name] = {
              playerId: pId,
              playerName: participantProfile.displayName,
              value: stat.value,
              avatarChar: participantProfile.avatarChar,
            };
          }
        }
      }
    });

    const allTeamMembersWithAggregatedStats = teamSpecificParticipants.map((participant) => {
      const pId = participant.player_id;
      const stats = aggregatedParticipantStatsInTeam.get(pId);

      return {
        profile_id: pId,
        displayName:
          participant.profiles.display_name ||
          `${participant.profiles.first_name || ''} ${participant.profiles.last_name || ''}`,
        avatarChar: (participant.profiles.display_name || participant.profiles.first_name)?.charAt(
          0
        ),
        role: participant.role,
        totalScore: stats?.totalScore || 0,
        kpis: stats?.kpis || {},
      };
    });

    const topScorer =
      [...allTeamMembersWithAggregatedStats].sort((a, b) => b.totalScore - a.totalScore)[0] || null;

    teamTotalScore = allTeamMembersWithAggregatedStats.reduce(
      (sum, member) => sum + member.totalScore,
      0
    );

    // Calculate overall ranks for all KPIs
    const overallTeamKpiRanks = {};
    gameKpis.forEach((kpi) => {
      const teamsForThisKpi = [];
      // Iterate over the allTeamsKpiTotals to get values for all teams
      allTeamsKpiTotals.forEach((kpiMap, currentTeamId) => {
        teamsForThisKpi.push({
          teamId: currentTeamId,
          kpiValue: kpiMap.get(kpi.name) || 0,
        });
      });

      // Sort in descending order to get ranks
      const sortedTeamsForKpi = [...teamsForThisKpi].sort((a, b) => b.kpiValue - a.kpiValue);

      // Assign ranks, handling ties
      let currentRank = 1;
      for (let i = 0; i < sortedTeamsForKpi.length; i++) {
        if (i > 0 && sortedTeamsForKpi[i].kpiValue < sortedTeamsForKpi[i - 1].kpiValue) {
          currentRank = i + 1;
        }
        if (sortedTeamsForKpi[i].teamId === teamId) {
          overallTeamKpiRanks[kpi.name] = currentRank;
          break; // Found the rank for the current teamId, move to next KPI
        }
      }
      // If the team had no stats for this KPI, its rank might not be found. Set to N/A or appropriate.
      if (overallTeamKpiRanks[kpi.name] === undefined) {
        overallTeamKpiRanks[kpi.name] = 'N/A';
      }
    });

    return {
      teamId,
      teamDisplayName,
      teamColor,
      teamTotalScore,
      teamKpiTotals,
      kpiLeaders,
      topScorer,
      players: allTeamMembersWithAggregatedStats,
      overallTeamKpiRanks,
      kpiDetailsMap,
    };
  }, [
    teamId,
    isLoadingPlayerStats,
    isLoadingGameKpis,
    isLoadingGameParticipants,
    playerStats,
    gameKpis,
    gameParticipants,
  ]);

  if (isLoadingPlayerStats || isLoadingGameKpis || isLoadingGameParticipants) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
        <CircularProgress size={24} />
        <Typography sx={{ ml: 2 }}>Loading team details...</Typography>
      </Box>
    );
  }

  if (!teamData) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No team data or participants found for this selection.
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            component="span"
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: teamData.teamColor,
              mr: 1,
              display: 'inline-block',
            }}
          />
          {teamData.teamDisplayName} Details
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Total Team Score: {teamData.teamTotalScore}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {teamData.topScorer && teamData.topScorer.totalScore > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Overall Team Leader
            </Typography>
            <Card variant="outlined">
              <CardContent>
                <Button
                  onClick={() => {
                    console.log('TeamDetails: Top Scorer clicked!', {
                      playerId: teamData.topScorer.profile_id,
                      playerDisplayName: teamData.topScorer.displayName,
                    });
                    if (onPlayerClick) {
                      onPlayerClick(teamData.topScorer.profile_id);
                    }
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
                    <Avatar sx={{ bgcolor: teamData.teamColor }}>
                      {teamData.topScorer.avatarChar}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {teamData.topScorer.displayName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Top Scorer ({teamData.topScorer.totalScore} points)
                      </Typography>
                    </Box>
                  </Stack>
                </Button>
              </CardContent>
            </Card>
          </Box>
        )}

        <Typography variant="h6" gutterBottom>
          KPI Leaders
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(teamData.kpiLeaders)
            .sort(([kpiNameA], [kpiNameB]) => kpiNameA.localeCompare(kpiNameB))
            .map(([kpiName, leader]) => {
              const kpiIconName = teamData.kpiDetailsMap.get(kpiName)?.iconName;
              return (
                <Grid item xs={12} sm={6} md={4} key={kpiName}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                        {kpiIconName && (
                          <Iconify
                            icon={getDefaultIcon(kpiIconName)}
                            width={20}
                            height={20}
                            sx={{ flexShrink: 0, color: 'text.secondary' }}
                          />
                        )}
                        <Typography variant="subtitle2" fontWeight="bold">
                          {kpiName.replace(/_/g, ' ')}
                        </Typography>
                      </Stack>
                      <Button
                        onClick={() => {
                          console.log('TeamDetails: KPI Leader clicked!', {
                            playerId: leader.playerId,
                            playerDisplayName: leader.playerName,
                          });
                          if (onPlayerClick) {
                            onPlayerClick(leader.playerId);
                          }
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
                              bgcolor: teamData.teamColor,
                              width: 24,
                              height: 24,
                              fontSize: '0.8rem',
                            }}
                          >
                            {leader.avatarChar}
                          </Avatar>
                          <ListItemText
                            primary={leader.playerName}
                            secondary={`Value: ${leader.value}`}
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                              color: 'text.secondary',
                            }}
                          />
                        </Stack>
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Team KPI Totals
        </Typography>
        <List dense>
          {Object.entries(teamData.teamKpiTotals)
            .sort(([kpiNameA], [kpiNameB]) => kpiNameA.localeCompare(kpiNameB))
            .map(([kpiName, totalValue]) => {
              const overallKpiRank = teamData.overallTeamKpiRanks[kpiName];
              const isOverallKpiRankFirst = overallKpiRank === 1;
              const kpiIconName = teamData.kpiDetailsMap.get(kpiName)?.iconName;

              return (
                <ListItem key={kpiName} disablePadding>
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {kpiIconName && (
                          <Iconify
                            icon={getDefaultIcon(kpiIconName)}
                            width={20}
                            height={20}
                            sx={{ flexShrink: 0, color: 'text.secondary' }}
                          />
                        )}
                        <Typography variant="body1" fontWeight="medium">
                          {kpiName.replace(/_/g, ' ')}: {totalValue}
                        </Typography>
                      </Stack>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        Overall Rank:{' '}
                        <Box
                          component="span"
                          sx={{
                            fontWeight: 'bold',
                            color: isOverallKpiRankFirst ? 'success.main' : 'text.secondary',
                          }}
                        >
                          {typeof overallKpiRank === 'number' && overallKpiRank !== 0
                            ? getOrdinalSuffix(overallKpiRank)
                            : overallKpiRank}
                        </Box>
                      </Typography>
                    }
                  />
                </ListItem>
              );
            })}
        </List>

        <Divider sx={{ my: 3 }} />

        <TeamLeaderboard gameId={gameId} teamId={teamId} onPlayerClick={onPlayerClick} />
      </CardContent>
    </Card>
  );
}
