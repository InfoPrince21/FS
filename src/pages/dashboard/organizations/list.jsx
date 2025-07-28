// src/pages/dashboard/organizations/list.jsx
import { CONFIG } from 'src/global-config';

// Import your OrganizationListView component
import { OrganizationListView } from 'src/sections/organizations/view/organization-list-view'; // Adjust path if necessary

const metadata = { title: `Organizations List | Dashboard - ${CONFIG.appName}` };

export default function OrganizationsListPage() {
  return (
    <>
      <title>{metadata.title}</title>
      <OrganizationListView />
    </>
  );
}
