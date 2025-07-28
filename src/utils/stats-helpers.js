export const calculateGameTeamStandings = (playerStats, gameKpis, draftPicksInGame) => {
  if (!playerStats.length || !gameKpis.length || !draftPicksInGame.length) {
    return [];
  }

  const playerToTeamIdMap = new Map();
  const teamInfoMap = new Map();

  // Build maps for player-to-team and team-info for quick lookup
  draftPicksInGame.forEach((pick) => {
    if (pick.profiles?.id && pick.teams?.id) {
      playerToTeamIdMap.set(pick.profiles.id, pick.teams.id);
      if (!teamInfoMap.has(pick.teams.id)) {
        teamInfoMap.set(pick.teams.id, {
          id: pick.teams.id,
          name: pick.teams.name,
          color: pick.teams.color,
        });
      }
    }
  });

  const teamAggregatedStats = new Map();

  // Aggregate stats for each team
  playerStats.forEach((stat) => {
    const playerId = stat.player_id;
    const kpiId = stat.kpi_id;
    const kpiValue = stat.value;
    const teamId = playerToTeamIdMap.get(playerId);

    if (teamId) {
      if (!teamAggregatedStats.has(teamId)) {
        const teamInfo = teamInfoMap.get(teamId);
        teamAggregatedStats.set(teamId, {
          teamId,
          teamName: teamInfo?.name || 'Unknown Team',
          teamColor: teamInfo?.color || '#9E9E9E',
          totalScore: 0,
          kpis: {}, // Initialize KPIs object for the team
        });
      }

      const teamStats = teamAggregatedStats.get(teamId);
      const associatedKpi = gameKpis.find((gk) => gk.id === kpiId);

      if (associatedKpi) {
        const scoreToAdd = kpiValue * (associatedKpi.points || 0);
        teamStats.totalScore += scoreToAdd;
        teamStats.kpis[associatedKpi.name] = (teamStats.kpis[associatedKpi.name] || 0) + kpiValue; // Sum KPI values for the team
      }
    }
  });

  // Sort by totalScore descending for ranking
  const sortedStandings = Array.from(teamAggregatedStats.values()).sort(
    (a, b) => b.totalScore - a.totalScore
  );

  // Add rank
  let currentRank = 1;
  for (let i = 0; i < sortedStandings.length; i++) {
    if (i > 0 && sortedStandings[i].totalScore < sortedStandings[i - 1].totalScore) {
      currentRank = i + 1;
    }
    sortedStandings[i].rank = currentRank;
  }

  return sortedStandings;
};
