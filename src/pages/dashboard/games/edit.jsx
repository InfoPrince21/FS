// src/pages/dashboard/games/edit.jsx

import { CONFIG } from 'src/global-config';

// Make sure this path is correct for your GameEditView component
import { GameEditView } from 'src/sections/games/view';

// ----------------------------------------------------------------------

const metadata = { title: `Edit Game | Dashboard - ${CONFIG.appName}` };

export default function GamesEditPage() {
  return (
    <>
      <title>{metadata.title}</title>

      <GameEditView />
    </>
  );
}
