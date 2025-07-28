// src/pages/dashboard/stats/player-performance-page.jsx

import { CONFIG } from 'src/global-config'; // Assuming CONFIG is for app name

// Importantly, import your PlayerPerformanceView from its 'sections/stats/view' location
import { PlayerPerformanceView } from 'src/sections/stats/view/';

// ----------------------------------------------------------------------

const metadata = { title: `Player Performance | Dashboard - ${CONFIG.appName}` };

export default function PlayerPerformancePage() {
  return (
    <>
      {/* This sets the browser tab title */}
      <title>{metadata.title}</title>

      {/* Renders the actual content of your player performance view */}
      <PlayerPerformanceView />
    </>
  );
}
