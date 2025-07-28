// src/pages/dashboard/teams/new.jsx

import { CONFIG } from 'src/global-config';

// Import the create view component
import { TeamCreateView } from 'src/sections/teams/view';

// ----------------------------------------------------------------------

const metadata = { title: `Team Create | Dashboard - ${CONFIG.appName}` };

export default function TeamCreatePage() {
  return (
    <>
      <title>{metadata.title}</title> {/* Using the <title> tag directly */}
      <TeamCreateView />
    </>
  );
}
