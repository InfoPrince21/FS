import React, { useMemo, useState, useCallback } from 'react';

import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Avatar,
  CircularProgress,
  Alert,
  TableSortLabel,
  Button,
} from '@mui/material';

// Changed: Import useGetGameParticipantsByGameIdQuery instead of useGetAllDraftPicksByGameIdQuery
import { useGetGameParticipantsByGameIdQuery } from 'src/features/games/gamesAPI';
import {
  useGetGameKpisByGameIdQuery,
  useGetGamePlayerStatsQuery,
} from 'src/features/stats/statsAPI';

import { Iconify } from 'src/components/iconify';
import { getDefaultIcon } from 'src/components/icon-picker/icon-picker';

export function TeamLeaderboard({ gameId, teamId, onPlayerClick }) {
  const { data: playerStats = [], isLoading: isLoadingPlayerStats } =
    useGetGamePlayerStatsQuery(gameId);
  const { data: gameKpis = [], isLoading: isLoadingGameKpis } = useGetGameKpisByGameIdQuery(gameId);
  // NEW: Query for all game participants (players and managers)
  const { data: gameParticipants = [], isLoading: isLoadingGameParticipants } =
    useGetGameParticipantsByGameIdQuery(gameId);

  const [orderBy, setOrderBy] = useState('totalScore');
  const [order, setOrder] = useState('desc');

  const handleRequestSort = useCallback(
    (property) => {
      const isAsc = orderBy === property && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(property);
    },
    [orderBy, order]
  );

  const { teamPlayersLeaderboard, kpiColumnNames, kpiDetailsMap } = useMemo(() => {
    // Update loading dependencies
    if (isLoadingPlayerStats || isLoadingGameKpis || isLoadingGameParticipants || !teamId) {
      return { teamPlayersLeaderboard: [], kpiColumnNames: [], kpiDetailsMap: new Map() };
    }

    // Filter all game participants by the current teamId
    const teamSpecificParticipants = gameParticipants.filter((p) => p.team_id === teamId);

    // If no participants for the team, return early
    if (teamSpecificParticipants.length === 0) {
      return { teamPlayersLeaderboard: [], kpiColumnNames: [], kpiDetailsMap: new Map() };
    }

    // Create a map for quick lookup of participant profiles (players and managers)
    const participantInfoMap = new Map();
    teamSpecificParticipants.forEach((participant) => {
      if (participant.player_id && participant.profiles) {
        participantInfoMap.set(participant.player_id, {
          displayName:
            participant.profiles.display_name ||
            `${participant.profiles.first_name} ${participant.profiles.last_name}`,
          avatarChar: (
            participant.profiles.display_name || participant.profiles.first_name
          )?.charAt(0),
          // Include role if you want to display it
          role: participant.role,
        });
      }
    });

    // Create a map for quick KPI lookup, including icons
    const kpiDetails = new Map();
    gameKpis.forEach((kpi) => {
      kpiDetails.set(kpi.name, {
        id: kpi.id,
        points: kpi.points,
        iconName: kpi.icon_name || 'mdi:help-circle-outline',
      });
    });

    // Aggregate player stats (only for participants who have them)
    const aggregatedParticipantStats = new Map();
    playerStats.forEach((stat) => {
      const pId = stat.player_id; // This is the participant's profile ID from player_stats
      if (participantInfoMap.has(pId)) {
        // Ensure the stat belongs to a participant in this team
        const kpi = gameKpis.find((gKpi) => gKpi.id === stat.kpi_id);

        if (kpi) {
          if (!aggregatedParticipantStats.has(pId)) {
            aggregatedParticipantStats.set(pId, {
              profile_id: pId, // Store the profile_id here for consistency
              totalScore: 0,
              kpis: {},
              displayName: participantInfoMap.get(pId).displayName,
              avatarChar: participantInfoMap.get(pId).avatarChar,
              role: participantInfoMap.get(pId).role,
            });
          }
          const currentStats = aggregatedParticipantStats.get(pId);
          currentStats.totalScore += stat.value * (kpi.points || 0);
          currentStats.kpis[kpi.name] = (currentStats.kpis[kpi.name] || 0) + stat.value;
        }
      }
    });

    // Combine all team participants with their aggregated stats
    const allTeamMembersWithStats = teamSpecificParticipants.map((participant) => {
      const pId = participant.player_id;
      const stats = aggregatedParticipantStats.get(pId); // Get aggregated stats if available

      return {
        profile_id: pId,
        displayName:
          participant.profiles?.display_name ||
          `${participant.profiles?.first_name || ''} ${participant.profiles?.last_name || ''}`,
        avatarChar: (
          participant.profiles?.display_name || participant.profiles?.first_name
        )?.charAt(0),
        role: participant.role,
        totalScore: stats?.totalScore || 0, // Managers will have 0 unless they somehow have stats
        kpis: stats?.kpis || {}, // Managers will have empty KPIs unless they somehow have stats
      };
    });

    const sortedParticipants = [...allTeamMembersWithStats].sort((a, b) => {
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

    const kpiNames = gameKpis.map((kpi) => kpi.name);

    return {
      teamPlayersLeaderboard: sortedParticipants.map((participant, index) => ({
        ...participant,
        rank: index + 1,
      })),
      kpiColumnNames: kpiNames,
      kpiDetailsMap: kpiDetails, // Return the KPI details map
    };
  }, [
    playerStats,
    gameKpis,
    gameParticipants, // New dependency
    isLoadingPlayerStats,
    isLoadingGameKpis,
    isLoadingGameParticipants, // New dependency
    teamId,
    orderBy,
    order,
  ]);

  if (isLoadingPlayerStats || isLoadingGameKpis || isLoadingGameParticipants) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
        <CircularProgress size={24} />
        <Typography sx={{ ml: 2 }}>Loading team leaderboard...</Typography>
      </Box>
    );
  }

  if (!teamId) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No team selected to display leaderboard.
      </Alert>
    );
  }

  // The condition for showing "No players or stats" should now consider all participants,
  // and they might not have stats if they are managers.
  if (teamPlayersLeaderboard.length === 0 && !isLoadingGameParticipants) {
    // Only show this if not loading and no participants found
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No participants found for this team in the leaderboard.
      </Alert>
    );
  }

  const commonTableHeads = [
    { id: 'rank', label: 'Rank', align: 'left', sortable: true },
    { id: 'displayName', label: 'Participant', align: 'left', sortable: true }, // Changed label from 'Player' to 'Participant'
    { id: 'totalScore', label: 'Total Score', align: 'right', sortable: true },
  ];

  const kpiTableHeads = kpiColumnNames.map((kpiName) => {
    const kpiIconName = kpiDetailsMap.get(kpiName)?.iconName;
    return {
      id: `kpi_${kpiName}`,
      label: kpiName.replace(/_/g, ' '),
      iconName: kpiIconName,
      align: 'right',
      sortable: true,
    };
  });

  const allTableHeads = [...commonTableHeads, ...kpiTableHeads];

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Team Leaderboard
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small" aria-label="team participant leaderboard">
          <TableHead>
            <TableRow>
              {allTableHeads.map((headCell) => (
                <TableCell
                  key={headCell.id}
                  align={headCell.align}
                  sortDirection={orderBy === headCell.id ? order : false}
                >
                  {headCell.sortable ? (
                    <TableSortLabel
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : 'asc'}
                      onClick={() => handleRequestSort(headCell.id)}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        justifyContent={headCell.align === 'right' ? 'flex-end' : 'flex-start'}
                      >
                        {headCell.iconName && (
                          <Iconify
                            icon={getDefaultIcon(headCell.iconName)}
                            width={18}
                            height={18}
                            sx={{ color: 'text.secondary' }}
                          />
                        )}
                        <span>{headCell.label}</span>
                      </Stack>
                    </TableSortLabel>
                  ) : (
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={0.5}
                      justifyContent={headCell.align === 'right' ? 'flex-end' : 'flex-start'}
                    >
                      {headCell.iconName && (
                        <Iconify
                          icon={getDefaultIcon(headCell.iconName)}
                          width={18}
                          height={18}
                          sx={{ color: 'text.secondary' }}
                        />
                      )}
                      <span>{headCell.label}</span>
                    </Stack>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {teamPlayersLeaderboard.map((participant) => (
              <TableRow key={participant.profile_id}>
                <TableCell>{participant.rank}</TableCell>
                <TableCell>
                  <Button
                    onClick={() => {
                      console.log('TeamLeaderboard: Participant clicked!', {
                        participantId: participant.profile_id,
                        participantDisplayName: participant.displayName,
                        participantRole: participant.role, // Log the role
                      });
                      if (onPlayerClick) {
                        onPlayerClick(participant.profile_id);
                      }
                    }}
                    sx={{ textTransform: 'none', justifyContent: 'flex-start', p: 0, minWidth: 0 }}
                    color="inherit"
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar
                        sx={{
                          bgcolor: '#9E9E9E', // You might want to make this dynamic based on team color or participant role
                          width: 30,
                          height: 30,
                          fontSize: '0.8rem',
                        }}
                      >
                        {participant.avatarChar}
                      </Avatar>
                      <Typography variant="body2" noWrap>
                        {participant.displayName} {participant.role === 'manager' && '(Manager)'}{' '}
                        {/* Indicate manager role */}
                      </Typography>
                    </Stack>
                  </Button>
                </TableCell>
                <TableCell align="right">{participant.totalScore}</TableCell>
                {kpiColumnNames.map((kpiName) => (
                  <TableCell key={`${participant.profile_id}-${kpiName}`} align="right">
                    {participant.kpis[kpiName] || 0}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
