// src/sections/games/view/game-details-view.jsx (or src/pages/dashboard/games/[gameId]/index.jsx)
import React from 'react';
import { Link } from 'react-router'; // keep this like this please dont change it
import { useCallback, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  TableSortLabel,
  Divider,
  Grid,
} from '@mui/material';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';

// RTK Query Hooks for Game and Stats Data
import {
  useGetGameByIdQuery,
  useGetGameKpisByGameIdQuery,
  useGetGamePlayerStatsQuery, // This is the hook from statsAPI for player stats
} from 'src/features/stats/statsAPI';
import {
  useGetDraftPicksByGameIdQuery,
  useGetAllProfilesQuery,
  useGetAllTeamsQuery,
  useGetAchievementDefinitionsQuery,
  useGetGameTypesQuery
} from 'src/features/games/gamesAPI';

import { Iconify } from 'src/components/iconify';
import { EndGameButton } from 'src/components/game/end-game-button';
import { getDefaultIcon } from 'src/components/icon-picker/icon-picker';
import { H2HScheduleManager } from 'src/components/game/h2h-schedule-manager';

import { TeamDetails } from 'src/sections/games/view/team-details';
import { PlayerStats } from 'src/sections/games/view/player-stats';
import { GameStatsDisplay } from 'src/sections/games/view/game-stats-display';
import { GameStatsInputForm } from 'src/sections/games/view/game-stats-input-form';

import { GameInfoCard } from './game-info-card';
import { TeamStandingsTable } from './team-standings-table';
import { DraftResultsDisplay } from './draft-results-display';

// ---

const TABS = [
  { value: 0, label: 'Leaderboard' },
  { value: 1, label: 'Team Details' },
  { value: 2, label: 'Player Details' },
  { value: 3, label: 'Game Info & KPIs' },
  { value: 4, label: 'Game Stats Display' },
  { value: 5, label: 'Stats Input' },
  { value: 6, label: 'Draft Results' },
];

function TabPanel({ children, index, value, sx, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3, ...sx }}>{children}</Box>}
    </div>
  );
}

