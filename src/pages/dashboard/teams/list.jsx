// src/pages/dashboard/teams/list.jsx

import { CONFIG } from 'src/global-config';

// Import the list view component
import { TeamListView } from 'src/sections/teams/view';

// ----------------------------------------------------------------------

const metadata = { title: `Team List | Dashboard - ${CONFIG.appName}` };

export default function TeamListPage() {
  return (
    <>
      <title>{metadata.title}</title> {/* Using the <title> tag directly */}
      <TeamListView />
    </>
  );
}
