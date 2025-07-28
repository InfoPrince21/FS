import { CONFIG } from 'src/global-config';

import { DraftDetailsView } from 'src/sections/drafts/view'; // Using the barrel export

// ----------------------------------------------------------------------

const metadata = { title: `Draft Details | Dashboard - ${CONFIG.appName}` };

export default function DraftDetailsPage() {
  return (
    <>
      <title>{metadata.title}</title>
      <DraftDetailsView />
    </>
  );
}
