// src/pages/dashboard/games/new.jsx

import { CONFIG } from 'src/global-config';

// Make sure this path is correct for your GameCreateView component
import { GameCreateView } from 'src/sections/games/view';

// ----------------------------------------------------------------------

const metadata = { title: `Create New Game | Dashboard - ${CONFIG.appName}` };

export default function GamesCreatePage() {
  return (
    <>
      <title>{metadata.title}</title>

      <GameCreateView />
    </>
  );
}
