// src/pages/dashboard/stats/KpiListPage.jsx
import { CONFIG } from 'src/global-config';

// Import the view component that handles all KPI management logic
import { ManageKpisView } from 'src/sections/stats/view/manage-kpis-view';

// ----------------------------------------------------------------------

const metadata = { title: `Manage KPIs | Dashboard - ${CONFIG.appName}` };

export default function KpiListPage() {
  return (
    <>
      <title>{metadata.title}</title>
      <ManageKpisView /> {/* Render the main view component */}
    </>
  );
}
