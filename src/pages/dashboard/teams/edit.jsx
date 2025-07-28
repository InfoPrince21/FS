// src/pages/dashboard/teams/edit.jsx

import { CONFIG } from 'src/global-config';

// Import the edit view component
import { TeamEditView } from 'src/sections/teams/view';

// ----------------------------------------------------------------------

const metadata = { title: `Team Edit | Dashboard - ${CONFIG.appName}` };

export default function TeamEditPage() {
  return (
    <>
      <title>{metadata.title}</title> {/* Using the <title> tag directly */}
      <TeamEditView />
    </>
  );
}
