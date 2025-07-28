import { CONFIG } from 'src/global-config';

import { DraftEditView } from 'src/sections/drafts/view'; // Using the barrel export

// ----------------------------------------------------------------------

const metadata = { title: `Draft Edit | Dashboard - ${CONFIG.appName}` };

export default function DraftEditPage() {
  return (
    <>
      <title>{metadata.title}</title>
      <DraftEditView />
    </>
  );
}
