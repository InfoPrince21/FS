import { CONFIG } from 'src/global-config';

import { DraftListView } from 'src/sections/drafts/view'; // Using the barrel export

// ----------------------------------------------------------------------

const metadata = { title: `Draft List | Dashboard - ${CONFIG.appName}` };

export default function DraftListPage() {
  return (
    <>
      <title>{metadata.title}</title>
      <DraftListView />
    </>
  );
}
