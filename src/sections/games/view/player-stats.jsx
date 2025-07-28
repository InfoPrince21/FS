// src/sections/games/view/player-stats.jsx
import React, { useMemo, useState, useEffect } from 'react';

import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
} from '@mui/material';

// --- FIXED IMPORT ORDER ---
import {
  useGetAllDraftPicksByGameIdQuery,
  useGetPlayerStatsByGameIdQuery,
} from 'src/features/games/gamesAPI';
import {
  useGetGameKpisByGameIdQuery,
  useDeletePlayerStatMutation,
  useUpdatePlayerStatMutation,
} from 'src/features/stats/statsAPI';
// --- END FIXED IMPORT ORDER ---

import { Iconify } from 'src/components/iconify';
import { getDefaultIcon } from 'src/components/icon-picker/icon-picker';

// Helper function to get ordinal suffix (st, nd, rd, th)
const getOrdinalSuffix = (n) => {
  if (typeof n !== 'number' || isNaN(n)) {
    return '';
  }
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function PlayerStats({ playerId, gameId, onTeamClick, onLeaderboardClick }) {
  const [openDailyStatsDialog, setOpenDailyStatsDialog] = useState(false);
  const [selectedKpiNameForDailyStats, setSelectedKpiNameForDailyStats] = useState(null);
  const [editingDailyStat, setEditingDailyStat] = useState(null);
  const [editedDailyStatValue, setEditedDailyStatValue] = useState('');
  const [editedDailyStatDate, setEditedDailyStatDate] = useState('');

  // Fetch player stats for the game
  const {
    data: playerStats = [],
    isLoading: isLoadingPlayerStats,
    isError: isErrorPlayerStats,
    error: playerStatsError,
    refetch: refetchPlayerStats,
  } = useGetPlayerStatsByGameIdQuery(gameId);

  // Fetch game KPIs
  const {
    data: gameKpis = [],
    isLoading: isLoadingGameKpis,
    isError: isErrorGameKpis,
    error: gameKpisError,
  } = useGetGameKpisByGameIdQuery(gameId);

  // Fetch draft picks (still useful for player display names if not directly in playerStats profiles)
  const {
    data: draftPicks = [],
    isLoading: isLoadingDraftPicks,
    isError: isErrorDraftPicks,
    error: draftPicksError,
  } = useGetAllDraftPicksByGameIdQuery(gameId);

  const [deletePlayerStat, { isLoading: isDeleting, isError: isDeleteError, error: deleteError }] =
    useDeletePlayerStatMutation();
  const [
    updatePlayerStat,
    { isLoading: isUpdating, isError: isUpdateError, error: updateUpdateError },
  ] = useUpdatePlayerStatMutation();

  useEffect(() => {
    if (editingDailyStat) {
      setEditedDailyStatValue(editingDailyStat.value.toString());
      if (editingDailyStat.originalDate) {
        const date = new Date(editingDailyStat.originalDate);
        if (!isNaN(date.getTime())) {
          setEditedDailyStatDate(date.toISOString().split('T')[0]);
        } else {
          setEditedDailyStatDate('');
        }
      } else {
        setEditedDailyStatDate('');
      }
    } else {
      setEditedDailyStatValue('');
      setEditedDailyStatDate('');
    }
  }, [editingDailyStat]);

  const handleOpenDailyStatsDialog = (kpiName) => {
    setSelectedKpiNameForDailyStats(kpiName);
    setOpenDailyStatsDialog(true);
  };

  const handleCloseDailyStatsDialog = () => {
    setOpenDailyStatsDialog(false);
    setSelectedKpiNameForDailyStats(null);
    setEditingDailyStat(null);
  };

  const handleStartEditingDailyStat = (stat) => {
    setEditingDailyStat(stat);
  };

  const handleCancelEditingDailyStat = () => {
    setEditingDailyStat(null);
  };

  const handleUpdateDailyStat = async () => {
    if (!editingDailyStat) return;

    try {
      const dateForDb = editedDailyStatDate ? new Date(editedDailyStatDate).toISOString() : null;
      const playerUuid = playerId || null;
      const kpiUuid = editingDailyStat.kpiId || null;

      await updatePlayerStat({
        id: editingDailyStat.statId,
        playerId: playerUuid,
        kpiId: kpiUuid,
        value: parseFloat(editedDailyStatValue),
        date_recorded: dateForDb,
      }).unwrap();

      refetchPlayerStats();
      setEditingDailyStat(null);
      console.log(`Daily Stat ${editingDailyStat.statId} updated successfully.`);
    } catch (err) {
      console.error('Failed to update daily stat:', err);
      alert(
        `Failed to update daily stat: ${err?.data?.message || err.message || JSON.stringify(err)}`
      );
    }
  };

  const handleDeleteDailyStat = async (statIdToDelete) => {
    if (window.confirm('Are you sure you want to permanently delete this daily stat entry?')) {
      try {
        await deletePlayerStat(statIdToDelete).unwrap();
        refetchPlayerStats();
        setEditingDailyStat(null);
        console.log(`Daily Stat ${statIdToDelete} deleted successfully.`);
      } catch (err) {
        console.error('Failed to delete daily stat:', err);
        alert(
          `Failed to delete daily stat: ${err?.data?.message || err.message || JSON.stringify(err)}`
        );
      }
    }
  };

  const {
    currentPlayer,
    playerOverallRank,
    playerKpiRanks,
    playerTeam,
    playerTotalScore,
    currentPlayerKpis,
    dailyPlayerKpiStats,
    playerTeamRank,
    playerTeamKpiRanks,
  } = useMemo(() => {
    let calculatedCurrentPlayer = null;
    let calculatedPlayerOverallRank = 'N/A';
    const calculatedPlayerKpiRanks = {};
    let calculatedPlayerTeam = null;
    let calculatedPlayerTotalScore = 0;
    let calculatedCurrentPlayerKpis = {};
    const calculatedDailyPlayerKpiStats = new Map();
    let calculatedPlayerTeamRank = 'N/A';
    const calculatedPlayerTeamKpiRanks = {};

    // Return early if data is still loading or there's an error
    if (
      isLoadingPlayerStats ||
      isLoadingGameKpis ||
      isLoadingDraftPicks ||
      isErrorPlayerStats ||
      isErrorGameKpis ||
      isErrorDraftPicks
    ) {
      return {
        currentPlayer: null,
        playerOverallRank: 'N/A',
        playerKpiRanks: {},
        playerTeam: null,
        playerTotalScore: 0,
        currentPlayerKpis: {},
        dailyPlayerKpiStats: new Map(),
        playerTeamRank: 'N/A',
        playerTeamKpiRanks: {},
      };
    }

    // IMPORTANT: Build player profile map more robustly.
    // Prioritize profiles from playerStats, fallback to draftPicks.
    const playerProfileMap = new Map();
    const playerTeamDataMap = new Map(); // Map to store player's team data by player ID

    // Populate from playerStats first (more direct and accurate for player's current game team)
    playerStats.forEach((stat) => {
      if (stat.profiles?.id && !playerProfileMap.has(stat.profiles.id)) {
        playerProfileMap.set(stat.profiles.id, {
          displayName:
            stat.profiles.display_name || `${stat.profiles.first_name} ${stat.profiles.last_name}`,
          firstName: stat.profiles.first_name,
          lastName: stat.profiles.last_name,
        });
      }
      // Also store team data associated with the player from playerStats
      if (stat.player_id && stat.teams) {
        playerTeamDataMap.set(stat.player_id, stat.teams);
      }
    });

    // Fallback to draftPicks for players who might not have stats yet but are drafted
    draftPicks.forEach((pick) => {
      if (pick.profiles?.id && !playerProfileMap.has(pick.profiles.id)) {
        playerProfileMap.set(pick.profiles.id, {
          displayName:
            pick.profiles.display_name || `${pick.profiles.first_name} ${pick.profiles.last_name}`,
          firstName: pick.profiles.first_name,
          lastName: pick.profiles.last_name,
        });
      }
      // If team is not set from playerStats, use draft pick team
      if (pick.player_id && pick.teams && !playerTeamDataMap.has(pick.player_id)) {
        playerTeamDataMap.set(pick.player_id, pick.teams);
      }
    });

    const aggregatedPlayerStats = new Map();
    const teamScoresMap = new Map(); // Overall team scores
    const teamKpiScoresMap = new Map(); // KPI-specific team scores

    playerStats.forEach((stat) => {
      const pId = stat.player_id;
      const kpi = gameKpis.find((gKpi) => gKpi.id === stat.kpi_id);
      const playerProfile = playerProfileMap.get(pId);
      const playerTeamData = playerTeamDataMap.get(pId); // Get team data from the consolidated map

      if (kpi && playerProfile && playerTeamData) {
        // Ensure all necessary data exists
        // Aggregate individual player stats
        if (!aggregatedPlayerStats.has(pId)) {
          aggregatedPlayerStats.set(pId, {
            playerId: pId,
            totalScore: 0,
            kpis: {},
            displayName: playerProfile.displayName,
            team: playerTeamData, // Use the correct team data for the player
          });
        }
        const currentStats = aggregatedPlayerStats.get(pId);
        const scoreToAdd = stat.value * (kpi.points || 0);
        currentStats.totalScore += scoreToAdd;
        currentStats.kpis[kpi.name] = {
          value: (currentStats.kpis[kpi.name]?.value || 0) + stat.value,
          iconName: kpi.icon_name, // Use kpi.icon_name here
        };

        // Aggregate team scores (overall and KPI-specific)
        if (playerTeamData?.id) {
          // Overall team score
          if (!teamScoresMap.has(playerTeamData.id)) {
            teamScoresMap.set(playerTeamData.id, {
              id: playerTeamData.id,
              name: playerTeamData.name,
              color: playerTeamData.color,
              totalScore: 0,
            });
          }
          const currentTeamOverallScoreEntry = teamScoresMap.get(playerTeamData.id);
          currentTeamOverallScoreEntry.totalScore += scoreToAdd;

          // KPI-specific team scores
          if (!teamKpiScoresMap.has(playerTeamData.id)) {
            teamKpiScoresMap.set(playerTeamData.id, new Map());
          }
          const teamKpiMap = teamKpiScoresMap.get(playerTeamData.id);
          teamKpiMap.set(kpi.name, (teamKpiMap.get(kpi.name) || 0) + stat.value);
        }

        if (pId === playerId) {
          if (!calculatedDailyPlayerKpiStats.has(kpi.name)) {
            calculatedDailyPlayerKpiStats.set(kpi.name, []);
          }

          const dateObj = new Date(stat.date_recorded);
          const formattedDate =
            !isNaN(dateObj.getTime()) && stat.date_recorded
              ? dateObj.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Unknown Date';

          calculatedDailyPlayerKpiStats.get(kpi.name).push({
            date: formattedDate,
            value: stat.value,
            statId: stat.id,
            originalDate: stat.date_recorded,
            kpiId: kpi.id,
            playerId: pId,
            kpiName: kpi.name,
          });
        }
      } else {
        // Log which piece of data is missing for debugging
        console.warn(
          `PlayerStats: Skipping stat due to missing data: stat_id=${stat.id}, player_id=${pId}, kpi_id=${stat.kpi_id}. Missing: ${!kpi ? 'KPI' : ''} ${!playerProfile ? 'PlayerProfile' : ''} ${!playerTeamData ? 'PlayerTeamData' : ''}`
        );
      }
    });

    const allPlayersCalculatedStats = Array.from(aggregatedPlayerStats.values());
    const allTeamsCalculatedScores = Array.from(teamScoresMap.values());

    const sortedTeamsByOverallScore = [...allTeamsCalculatedScores].sort(
      (a, b) => b.totalScore - a.totalScore
    );

    const currentPlayerData = aggregatedPlayerStats.get(playerId);

    if (currentPlayerData) {
      calculatedCurrentPlayer = {
        id: playerId,
        displayName: currentPlayerData.displayName,
        team: currentPlayerData.team,
      };
      calculatedPlayerTeam = currentPlayerData.team;
      calculatedPlayerTotalScore = currentPlayerData.totalScore;

      gameKpis.forEach((kpi) => {
        // Use kpi.icon_name for the icon property here
        calculatedCurrentPlayerKpis[kpi.name] = {
          value: currentPlayerData.kpis[kpi.name]?.value || 0,
          iconName: kpi.icon_name, // Use icon_name from gameKpis
        };
      });

      const sortedByTotalScore = [...allPlayersCalculatedStats].sort(
        (a, b) => b.totalScore - a.totalScore
      );
      calculatedPlayerOverallRank =
        sortedByTotalScore.findIndex((p) => p.playerId === playerId) + 1;

      gameKpis.forEach((kpi) => {
        const sortedByKpi = [...allPlayersCalculatedStats].sort(
          (a, b) => (b.kpis[kpi.name]?.value || 0) - (a.kpis[kpi.name]?.value || 0)
        );
        calculatedPlayerKpiRanks[kpi.name] =
          sortedByKpi.findIndex((p) => p.playerId === playerId) + 1;
      });

      if (calculatedPlayerTeam?.id) {
        calculatedPlayerTeamRank =
          sortedTeamsByOverallScore.findIndex((team) => team.id === calculatedPlayerTeam.id) + 1;

        gameKpis.forEach((kpi) => {
          const teamsForThisKpi = [];
          teamKpiScoresMap.forEach((kpiMap, teamId) => {
            const teamInfo = teamScoresMap.get(teamId);
            teamsForThisKpi.push({
              teamId,
              teamName: teamInfo?.name,
              teamColor: teamInfo?.color,
              kpiValue: kpiMap.get(kpi.name) || 0,
            });
          });
          const sortedTeamsForKpi = [...teamsForThisKpi].sort((a, b) => b.kpiValue - a.kpiValue);
          calculatedPlayerTeamKpiRanks[kpi.name] =
            sortedTeamsForKpi.findIndex((team) => team.teamId === calculatedPlayerTeam.id) + 1;
        });
      }
    }

    return {
      currentPlayer: calculatedCurrentPlayer,
      playerOverallRank: calculatedPlayerOverallRank,
      playerKpiRanks: calculatedPlayerKpiRanks,
      playerTeam: calculatedPlayerTeam,
      playerTotalScore: calculatedPlayerTotalScore,
      currentPlayerKpis: calculatedCurrentPlayerKpis,
      dailyPlayerKpiStats: calculatedDailyPlayerKpiStats,
      playerTeamRank: calculatedPlayerTeamRank,
      playerTeamKpiRanks: calculatedPlayerTeamKpiRanks,
    };
  }, [playerId, gameId, playerStats, gameKpis, draftPicks]);

  const currentKpiDailyStats = selectedKpiNameForDailyStats
    ? dailyPlayerKpiStats.get(selectedKpiNameForDailyStats) || []
    : [];

  const isOverallLoading =
    isLoadingPlayerStats || isLoadingGameKpis || isLoadingDraftPicks || isDeleting || isUpdating;
  const isOverallError =
    isErrorPlayerStats ||
    isErrorGameKpis ||
    isErrorDraftPicks ||
    isDeleteError ||
    updateUpdateError;

  if (isOverallLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography>
          {isDeleting
            ? 'Deleting stat...'
            : isUpdating
              ? 'Updating stat...'
              : 'Loading player stats and rankings...'}
        </Typography>
      </Box>
    );
  }

  if (isOverallError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading player stats:{' '}
          {playerStatsError?.message ||
            gameKpisError?.message ||
            draftPicksError?.message ||
            deleteError?.message ||
            updateUpdateError?.message ||
            'Unknown error'}
        </Alert>
      </Box>
    );
  }

  // --- Define ranks here, before they are potentially used in JSX,
  // --- and after currentPlayer is definitively checked.
  const isOverallRankFirst = playerOverallRank === 1;
  const isTeamOverallRankFirst = playerTeamRank === 1;
  // --- End rank definitions ---

  // --- Critical Check for currentPlayer ---
  // Ensure that the playerId passed actually corresponds to a player in aggregatedPlayerStats.
  // If not, it means either the playerId is bad, or there are no stats for this player in this game.
  if (!currentPlayer) {
    console.warn(`PlayerStats: No current player data found for playerId: ${playerId}`);
    return (
      <Box sx={{ p: 3 }}>
        {/* Fix for react/no-unescaped-entities */}
        <Alert severity="warning">
          {`Player with ID "${playerId}" not found or no stats available for this game.`}
        </Alert>
      </Box>
    );
  }
  // --- End Critical Check ---

  return (
    <Card sx={{ my: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <Avatar
            sx={{
              bgcolor: currentPlayer.team?.color || '#9E9E9E', // Use currentPlayer.team.color
              width: 56,
              height: 56,
              fontSize: '1.5rem',
            }}
          >
            {currentPlayer.displayName.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h5" component="div">
              {currentPlayer.displayName}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Team:{' '}
              <Button
                onClick={() => {
                  if (onTeamClick && playerTeam?.id) {
                    onTeamClick(playerTeam.id);
                  }
                }}
                sx={{
                  textTransform: 'none',
                  justifyContent: 'flex-start',
                  p: 0,
                  minWidth: 0,
                  color: 'text.primary',
                  fontWeight: 'bold',
                  '&:hover': {
                    bgcolor: 'transparent',
                    textDecoration: 'underline',
                  },
                }}
                disabled={!playerTeam?.id || !onTeamClick}
              >
                {playerTeam?.name || 'N/A'}
              </Button>
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Overall Performance
        </Typography>
        <ListItem disablePadding>
          <ListItemText
            primary={
              <Typography variant="body1">
                Total Score:{' '}
                <Box component="span" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                  {playerTotalScore.toFixed(2)} {/* Format to 2 decimal places */}
                </Box>
              </Typography>
            }
            secondary={
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Overall Rank:{' '}
                    <Box
                      component="span"
                      sx={{
                        fontWeight: 'bold',
                        fontSize: '1.25rem',
                        color: isOverallRankFirst ? 'success.main' : 'text.secondary',
                      }}
                    >
                      {typeof playerOverallRank === 'number' && playerOverallRank !== 0
                        ? getOrdinalSuffix(playerOverallRank)
                        : playerOverallRank}
                    </Box>
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Team Rank:{' '}
                    <Box
                      component="span"
                      sx={{
                        fontWeight: 'bold',
                        fontSize: '1.25rem',
                        color: isTeamOverallRankFirst ? 'success.main' : 'text.secondary',
                      }}
                    >
                      {typeof playerTeamRank === 'number' && playerTeamRank !== 0
                        ? getOrdinalSuffix(playerTeamRank)
                        : playerTeamRank}
                    </Box>
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      if (onTeamClick && playerTeam?.id) {
                        onTeamClick(playerTeam.id);
                      }
                    }}
                    disabled={!playerTeam?.id || !onTeamClick}
                    sx={{ textTransform: 'none' }}
                  >
                    Team Stats
                  </Button>
                </Box>
              </>
            }
          />
        </ListItem>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          KPI Specific Stats & Ranks
        </Typography>
        <List sx={{ p: 0 }}>
          {gameKpis.map((kpi) => {
            const playerKpiValue = currentPlayerKpis[kpi.name]?.value || 0;
            const rank = playerKpiRanks[kpi.name] || 'N/A';
            const isKpiRankFirst = rank === 1;
            const teamKpiRank = playerTeamKpiRanks[kpi.name] || 'N/A';
            const isTeamKpiRankFirst = teamKpiRank === 1;

            return (
              <Card
                key={kpi.id}
                sx={{
                  mb: 2,
                  '&:hover': {
                    boxShadow: 3,
                  },
                }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <ListItem
                    disablePadding
                    button
                    onClick={() => handleOpenDailyStatsDialog(kpi.name)}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      borderRadius: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {kpi.icon_name && (
                            <Iconify
                              icon={getDefaultIcon(kpi.icon_name)}
                              width={20}
                              height={20}
                              sx={{ color: 'text.secondary', mr: 0.5 }}
                            />
                          )}
                          <Typography
                            variant="body1"
                            sx={{
                              color: 'text.primary',
                              fontWeight: 'bold',
                            }}
                          >
                            {kpi.name.replace(/_/g, ' ')}:{' '}
                            <Box component="span" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                              {playerKpiValue.toFixed(2)} {/* Format to 2 decimal places */}
                            </Box>
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            Overall Rank:{' '}
                            <Box
                              component="span"
                              sx={{
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                color: isKpiRankFirst ? 'success.main' : 'text.secondary',
                              }}
                            >
                              {typeof rank === 'number' && rank !== 0
                                ? getOrdinalSuffix(rank)
                                : rank}
                            </Box>
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Team Rank:{' '}
                            <Box
                              component="span"
                              sx={{
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                color: isTeamKpiRankFirst ? 'success.main' : 'text.secondary',
                              }}
                            >
                              {typeof teamKpiRank === 'number' && teamKpiRank !== 0
                                ? getOrdinalSuffix(teamKpiRank)
                                : teamKpiRank}
                            </Box>
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                </CardContent>
              </Card>
            );
          })}
        </List>
      </CardContent>

      <Dialog
        open={openDailyStatsDialog}
        onClose={handleCloseDailyStatsDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Daily Stats for {selectedKpiNameForDailyStats?.replace(/_/g, ' ')}{' '}
          <IconButton
            aria-label="close"
            onClick={handleCloseDailyStatsDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {editingDailyStat ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Edit Stat
              </Typography>
              <TextField
                autoFocus
                margin="dense"
                id="edit-value"
                label="Stat Value"
                type="number"
                fullWidth
                variant="outlined"
                value={editedDailyStatValue}
                onChange={(e) => setEditedDailyStatValue(e.target.value)}
                sx={{ mt: 2 }}
              />
              <TextField
                margin="dense"
                id="edit-date"
                label="Date Recorded"
                type="date"
                fullWidth
                variant="outlined"
                value={editedDailyStatDate}
                onChange={(e) => setEditedDailyStatDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{ mt: 2 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                <Button onClick={handleCancelEditingDailyStat} variant="outlined">
                  Cancel
                </Button>
                <Button onClick={handleUpdateDailyStat} variant="contained" disabled={isUpdating}>
                  Save Changes
                </Button>
              </Box>
            </Box>
          ) : currentKpiDailyStats.length > 0 ? (
            <List>
              {currentKpiDailyStats.map((stat, index) => (
                <ListItem key={stat.statId || index} disablePadding sx={{ pr: 0 }}>
                  <ListItemText
                    primary={
                      <Typography variant="body1">
                        Date:{' '}
                        <Box component="span" sx={{ fontWeight: 'bold' }}>
                          {String(stat.date)}
                        </Box>
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        Value:{' '}
                        <Box component="span" sx={{ fontWeight: 'bold' }}>
                          {stat.value.toFixed(2)} {/* Format to 2 decimal places */}
                        </Box>
                      </Typography>
                    }
                  />
                  {stat.statId && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => handleStartEditingDailyStat(stat)}
                        disabled={isDeleting || isUpdating}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteDailyStat(stat.statId)}
                        disabled={isDeleting || isUpdating}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography>No daily stats available for this KPI.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDailyStatsDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
