// src/pages/dashboard/stats/game-stats-page.jsx

import { useParams } from 'react-router'; // We'll need this to get the 'id' from the URL

import { CONFIG } from 'src/global-config';

// Import your GameDetailsStatsView from its 'sections/stats/view' location
import { GameDetailsStatsView } from 'src/sections/stats/view/game-details-view';

// ----------------------------------------------------------------------

// Dynamic metadata title based on the game ID
const getMetadataTitle = (gameId) =>
  `Game Stats ${gameId ? `| ${gameId} ` : ''}| Dashboard - ${CONFIG.appName}`;

export default function GameStatsPage() {
  const { id } = useParams(); // Get the 'id' parameter from the URL

  return (
    <>
      {/* This sets the browser tab title, including the game ID */}
      <title>{getMetadataTitle(id)}</title>

      {/* Renders the actual content of your game details view, passing the ID */}
      <GameDetailsStatsView gameId={id} />
    </>
  );
}