export function GameDetailsView() {
  const { id: gameId } = useParams();
  const [currentTab, setCurrentTab] = useState(TABS[0].value);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamOrderBy, setTeamOrderBy] = useState('total_score');
  const [teamOrder, setTeamOrder] = useState('desc');
  const [leaderboardOrderBy, setLeaderboardOrderBy] = useState('totalScore');
  const [leaderboardOrder, setLeaderboardOrder] = useState('desc');

  // Log gameId on initial render
  console.log('GameDetailsView: Initializing with gameId:', gameId);

  const handleChangeTab = useCallback(
    (event, newValue) => {
      console.log('GameDetailsView: Tab changed from', currentTab, 'to', newValue);
      setCurrentTab(newValue);
      if (newValue !== TABS[2].value) {
        setSelectedPlayerId(null);
        console.log('GameDetailsView: Resetting selectedPlayerId to null');
      }
      if (newValue !== TABS[1].value) {
        setSelectedTeamId(null);
        console.log('GameDetailsView: Resetting selectedTeamId to null');
      }
    },
    [currentTab]
  );

  const handlePlayerSelect = useCallback((playerId) => {
    console.log('GameDetailsView: Player selected:', playerId);
    setSelectedPlayerId(playerId);
    setCurrentTab(TABS[2].value); // Switch to Player Details tab
  }, []);

  const handleTeamSelect = useCallback((teamId) => {
    console.log('GameDetailsView: Team selected:', teamId);
    setSelectedTeamId(teamId);
    setCurrentTab(TABS[1].value);
  }, []);

  const handleTeamRequestSort = useCallback(
    (property) => {
      console.log('GameDetailsView: Team sort requested for property:', property);
      const isAsc = teamOrderBy === property && teamOrder === 'asc';
      if (teamOrderBy === property) {
        setTeamOrder(isAsc ? 'desc' : 'asc');
      } else {
        if (property === 'total_score' || property.startsWith('kpi_')) {
          setTeamOrder('desc');
        } else if (property === 'team_name') {
          setTeamOrder('asc');
        }
        setTeamOrderBy(property);
      }
    },
    [teamOrderBy, teamOrder]
  );

  const handleLeaderboardRequestSort = useCallback(
    (property) => {
      console.log('GameDetailsView: Leaderboard sort requested for property:', property);
      const isAsc = leaderboardOrderBy === property && leaderboardOrder === 'asc';

      if (leaderboardOrderBy === property) {
        setLeaderboardOrder(isAsc ? 'desc' : 'asc');
      } else {
        if (property === 'totalScore' || property.startsWith('kpi_')) {
          setLeaderboardOrder('desc');
        } else if (property === 'displayName') {
          setLeaderboardOrder('asc');
        }
        setLeaderboardOrderBy(property);
      }
    },
    [leaderboardOrderBy, leaderboardOrder]
  );
  const handleGoBackToLeaderboard = useCallback(() => {
    console.log('GameDetailsView: Going back to Leaderboard tab.');
    setCurrentTab(TABS[0].value); // Set to Leaderboard tab (value 0)
    setSelectedPlayerId(null); // Clear any selected player
    setSelectedTeamId(null); // Clear any selected team
  }, []);
  // Data fetching via RTK Query hooks
  // *** IMPORTANT: Added skip: !gameId to prevent API calls with undefined gameId ***
  const { data: game, isLoading, isError, error } = useGetGameByIdQuery(gameId, { skip: !gameId });
  const {
    data: rawDraftPicks = [],
    isLoading: isLoadingDraftPicks,
    isError: isErrorDraftPicks,
    error: draftPicksError,
  } = useGetDraftPicksByGameIdQuery(gameId, { skip: !gameId });
  const { data: allTeams = [], isLoading: isLoadingAllTeams } = useGetAllTeamsQuery();
  const { data: allProfiles = [], isLoading: isLoadingAllProfiles } = useGetAllProfilesQuery();
  const {
    data: gameKpis = [],
    isLoading: isLoadingGameKpis,
    isError: isErrorGameKpis,
    error: gameKpisError,
  } = useGetGameKpisByGameIdQuery(gameId, { skip: !gameId });
  const {
    data: playerStats = [],
    isLoading: isLoadingPlayerStats,
    isError: isErrorPlayerStats,
    error: playerStatsError,
  } = useGetGamePlayerStatsQuery(gameId, { skip: !gameId }); // Using hook from statsAPI
  // NEW: Fetch achievement definitions
  const {
    data: achievementDefinitionsData = [],
    isLoading: isLoadingAchievementDefinitions,
    isError: isErrorAchievementDefinitions,
    error: achievementDefinitionsError,
  } = useGetAchievementDefinitionsQuery();
  // NEW: Fetch all game types to identify H2H types
  const {
    data: allGameTypes = [],
    isLoading: isLoadingGameTypes,
    isError: isErrorGameTypes,
    error: gameTypesError,
  } = useGetGameTypesQuery();

  // Log raw data from queries
  console.log('GameDetailsView: Query Results - game:', game, 'isLoading:', isLoading);
  console.log(
    'GameDetailsView: Query Results - rawDraftPicks:',
    rawDraftPicks,
    'isLoadingDraftPicks:',
    isLoadingDraftPicks
  );
  console.log(
    'GameDetailsView: Query Results - allTeams:',
    allTeams,
    'isLoadingAllTeams:',
    isLoadingAllTeams
  );
  console.log(
    'GameDetailsView: Query Results - allProfiles:',
    allProfiles,
    'isLoadingAllProfiles:',
    isLoadingAllProfiles
  );
  console.log(
    'GameDetailsView: Query Results - gameKpis:',
    gameKpis,
    'isLoadingGameKpis:',
    isLoadingGameKpis
  );
  console.log(
    'GameDetailsView: Query Results - playerStats:',
    playerStats,
    'isLoadingPlayerStats:',
    isLoadingPlayerStats
  );
  console.log(
    'GameDetailsView: Query Results - achievementDefinitionsData:',
    achievementDefinitionsData,
    'isLoadingAchievementDefinitions:',
    isLoadingAchievementDefinitions
  );
  console.log(
    'GameDetailsView: Query Results - allGameTypes:',
    allGameTypes,
    'isLoadingGameTypes:',
    isLoadingGameTypes
  );

  const profileMap = useMemo(() => {
    const map = allProfiles.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});
    console.log('GameDetailsView: profileMap created:', map);
    return map;
  }, [allProfiles]);

  const teamMap = useMemo(() => {
    const map = allTeams.reduce((acc, team) => {
      acc[team.id] = team;
      return acc;
    }, {});
    console.log('GameDetailsView: teamMap created:', map);
    return map;
  }, [allTeams]);

  // NEW: Determine H2H game type IDs
  const h2hGameTypeIds = useMemo(() => {
    // Filter game types to get only H2H types based on their names
    // This assumes 'Individual H2H' and 'Draft H2H' are the specific names in your game_types table
    const ids = allGameTypes
      .filter((type) => type.name === 'Individual H2H' || type.name === 'Draft H2H')
      .map((type) => type.id);
    console.log('GameDetailsView: h2hGameTypeIds identified:', ids);
    return ids;
  }, [allGameTypes]);

  const hydratedDraftPicks = useMemo(() => {
    // Check if raw data and maps are ready
    if (!rawDraftPicks.length || !Object.keys(profileMap).length || !Object.keys(teamMap).length) {
      console.log(
        'GameDetailsView: Skipping hydratedDraftPicks memo, dependencies not ready or empty.',
        {
          rawDraftPicksLength: rawDraftPicks.length,
          profileMapKeys: Object.keys(profileMap).length,
          teamMapKeys: Object.keys(teamMap).length,
        }
      );
      return [];
    }
    const hydrated = rawDraftPicks.map((pick) => ({
      ...pick,
      profiles: profileMap[pick.player_id] || null, // Ensure player_id matches profileMap key
      teams: teamMap[pick.team_id] || null, // Ensure team_id matches teamMap key
    }));
    console.log('GameDetailsView: hydratedDraftPicks created:', hydrated);
    return hydrated;
  }, [rawDraftPicks, profileMap, teamMap]);

  const teamsData = useMemo(() => {
    if (!hydratedDraftPicks || hydratedDraftPicks.length === 0) {
      console.log('GameDetailsView: Skipping teamsData memo, no hydratedDraftPicks.');
      return [];
    }
    const uniqueTeamsMap = new Map();
    hydratedDraftPicks.forEach((pick) => {
      if (pick.teams && pick.teams.id) {
        uniqueTeamsMap.set(pick.teams.id, pick.teams);
      }
    });
    const extractedTeams = Array.from(uniqueTeamsMap.values());
    console.log('GameDetailsView: teamsData (extracted unique teams) created:', extractedTeams);
    return extractedTeams;
  }, [hydratedDraftPicks]);

  const isLoadingTeamsData = isLoadingAllTeams || isLoadingDraftPicks;
  const hasDraftOccurred = hydratedDraftPicks.length > 0;
  console.log('GameDetailsView: hasDraftOccurred:', hasDraftOccurred);

  const draftPicksByRound = useMemo(() => {
    const result = hydratedDraftPicks.reduce((acc, pick) => {
      const round = pick.round_number;
      if (round === undefined || round === null) {
        // Skip picks without a valid round number
        return acc;
      }
      if (!acc[round]) {
        acc[round] = [];
      }
      acc[round].push(pick);
      return acc;
    }, {});
    Object.keys(result).forEach((round) => {
      result[round].sort((a, b) => (a.pick_number || 0) - (b.pick_number || 0));
    });
    console.log('GameDetailsView: draftPicksByRound created:', result);
    return result;
  }, [hydratedDraftPicks]);

  const draftPicksByTeam = useMemo(() => {
    const result = hydratedDraftPicks.reduce((acc, pick) => {
      const teamId = pick.teams?.id; // Use optional chaining for safety
      if (!teamId) {
        // Skip picks without a valid team ID
        return acc;
      }

      if (!acc[teamId]) {
        acc[teamId] = {
          id: teamId,
          name: pick.teams?.name || 'Unknown Team', // Ensure name is available
          color: pick.teams?.color || '#9E9E9E', // Ensure color is available
          picks: [],
        };
      }
      acc[teamId].picks.push(pick);
      return acc;
    }, {});
    // Sort picks within each team's array if desired
    Object.values(result).forEach((teamData) => {
      teamData.picks.sort((a, b) => (a.pick_number || 0) - (b.pick_number || 0));
    });
    console.log('GameDetailsView: draftPicksByTeam created:', result);
    return result;
  }, [hydratedDraftPicks]);

  const teamStandings = useMemo(() => {
    // Only proceed if all necessary data is available
    if (!playerStats.length || !gameKpis.length || !hydratedDraftPicks.length) {
      console.log('GameDetailsView: Skipping teamStandings memo, dependencies not ready.', {
        playerStatsLength: playerStats.length,
        gameKpisLength: gameKpis.length,
        hydratedDraftPicksLength: hydratedDraftPicks.length,
      });
      return [];
    }
    const playerTeamMap = new Map();
    hydratedDraftPicks.forEach((pick) => {
      // Ensure player_id, profiles, and teams are available from the pick
      if (pick.player_id && pick.profiles && pick.teams) {
        playerTeamMap.set(pick.player_id, {
          player: pick.profiles,
          team: pick.teams,
        });
      }
    });
    console.log('GameDetailsView: teamStandings - playerTeamMap:', playerTeamMap);

    const teamAggregatedStats = new Map();
    // Initialize aggregated stats for all relevant teams from teamsData
    teamsData.forEach((team) => {
      teamAggregatedStats.set(team.id, {
        team: {
          id: team.id,
          name: team.name,
          color: team.color,
        },
        totalScore: 0,
        kpis: {},
      });
    });
    console.log(
      'GameDetailsView: teamStandings - initial teamAggregatedStats:',
      teamAggregatedStats
    );

    playerStats.forEach((stat) => {
      const playerId = stat.player_id;
      const kpiId = stat.kpi_id;
      const kpiValue = stat.value;
      const playerTeamInfo = playerTeamMap.get(playerId);

      if (playerTeamInfo && playerTeamInfo.team) {
        const teamId = playerTeamInfo.team.id;
        // Check if the team exists in the map (it should, as we pre-populated from teamsData)
        if (!teamAggregatedStats.has(teamId)) {
          // This case should ideally not be hit if teamsData accurately reflects all teams in draft picks
          console.warn(
            `GameDetailsView: teamStandings - No pre-existing entry for teamId ${teamId} from player ${playerId}. Creating on the fly.`
          );
          teamAggregatedStats.set(teamId, {
            team: {
              id: teamId,
              name: playerTeamInfo.team.name || 'Unknown Team',
              color: playerTeamInfo.team.color || '#9E9E9E',
            },
            totalScore: 0,
            kpis: {},
          });
        }

        const teamStats = teamAggregatedStats.get(teamId);
        const associatedKpi = gameKpis.find((gk) => gk.id === kpiId);

        if (associatedKpi) {
          const scoreToAdd = kpiValue * (associatedKpi.points || 0);
          teamStats.totalScore += scoreToAdd;
          teamStats.kpis[associatedKpi.name] = (teamStats.kpis[associatedKpi.name] || 0) + kpiValue;
        } else {
          console.warn(
            `GameDetailsView: teamStandings - KPI with ID ${kpiId} not found for player ${playerId} stat.`
          );
        }
      } else {
        console.warn(
          `GameDetailsView: teamStandings - Player ${playerId} or their team info not found in playerTeamMap.`
        );
      }
    });

    const sortedStandings = Array.from(teamAggregatedStats.values()).sort((a, b) => {
      let comparison = 0;
      if (teamOrderBy === 'total_score') {
        comparison = b.totalScore - a.totalScore;
      } else if (teamOrderBy === 'team_name') {
        comparison = a.team.name.localeCompare(b.team.name);
      } else if (teamOrderBy.startsWith('kpi_')) {
        const kpiName = teamOrderBy.substring(4);
        const aKpiValue = a.kpis[kpiName] || 0;
        const bKpiValue = b.kpis[kpiName] || 0;
        comparison = bKpiValue - aKpiValue;
      }

      return teamOrder === 'asc' ? -comparison : comparison;
    });
    console.log('GameDetailsView: teamStandings (final sorted) created:', sortedStandings);
    return sortedStandings;
  }, [playerStats, gameKpis, hydratedDraftPicks, teamsData, teamOrderBy, teamOrder]);

  const { leaderboardData, overallTopScorer, kpiGameLeaders } = useMemo(() => {
    // Include the new isLoadingAchievementDefinitions in the memo's loading check
    if (
      isLoadingPlayerStats ||
      isLoadingGameKpis ||
      isLoadingDraftPicks ||
      isLoadingAllProfiles ||
      isLoadingAllTeams ||
      isLoadingAchievementDefinitions
    ) {
      console.log(
        'GameDetailsView: Skipping leaderboardData memo, one or more dependencies are still loading.'
      );
      return { leaderboardData: [], overallTopScorer: null, kpiGameLeaders: {} };
    }

    const playerInfoMap = new Map();
    hydratedDraftPicks.forEach((pick) => {
      if (pick.player_id && pick.profiles && pick.teams) {
        playerInfoMap.set(pick.player_id, {
          displayName:
            pick.profiles?.display_name ||
            `${pick.profiles?.first_name} ${pick.profiles?.last_name}`,
          team: {
            id: pick.teams.id,
            name: pick.teams.name,
            color: pick.teams.color,
          },
          avatarChar: (pick.profiles?.display_name || pick.profiles?.first_name)?.charAt(0) || '?',
        });
      } else {
        console.warn(
          'GameDetailsView: leaderboardData - Skipping draft pick due to missing player_id, profiles, or teams:',
          pick
        );
      }
    });
    console.log('GameDetailsView: leaderboardData - playerInfoMap:', playerInfoMap);

    const aggregatedPlayerStats = new Map();
    const kpiGameLeadersTemp = {};

    playerStats.forEach((stat) => {
      const pId = stat.player_id;
      const kpi = gameKpis.find((gKpi) => gKpi.id === stat.kpi_id);
      const playerInfo = playerInfoMap.get(pId);

      if (kpi && playerInfo) {
        if (!aggregatedPlayerStats.has(pId)) {
          aggregatedPlayerStats.set(pId, {
            player_id: pId,
            totalScore: 0,
            kpis: {},
            displayName: playerInfo.displayName,
            team: playerInfo.team,
            avatarChar: playerInfo.avatarChar,
          });
        }
        const currentStats = aggregatedPlayerStats.get(pId);
        currentStats.totalScore += stat.value * (kpi.points || 0);
        currentStats.kpis[kpi.name] = (currentStats.kpis[kpi.name] || 0) + stat.value;

        const existingLeader = kpiGameLeadersTemp[kpi.name];
        if (
          !existingLeader ||
          stat.value > existingLeader.value ||
          (stat.value === existingLeader.value &&
            currentStats.totalScore >
              aggregatedPlayerStats.get(existingLeader.playerId)?.totalScore)
        ) {
          kpiGameLeadersTemp[kpi.name] = {
            playerId: pId,
            playerName: playerInfo.displayName,
            value: stat.value,
            avatarChar: playerInfo.avatarChar,
            teamColor: playerInfo.team?.color || '#9E9E9E',
            iconName: kpi.icon_name,
          };
        }
      } else {
        if (!kpi)
          console.warn(
            `GameDetailsView: leaderboardData - KPI with ID ${stat.kpi_id} not found for stat.`,
            stat
          );
        if (!playerInfo)
          console.warn(
            `GameDetailsView: leaderboardData - Player info for ID ${pId} not found in playerInfoMap for stat.`,
            stat
          );
      }
    });
    const allPlayersCalculatedStats = Array.from(aggregatedPlayerStats.values());
    console.log(
      'GameDetailsView: leaderboardData - allPlayersCalculatedStats:',
      allPlayersCalculatedStats
    );

    const topScorer =
      [...allPlayersCalculatedStats].sort((a, b) => b.totalScore - a.totalScore)[0] || null;
    console.log('GameDetailsView: leaderboardData - overallTopScorer:', topScorer);

    const sortedPlayers = [...allPlayersCalculatedStats].sort((a, b) => {
      let comparison = 0;
      if (leaderboardOrderBy === 'totalScore') {
        comparison = b.totalScore - a.totalScore;
      } else if (leaderboardOrderBy === 'displayName') {
        comparison = a.displayName.localeCompare(b.displayName);
      } else if (leaderboardOrderBy.startsWith('kpi_')) {
        const kpiName = leaderboardOrderBy.substring(4);
        const aKpiValue = a.kpis[kpiName] || 0;
        const bKpiValue = b.kpis[kpiName] || 0;
        comparison = bKpiValue - aKpiValue;
      }
      return leaderboardOrder === 'asc' ? -comparison : comparison;
    });
    console.log('GameDetailsView: leaderboardData - sortedPlayers for leaderboard:', sortedPlayers);
    console.log('GameDetailsView: leaderboardData - kpiGameLeaders:', kpiGameLeadersTemp);

    return {
      leaderboardData: sortedPlayers.map((player, index) => ({
        ...player,
        rank: index + 1,
      })),
      overallTopScorer: topScorer,
      kpiGameLeaders: kpiGameLeadersTemp,
    };
  }, [
    playerStats,
    gameKpis,
    hydratedDraftPicks,
    isLoadingPlayerStats,
    isLoadingGameKpis,
    isLoadingDraftPicks,
    isLoadingAllProfiles,
    isLoadingAllTeams,
    isLoadingAchievementDefinitions,
    leaderboardOrderBy,
    leaderboardOrder,
  ]);

  const kpiDetailsMap = useMemo(() => {
    const map = new Map();
    gameKpis.forEach((kpi) => map.set(kpi.name, kpi));
    console.log('GameDetailsView: kpiDetailsMap created:', map);
    return map;
  }, [gameKpis]);

  const kpiColumnNames = useMemo(() => {
    const names = gameKpis.map((kpi) => kpi.name);
    console.log('GameDetailsView: kpiColumnNames created:', names);
    return names;
  }, [gameKpis]);

  // COMBINED LOADING STATUS FOR THE WHOLE PAGE
  const overallLoading =
    isLoading ||
    isLoadingDraftPicks ||
    isLoadingGameKpis ||
    isLoadingPlayerStats ||
    isLoadingAllProfiles ||
    isLoadingAllTeams ||
    isLoadingAchievementDefinitions ||
    isLoadingGameTypes; // <-- NEW: Include isLoadingGameTypes

  console.log('GameDetailsView: Overall Loading Status -', overallLoading ? 'LOADING' : 'LOADED');

  if (overallLoading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
        <CircularProgress />
        <Typography variant="subtitle1" sx={{ mt: 2 }}>
          Loading game, draft picks, KPI, player stats, profiles, game types, and achievement
          definitions...
        </Typography>
      </Stack>
    );
  }

  // COMBINED ERROR CHECK
  if (
    isError ||
    isErrorDraftPicks ||
    isErrorGameKpis ||
    isErrorPlayerStats ||
    isErrorAchievementDefinitions ||
    isErrorGameTypes // <-- NEW: Include isErrorGameTypes
  ) {
    console.error('GameDetailsView: Error encountered during data fetching!', {
      error,
      draftPicksError,
      gameKpisError,
      playerStatsError,
      achievementDefinitionsError,
      gameTypesError, // <-- NEW: Include gameTypesError message
    });
    return (
      <Alert severity="error" sx={{ my: 3 }}>
        Error:{' '}
        {error?.message ||
          error?.data?.message ||
          draftPicksError?.message ||
          draftPicksError?.data?.message ||
          gameKpisError?.message ||
          gameKpisError?.data?.message ||
          playerStatsError?.message ||
          playerStatsError?.data?.message ||
          achievementDefinitionsError?.message ||
          achievementDefinitionsError?.data?.message ||
          gameTypesError?.message || // <-- NEW: Include gameTypesError message
          gameTypesError?.data?.message ||
          `Failed to fetch game data for game ID: ${gameId}. Check network and API responses.`}
      </Alert>
    );
  }

  if (!game) {
    console.warn('GameDetailsView: No game data found for gameId:', gameId);
    return (
      <Alert severity="warning" sx={{ my: 3 }}>
        Game with ID: {gameId} not found.
      </Alert>
    );
  }

  // Before rendering, log the final data structures that will be passed to children
  console.log('GameDetailsView: Rendering with final data - game:', game);
  console.log('GameDetailsView: Rendering with final data - teamsData:', teamsData);
  console.log('GameDetailsView: Rendering with final data - rawDraftPicks:', rawDraftPicks);
  console.log(
    'GameDetailsView: Rendering with final data - hydratedDraftPicks:',
    hydratedDraftPicks
  ); // Added this log for clarity
  console.log('GameDetailsView: Rendering with final data - playerStats:', playerStats);
  console.log('GameDetailsView: Rendering with final data - gameKpis:', gameKpis);
  console.log('GameDetailsView: Rendering with final data - allProfiles:', allProfiles);
  console.log(
    'GameDetailsView: Rendering with final data - achievementDefinitionsData:',
    achievementDefinitionsData
  );
  console.log('GameDetailsView: Rendering with final data - teamStandings:', teamStandings);
  console.log('GameDetailsView: Rendering with final data - leaderboardData:', leaderboardData);
  console.log('GameDetailsView: Rendering with final data - selectedTeamId:', selectedTeamId);
  console.log('GameDetailsView: Rendering with final data - selectedPlayerId:', selectedPlayerId);
  console.log('GameDetailsView: Rendering with final data - draftPicksByRound:', draftPicksByRound); // Added this log
  console.log('GameDetailsView: Rendering with final data - draftPicksByTeam:', draftPicksByTeam); // Added this log
  console.log('GameDetailsView: Rendering with final data - h2hGameTypeIds:', h2hGameTypeIds); // Added this log

  // Check if the current game is an H2H type
  const isCurrentGameH2H = h2hGameTypeIds.includes(game.game_type_id);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Game Details: {game.name}
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {' '}
        {/* Use Stack for button arrangement */}
        <Button
          component={Link}
          to={`${paths.dashboard.draft.new}?gameId=${game.id}`}
          variant="contained"
          color="primary"
          startIcon={<Iconify icon="eva:flash-fill" />}
          disabled={hasDraftOccurred}
        >
          {hasDraftOccurred ? 'Draft Completed for This Game' : 'Start Draft for This Game'}
        </Button>
        {/* NEW: H2H Schedule Manager Component */}
        {isCurrentGameH2H && (
          <H2HScheduleManager
            game={game}
            hasDraftOccurred={hasDraftOccurred}
            isParentLoading={overallLoading}
            h2hGameTypeIds={h2hGameTypeIds} // Pass the array of H2H game type UUIDs
          />
        )}
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleChangeTab} aria-label="game details tabs">
          {TABS.map((tab) => (
            <Tab key={tab.value} label={tab.label} value={tab.value} />
          ))}
        </Tabs>
      </Box>
      <TabPanel value={currentTab} index={TABS[0].value}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Team Standings
            </Typography>
            <TeamStandingsTable
              teamStandings={teamStandings}
              kpiColumnNames={kpiColumnNames}
              kpiDetailsMap={kpiDetailsMap}
              teamOrderBy={teamOrderBy}
              teamOrder={teamOrder}
              handleTeamRequestSort={handleTeamRequestSort}
              onTeamClick={handleTeamSelect}
            />
          </CardContent>
        </Card>
        <Divider sx={{ my: 4 }} />
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Game Leaders
            </Typography>
            <Grid container spacing={2}>
              {overallTopScorer && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Overall Game MVP
                      </Typography>
                      <Button
                        onClick={() => handlePlayerSelect(overallTopScorer.player_id)}
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
              {Object.entries(kpiGameLeaders)
                .sort(([kpiNameA], [kpiNameB]) => kpiNameA.localeCompare(kpiNameB))
                .map(([kpiName, leader]) => (
                  <Grid item xs={12} md={overallTopScorer ? 6 : 4} key={kpiName}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={1} gutterBottom>
                          {leader.iconName && (
                            <Iconify
                              icon={getDefaultIcon(leader.iconName)}
                              sx={{ mr: 0.5, fontSize: 20 }}
                            />
                          )}
                          <Typography variant="subtitle1" fontWeight="bold">
                            {kpiName.replace(/_/g, ' ')} Leader
                          </Typography>
                        </Stack>
                        <Button
                          onClick={() => handlePlayerSelect(leader.playerId)}
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
                                bgcolor: leader.teamColor,
                                width: 40,
                                height: 40,
                              }}
                            >
                              {leader.avatarChar}
                            </Avatar>
                            <Box>
                              <Typography variant="body1" fontWeight="medium">
                                {leader.playerName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {kpiName.replace(/_/g, ' ')}: {leader.value.toFixed(2)}
                              </Typography>
                            </Box>
                          </Stack>
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
            </Grid>
          </CardContent>
        </Card>
        <Divider sx={{ my: 3 }} />
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Player Leaderboard
            </Typography>
            <TableContainer component={Paper}>
              <Table aria-label="game leaderboard">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Rank</TableCell>
                    <TableCell
                      sx={{ fontWeight: 'bold' }}
                      sortDirection={
                        leaderboardOrderBy === 'displayName' ? leaderboardOrder : false
                      }
                    >
                      <TableSortLabel
                        active={leaderboardOrderBy === 'displayName'}
                        direction={leaderboardOrderBy === 'displayName' ? leaderboardOrder : 'asc'}
                        onClick={() => handleLeaderboardRequestSort('displayName')}
                      >
                        Player
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Team</TableCell>
                    <TableCell
                      sx={{ fontWeight: 'bold' }}
                      align="right"
                      sortDirection={leaderboardOrderBy === 'totalScore' ? leaderboardOrder : false}
                    >
                      <TableSortLabel
                        active={leaderboardOrderBy === 'totalScore'}
                        direction={leaderboardOrderBy === 'totalScore' ? leaderboardOrder : 'desc'}
                        onClick={() => handleLeaderboardRequestSort('totalScore')}
                      >
                        Total Score
                      </TableSortLabel>
                    </TableCell>
                    {gameKpis.map((kpi) => (
                      <TableCell
                        key={kpi.id}
                        sx={{ fontWeight: 'bold' }}
                        align="right"
                        sortDirection={
                          leaderboardOrderBy === `kpi_${kpi.name}` ? leaderboardOrder : false
                        }
                      >
                        <TableSortLabel
                          active={leaderboardOrderBy === `kpi_${kpi.name}`}
                          direction={
                            leaderboardOrderBy === `kpi_${kpi.name}` ? leaderboardOrder : 'desc'
                          }
                          onClick={() => handleLeaderboardRequestSort(`kpi_${kpi.name}`)}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="flex-end"
                            spacing={0.5}
                          >
                            {kpi.icon_name && (
                              <Iconify
                                icon={getDefaultIcon(kpi.icon_name)}
                                width={20}
                                height={20}
                              />
                            )}
                            <Box>{kpi.name.replace(/_/g, ' ')}</Box>
                          </Stack>
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaderboardData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4 + kpiColumnNames.length} align="center">
                        No player stats available for this game.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaderboardData.map((player) => (
                      <TableRow key={player.player_id}>
                        <TableCell>{player.rank}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handlePlayerSelect(player.player_id)}
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
                                {player.displayName.charAt(0)}
                              </Avatar>
                              <Typography variant="body2" noWrap>
                                {player.displayName}
                              </Typography>
                            </Stack>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleTeamSelect(player.team?.id)}
                            sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
                            color="inherit"
                          >
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Avatar
                                sx={{
                                  bgcolor: player.team?.color || '#9E9E9E',
                                  width: 24,
                                  height: 24,
                                  fontSize: '0.7rem',
                                }}
                              >
                                {player.team?.name.charAt(0) || '?'}
                              </Avatar>
                              <Typography variant="body2" noWrap>
                                {player.team?.name || 'N/A'}
                              </Typography>
                            </Stack>
                          </Button>
                        </TableCell>
                        <TableCell align="right">{player.totalScore.toFixed(2)}</TableCell>
                        {kpiColumnNames.map((kpiName) => (
                          <TableCell key={kpiName} align="right">
                            {(player.kpis[kpiName] || 0).toFixed(2)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>
      <TabPanel value={currentTab} index={TABS[1].value}>
        <TeamDetails gameId={gameId} teamId={selectedTeamId} onPlayerClick={handlePlayerSelect} />
      </TabPanel>
      <TabPanel value={currentTab} index={TABS[2].value}>
        <PlayerStats
          playerId={selectedPlayerId}
          gameId={gameId}
          gameKpis={gameKpis}
          playerStats={playerStats}
          allProfiles={allProfiles}
          allTeams={allTeams}
        />
      </TabPanel>
      <TabPanel value={currentTab} index={TABS[3].value}>
        {/* Pass h2hGameTypeIds to GameInfoCard */}
        <GameInfoCard game={game} gameKpis={gameKpis} h2hGameTypeIds={h2hGameTypeIds} />
      </TabPanel>
      <TabPanel value={currentTab} index={TABS[4].value}>
        <GameStatsDisplay
          game={game}
          gameId={gameId}
          gameKpis={gameKpis}
          playerStats={playerStats}
          draftPicksByRound={draftPicksByRound}
          onPlayerSelect={handlePlayerSelect}
          onTeamSelect={handleTeamSelect}
        />
      </TabPanel>
      <TabPanel value={currentTab} index={TABS[5].value}>
        <GameStatsInputForm gameId={gameId} hasDraftOccurred={hasDraftOccurred} />
      </TabPanel>
      <TabPanel value={currentTab} index={TABS[6].value}>
        <DraftResultsDisplay
          // If DraftResultsDisplay expects a prop named 'draftPicks', pass hydratedDraftPicks
          // draftPicks={hydratedDraftPicks} // <--- Uncomment if DraftResultsDisplay expects 'draftPicks'
          draftPicksByRound={draftPicksByRound}
          draftPicksByTeam={draftPicksByTeam}
          onPlayerSelect={handlePlayerSelect}
          onTeamSelect={handleTeamSelect}
        />
      </TabPanel>

      {/* END GAME BUTTON - Now with all required props */}
      <EndGameButton
        gameId={gameId}
        gameName={game.name}
        allProfiles={allProfiles}
        teamsData={teamsData}
        playerStatsData={playerStats}
        draftPicksData={rawDraftPicks}
        gameKpisData={gameKpis}
        achievementDefinitionsData={achievementDefinitionsData}
        isParentLoading={overallLoading}
      />
    </Box>
  );
}
