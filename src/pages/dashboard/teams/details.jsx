// src/pages/dashboard/teams/details.jsx

import { CONFIG } from 'src/global-config';

import { TeamDetailsView } from 'src/sections/teams/view';

// ----------------------------------------------------------------------

const metadata = { title: `Team Details | Dashboard - ${CONFIG.appName}` };

export default function TeamDetailsPage() {
  return (
    <>
      <title>{metadata.title}</title> {/* Using the <title> tag directly */}
      <TeamDetailsView />
    </>
  );
}
