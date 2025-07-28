import { CONFIG } from 'src/global-config';

import { DraftCreateView } from 'src/sections/drafts/view'; // Using the barrel export

// ----------------------------------------------------------------------

const metadata = { title: `Draft Create | Dashboard - ${CONFIG.appName}` };

export default function DraftCreatePage() {
  return (
    <>
      <title>{metadata.title}</title>
      <DraftCreateView />
    </>
  );
}
