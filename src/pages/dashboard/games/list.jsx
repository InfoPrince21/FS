// src/pages/dashboard/games/list.jsx

import { CONFIG } from 'src/global-config';

// Make sure this path is correct for your GameListView component
import { GameListView } from 'src/sections/games/view';

// ----------------------------------------------------------------------

const metadata = { title: `Game List | Dashboard - ${CONFIG.appName}` };

export default function GamesListPage() {
  return (
    <>
      <title>{metadata.title}</title>

      <GameListView />
    </>
  );
}
