// src/sections/games/view/game-team-details-section.jsx
import React from 'react';

import { TeamDetails } from 'src/sections/games/view/team-details';

export function GameTeamDetailsSection({
  gameId,
  selectedTeamId,
  teamsData,
  gameKpis,
  playerStats,
  onPlayerClick,
  onTeamClick,
}) {
  return (
    <TeamDetails
      gameId={gameId}
      teamId={selectedTeamId} // Pass the selected team ID
      teamsData={teamsData}
      gameKpis={gameKpis}
      playerStats={playerStats}
      onPlayerClick={onPlayerClick}
      onTeamClick={onTeamClick}
    />
  );
}
