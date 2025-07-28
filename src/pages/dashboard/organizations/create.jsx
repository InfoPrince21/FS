// src/pages/dashboard/organizations/index.jsx
import { CONFIG } from 'src/global-config';

import { OrganizationCreateView } from 'src/sections/organizations/view/organization-create-view';

const metadata = { title: `Create Organization | Dashboard - ${CONFIG.appName}` };

export default function CreateOrganizationPage() {
  return (
    <>
      <title>{metadata.title}</title>
      <OrganizationCreateView />
    </>
  );
}
