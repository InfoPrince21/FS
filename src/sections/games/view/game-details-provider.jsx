// src/sections/games/view/game-details-provider.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  useGetDraftPicksByGameIdQuery,
  useGetAllProfilesQuery,
  useGetAllTeamsQuery,
} from 'src/features/games/gamesAPI';
import {
  useGetGameByIdQuery,
  useGetGameKpisByGameIdQuery,
  useGetGamePlayerStatsQuery,
} from 'src/features/stats/statsAPI';

// Define TABS here or import from a constants file if preferred
const TABS = [
  { value: 0, label: 'Leaderboard' },
  { value: 1, label: 'Team Details' },
  { value: 2, label: 'Player Details' },
  { value: 3, label: 'Game Info & KPIs' },
  { value: 4, label: 'Game Stats Display' },
  { value: 5, label: 'Stats Input' },
  { value: 6, label: 'Draft Results' },
];

export function GameDetailsProvider({ gameId, children }) {
  const [currentTab, setCurrentTab] = useState(TABS[0].value);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamOrderBy, setTeamOrderBy] = useState('total_score');
  const [teamOrder, setTeamOrder] = useState('desc');
  const [leaderboardOrderBy, setLeaderboardOrderBy] = useState('totalScore');
  const [leaderboardOrder, setLeaderboardOrder] = useState('desc');

  // --- Data Fetching ---
  const { data: game, isLoading, isError, error } = useGetGameByIdQuery(gameId);
  const {
    data: rawDraftPicks = [],
    isLoading: isLoadingDraftPicks,
    isError: isErrorDraftPicks,
    error: draftPicksError,
  } = useGetDraftPicksByGameIdQuery(gameId);
  const { data: allTeams = [], isLoading: isLoadingAllTeams } = useGetAllTeamsQuery();
  const { data: allProfiles = [], isLoading: isLoadingAllProfiles } = useGetAllProfilesQuery();
  const {
    data: gameKpis = [],
    isLoading: isLoadingGameKpis,
    isError: isErrorGameKpis,
    error: gameKpisError,
  } = useGetGameKpisByGameIdQuery(gameId);
  const {
    data: playerStats = [],
    isLoading: isLoadingPlayerStats,
    isError: isErrorPlayerStats,
    error: playerStatsError,
  } = useGetGamePlayerStatsQuery(gameId);

  const overallLoading =
    isLoading ||
    isLoadingDraftPicks ||
    isLoadingGameKpis ||
    isLoadingPlayerStats ||
    isLoadingAllProfiles ||
    isLoadingAllTeams;

  // Combine errors for a single check
  const overallError = useMemo(() => {
    if (isError) return error;
    if (isErrorDraftPicks) return draftPicksError;
    if (isErrorGameKpis) return gameKpisError;
    if (isErrorPlayerStats) return playerStatsError;
    return null;
  }, [
    isError,
    error,
    isErrorDraftPicks,
    draftPicksError,
    isErrorGameKpis,
    gameKpisError,
    isErrorPlayerStats,
    playerStatsError,
  ]);

  // --- Mapped Data (Memoized) ---
  const profileMap = useMemo(
    () =>
      allProfiles.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {}),
    [allProfiles]
  );

  const teamMap = useMemo(
    () =>
      allTeams.reduce((acc, team) => {
        acc[team.id] = team;
        return acc;
      }, {}),
    [allTeams]
  );

  const hydratedDraftPicks = useMemo(() => {
    if (!rawDraftPicks.length || !Object.keys(profileMap).length || !Object.keys(teamMap).length) {
      return [];
    }
    return rawDraftPicks.map((pick) => ({
      ...pick,
      profiles: profileMap[pick.player_id] || null,
      teams: teamMap[pick.team_id] || null,
    }));
  }, [rawDraftPicks, profileMap, teamMap]);

  const teamsData = useMemo(() => {
    if (!hydratedDraftPicks || hydratedDraftPicks.length === 0) {
      return [];
    }
    const uniqueTeamsMap = new Map();
    hydratedDraftPicks.forEach((pick) => {
      if (pick.teams && pick.teams.id) {
        uniqueTeamsMap.set(pick.teams.id, pick.teams);
      }
    });
    return Array.from(uniqueTeamsMap.values());
  }, [hydratedDraftPicks]);

  const hasDraftOccurred = hydratedDraftPicks.length > 0;

  const draftPicksByRound = useMemo(() => {
    const result = hydratedDraftPicks.reduce((acc, pick) => {
      const round = pick.round_number;
      if (round === undefined || round === null) {
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
    return result;
  }, [hydratedDraftPicks]);

  const draftPicksByTeam = useMemo(
    () =>
      hydratedDraftPicks.reduce((acc, pick) => {
        const teamId = pick.teams?.id;
        if (!teamId) {
          return acc;
        }
        if (!acc[teamId]) {
          acc[teamId] = {
            id: teamId,
            name: pick.teams?.name || 'Unknown Team',
            color: pick.teams?.color || '#9E9E9E',
            picks: [],
          };
        }
        acc[teamId].picks.push(pick);
        return acc;
      }, {}),
    [hydratedDraftPicks]
  );

  const teamStandings = useMemo(() => {
    if (!playerStats.length || !gameKpis.length || !hydratedDraftPicks.length) {
      return [];
    }

    const playerTeamMap = new Map();
    hydratedDraftPicks.forEach((pick) => {
      if (pick.player_id && pick.profiles && pick.teams) {
        playerTeamMap.set(pick.player_id, {
          player: pick.profiles,
          team: pick.teams,
        });
      }
    });

    const teamAggregatedStats = new Map();
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

    playerStats.forEach((stat) => {
      const playerId = stat.player_id;
      const kpiId = stat.kpi_id;
      const kpiValue = stat.value;
      const playerTeamInfo = playerTeamMap.get(playerId);

      if (playerTeamInfo && playerTeamInfo.team) {
        const teamId = playerTeamInfo.team.id;
        if (!teamAggregatedStats.has(teamId)) {
          // Fallback if a player's team wasn't in initial teamsData, but it should be handled by `teamsData` deriving from `hydratedDraftPicks`
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
        }
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

    return sortedStandings;
  }, [playerStats, gameKpis, hydratedDraftPicks, teamsData, teamOrderBy, teamOrder]);

  const { leaderboardData, overallTopScorer, kpiGameLeaders } = useMemo(() => {
    if (
      isLoadingPlayerStats ||
      isLoadingGameKpis ||
      isLoadingDraftPicks ||
      isLoadingAllProfiles ||
      isLoadingAllTeams
    ) {
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
      }
    });

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
      }
    });

    const allPlayersCalculatedStats = Array.from(aggregatedPlayerStats.values());
    const topScorer =
      [...allPlayersCalculatedStats].sort((a, b) => b.totalScore - a.totalScore)[0] || null;

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
    leaderboardOrderBy,
    leaderboardOrder,
  ]);

  const kpiDetailsMap = useMemo(() => {
    const map = new Map();
    gameKpis.forEach((kpi) => map.set(kpi.name, kpi));
    return map;
  }, [gameKpis]);

  const kpiColumnNames = useMemo(() => gameKpis.map((kpi) => kpi.name), [gameKpis]);

  // --- Handlers ---
  const handleChangeTab = useCallback((event, newValue) => {
    setCurrentTab(newValue);
    if (newValue !== TABS[2].value) {
      // Player Details tab
      setSelectedPlayerId(null);
    }
    if (newValue !== TABS[1].value) {
      // Team Details tab
      setSelectedTeamId(null);
    }
  }, []);

  const handlePlayerSelect = useCallback((playerId) => {
    setSelectedPlayerId(playerId);
    setCurrentTab(TABS[2].value); // Switch to Player Details tab
  }, []);

  const handleTeamSelect = useCallback((teamId) => {
    setSelectedTeamId(teamId);
    setCurrentTab(TABS[1].value); // Switch to Team Details tab
  }, []);

  const handleTeamRequestSort = useCallback(
    (property) => {
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

  // Debugging logs (can be removed in production)
  useEffect(() => {
    // console.log('***DEBUG*** GameId:', gameId);
    // console.log('***DEBUG*** Fetched Game Details:', game);
    // console.log('***DEBUG*** Hydrated Draft Picks:', hydratedDraftPicks);
    // console.log('***DEBUG*** Fetched Game KPIs:', gameKpis);
    // console.log('***DEBUG*** Fetched Player Stats:', playerStats);
    // console.log('***DEBUG*** Derived Teams Data:', teamsData);
    // console.log('***DEBUG*** Team Standings:', teamStandings);
    // console.log('***DEBUG*** Leaderboard Data:', leaderboardData);
  }, [
    gameId,
    game,
    hydratedDraftPicks,
    gameKpis,
    playerStats,
    teamsData,
    teamStandings,
    leaderboardData,
  ]);

  // Pass all data and handlers to the children via render prop
  return children({
    game,
    isLoading: overallLoading,
    isError: !!overallError,
    error: overallError,
    hasDraftOccurred,
    currentTab,
    handleChangeTab,
    selectedPlayerId,
    selectedTeamId,
    handlePlayerSelect,
    handleTeamSelect,
    teamStandings,
    kpiColumnNames,
    kpiDetailsMap,
    teamOrderBy,
    teamOrder,
    handleTeamRequestSort,
    leaderboardData,
    overallTopScorer,
    kpiGameLeaders,
    leaderboardOrderBy,
    leaderboardOrder,
    handleLeaderboardRequestSort,
    draftPicksByRound,
    draftPicksByTeam,
    hydratedDraftPicks,
    gameKpis,
    playerStats,
    teamsData,
  });
}
