// src/features/stats/pages/EnterStatsPage.jsx
import { useParams } from 'src/routes/hooks/use-params'; // Correctly import your custom useParams hook

import { CONFIG } from 'src/global-config';

import { EnterStatsForm } from 'src/sections/stats/view/enter-stats-form'; // Your main form component

// ----------------------------------------------------------------------

const metadata = { title: `Enter/Edit Game Stats | Dashboard - ${CONFIG.appName}` };

export default function EnterStatsPage() {
  // Get the 'gameId' parameter from the URL using your custom hook.
  // It will be present if navigating to /dashboard/stats/enter/:gameId
  const { gameId } = useParams();

  return (
    <>
      <title>{metadata.title}</title> {/* Still using <title> for the browser tab */}
      {/* Pass the gameId to the form component.
          The form will decide whether to fetch existing stats based on its presence. */}
      <EnterStatsForm gameId={gameId} />
    </>
  );
}
