// src/utils/calculateGameAchievements.js

export function calculateGameAchievements({
  gameId,
  allProfiles,
  teamsData,
  playerStatsData,
  draftPicksData, // Still useful for initial player-team mapping or if a player has 0 stats
  gameKpis,
  // NEW: Pass achievement definitions and merit amounts
  achievementDefinitions = [], // Expect an array of { id, name, merit_reward }
}) {
  // Add more detailed logging for missing data
  if (!gameId) console.error('calculateGameAchievements: gameId is missing.');
  if (!allProfiles) console.error('calculateGameAchievements: allProfiles is missing.');
  if (!teamsData) console.error('calculateGameAchievements: teamsData is missing.');
  if (!playerStatsData) console.error('calculateGameAchievements: playerStatsData is missing.');
  if (!draftPicksData) console.error('calculateGameAchievements: draftPicksData is missing.');
  if (!gameKpis) console.error('calculateGameAchievements: gameKpis is missing.');

  if (!gameId || !allProfiles || !teamsData || !playerStatsData || !draftPicksData || !gameKpis) {
    console.error(
      'Missing critical input data for calculateGameAchievements. Cannot proceed with calculations.'
    );
    // IMPORTANT CHANGE: Return the full, expected structure with empty/default values
    return {
      gameAchievementsPayload: null, // Or an empty object if you prefer: {},
      meritTransactions: [],
      meritsEarnedByPlayer: new Map(),
    };
  }

  // Add initial console logs to see the actual data that *is* received if it passes the above check
  console.log('--- Inside calculateGameAchievements (inputs received) ---');
  console.log('gameId:', gameId);
  console.log('allProfiles (length):', allProfiles.length);
  console.log('teamsData (length):', teamsData.length);
  console.log('playerStatsData (length):', playerStatsData.length);
  console.log('draftPicksData (length):', draftPicksData.length);
  console.log('gameKpis (length):', gameKpis.length);
  console.log('achievementDefinitions (length):', achievementDefinitions.length);
  console.log('------------------------------------');

  // Helper map for quick lookup of achievement definition IDs
  const achievementDefMap = new Map();
  achievementDefinitions.forEach((def) => achievementDefMap.set(def.name, def));

  const getAchievementDef = (name) => {
    const def = achievementDefMap.get(name);
    if (!def) {
      console.warn(`Achievement definition for "${name}" not found. Merits might be 0.`);
    }
    return def;
  };

  const profileMap = new Map();
  allProfiles.forEach((p) => profileMap.set(p.id, p));

  const teamMap = new Map();
  teamsData.forEach((t) => teamMap.set(t.id, t));

  const kpiMap = new Map();
  gameKpis.forEach((kpi) => kpiMap.set(kpi.id, kpi));

  const playerTeamMap = new Map();
  playerStatsData.forEach((stat) => {
    if (stat.player_id && stat.team_id) {
      playerTeamMap.set(stat.player_id, stat.team_id);
    }
  });
  draftPicksData.forEach((pick) => {
    if (pick.profiles?.id && pick.teams?.id && !playerTeamMap.has(pick.profiles.id)) {
      playerTeamMap.set(pick.profiles.id, pick.teams.id);
    }
  });

  const teamPlayersMap = new Map(); // Map: teamId -> [playerIds]
  playerTeamMap.forEach((teamId, playerId) => {
    if (!teamPlayersMap.has(teamId)) {
      teamPlayersMap.set(teamId, []);
    }
    teamPlayersMap.get(teamId).push(playerId);
  });
  teamsData.forEach((team) => {
    if (!teamPlayersMap.has(team.id)) {
      teamPlayersMap.set(team.id, []);
    }
  });

  const aggregatedPlayerStats = new Map(); // Map: playerId -> { profile_id, team_id, total_score, kpis: {} }
  playerStatsData.forEach((stat) => {
    const pId = stat.player_id;
    const teamId = stat.team_id;
    const kpi = kpiMap.get(stat.kpi_id);

    if (kpi && teamId) {
      if (!aggregatedPlayerStats.has(pId)) {
        aggregatedPlayerStats.set(pId, {
          profile_id: pId,
          team_id: teamId,
          total_score: 0,
          kpis: {},
        });
      }
      const currentStats = aggregatedPlayerStats.get(pId);
      currentStats.total_score += stat.value * (kpi.points || 0);
      currentStats.kpis[kpi.id] = (currentStats.kpis[kpi.id] || 0) + stat.value;
    } else {
      console.warn(`Skipping stat due to missing KPI or team_id:`, stat);
    }
  });

  const allPlayersCalculatedStats = Array.from(aggregatedPlayerStats.values());

  // Initialize data structures for merit processing
  const meritTransactions = []; // Array for public.merit_transactions inserts
  const meritsEarnedByPlayer = new Map(); // Map: playerId -> totalMeritsInThisGame

  const addMeritTransaction = (
    playerId,
    amount,
    type,
    description,
    achievementDefinitionId = null,
    kpiId = null
  ) => {
    if (amount <= 0) return; // Only add positive merit transactions
    meritTransactions.push({
      player_id: playerId,
      amount: amount,
      transaction_type: type,
      source_achievement_definition_id: achievementDefinitionId,
      source_game_id: gameId,
      kpi_id: kpiId,
      description: description,
    });
    meritsEarnedByPlayer.set(playerId, (meritsEarnedByPlayer.get(playerId) || 0) + amount);
  };

  // 1. Overall MVP (This logic remains the same, it's just the first element of the sorted list)
  const sortedPlayersByScore = [...allPlayersCalculatedStats].sort(
    (a, b) => b.total_score - a.total_score
  );

  const overallMvpPlayer = sortedPlayersByScore[0];
  const overallMvpPlayerId = overallMvpPlayer?.profile_id || null;
  if (overallMvpPlayerId) {
    const achievementDef = getAchievementDef('Overall Game MVP');
    addMeritTransaction(
      overallMvpPlayerId,
      achievementDef?.merit_reward || 500, // Placeholder if def not found
      'achievement_reward',
      `Overall MVP for game ${gameId}`,
      achievementDef?.id
    );
  }

  // Calculate Podium Finishers (Top 3)
  const podiumFinishers = sortedPlayersByScore.slice(0, 3).map((player, index) => ({
    player_id: player.profile_id,
    player_display_name: profileMap.get(player.profile_id)?.display_name || 'Unknown Player', // Add display name for easier consumption
    rank: index + 1,
    score: player.total_score,
  }));
  console.log('DEBUG: Podium Finishers Calculated:', podiumFinishers);

  // --- NEW: Add Merits for Podium #2 and Podium #3 ---
  const secondPlacePlayer = podiumFinishers.find((p) => p.rank === 2);
  if (secondPlacePlayer) {
    const achievementDef = getAchievementDef('Podium Finisher (2nd Place)');
    addMeritTransaction(
      secondPlacePlayer.player_id,
      achievementDef?.merit_reward || 200, // Placeholder
      'achievement_reward',
      `Finished 2nd place on the podium for game ${gameId}`,
      achievementDef?.id
    );
  }

  const thirdPlacePlayer = podiumFinishers.find((p) => p.rank === 3);
  if (thirdPlacePlayer) {
    const achievementDef = getAchievementDef('Podium Finisher (3rd Place)');
    addMeritTransaction(
      thirdPlacePlayer.player_id,
      achievementDef?.merit_reward || 150, // Placeholder
      'achievement_reward',
      `Finished 3rd place on the podium for game ${gameId}`,
      achievementDef?.id
    );
  }
  // --- END NEW PODIUM MERITS ---

  // 2. KPI Winners
  const kpiWinners = [];
  gameKpis.forEach((kpi) => {
    let topPlayerForKpi = null;
    let maxValue = -Infinity;

    allPlayersCalculatedStats.forEach((player) => {
      const kpiValue = player.kpis[kpi.id] || 0;
      if (kpiValue > maxValue) {
        maxValue = kpiValue;
        topPlayerForKpi = player.profile_id;
      }
    });

    if (topPlayerForKpi && maxValue > 0) {
      kpiWinners.push({
        value: maxValue,
        kpi_id: kpi.id,
        player_id: topPlayerForKpi,
      });

      const achievementDef = getAchievementDef('KPI Achiever'); // Or more specific like 'KPI Achiever: [KPIName]'
      addMeritTransaction(
        topPlayerForKpi,
        achievementDef?.merit_reward || 250, // Placeholder
        'kpi_bonus',
        `Top performer for KPI: ${kpi.name} with value ${maxValue} in game ${gameId}`,
        achievementDef?.id,
        kpi.id
      );
    }
  });

  // 3. Calculate teamScores and Winning Team
  const teamScores = {}; // Map: teamId -> totalScore
  teamsData.forEach((team) => {
    let teamTotalScore = 0;
    allPlayersCalculatedStats.forEach((playerStats) => {
      if (playerStats.team_id === team.id) {
        teamTotalScore += playerStats.total_score;
      }
    });
    teamScores[team.id] = teamTotalScore;
  });

  let winningTeamId = null;
  let maxTeamScore = -Infinity;
  Object.entries(teamScores).forEach(([teamId, score]) => {
    if (score > maxTeamScore) {
      maxTeamScore = score;
      winningTeamId = teamId;
    }
  });

  // 4. Winning Team Merits (NEWLY ADDED)
  if (winningTeamId) {
    const winningTeamPlayers = teamPlayersMap.get(winningTeamId) || [];
    const achievementDef = getAchievementDef('Winning Team Member');
    winningTeamPlayers.forEach((playerId) => {
      addMeritTransaction(
        playerId,
        achievementDef?.merit_reward || 100, // Placeholder
        'team_win_reward',
        `Member of winning team for game ${gameId}`,
        achievementDef?.id
      );
    });
  }

  // 5. Team Leader MVPs
  const teamLeaderMvps = [];
  teamsData.forEach((team) => {
    let teamMvp = null;
    let maxPlayerScoreOnTeam = -Infinity;
    const playersOnThisTeam = allPlayersCalculatedStats.filter(
      (player) => player.team_id === team.id
    );

    playersOnThisTeam.forEach((playerStats) => {
      if (playerStats.total_score > maxPlayerScoreOnTeam) {
        maxPlayerScoreOnTeam = playerStats.total_score;
        teamMvp = playerStats.profile_id;
      }
    });

    if (teamMvp) {
      teamLeaderMvps.push({
        team_id: team.id,
        leader_profile_id: teamMvp,
        score: maxPlayerScoreOnTeam,
      });

      const achievementDef = getAchievementDef('Team Leader MVP');
      addMeritTransaction(
        teamMvp,
        achievementDef?.merit_reward || 300, // Placeholder
        'team_mvp_reward',
        `Team Leader MVP for team ${teamMap.get(team.id)?.name || 'Unknown Team'} in game ${gameId}`,
        achievementDef?.id
      );
    }
  });

  // Performance Data (remains the same)
  const performanceData = [];
  const playerDraftPickMap = new Map();
  draftPicksData.forEach((pick) => {
    if (pick.profiles?.id) {
      playerDraftPickMap.set(pick.profiles.id, pick.pick_number);
    }
  });

  sortedPlayersByScore.forEach((player, index) => {
    // Use sortedPlayersByScore here
    const draftRank = playerDraftPickMap.get(player.profile_id) || null;
    // Only add to performanceData if draftRank is available.
    // This assumes performanceData is specifically for draft rank comparison.
    if (draftRank !== null) {
      performanceData.push({
        profile_id: player.profile_id,
        draft_rank: draftRank,
        performance_rank: index + 1, // Performance rank based on score
        total_score: player.total_score,
        team_id: player.team_id,
      });
    }
  });

  return {
    gameAchievementsPayload: {
      // This is the payload for public.game_achievements
      game_id: gameId,
      overall_mvp_player_id: overallMvpPlayerId,
      winning_team_id: winningTeamId,
      kpi_winners: kpiWinners,
      team_leader_mvps: teamLeaderMvps,
      performance_data: performanceData,
      team_scores: teamScores,
      podium_finishers: podiumFinishers,
    },
    meritTransactions, // Array of transactions to insert into public.merit_transactions
    meritsEarnedByPlayer, // Map for updating public.profiles.merit_balance
  };
}
