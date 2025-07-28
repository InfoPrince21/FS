import { useParams } from 'react-router'; // To get the ID from the URL

import { CONFIG } from 'src/global-config'; // Assuming CONFIG is for app name

import { EditStatsView } from 'src/sections/stats/view/edit-stats-view'; // Your view component for editing

// ----------------------------------------------------------------------

// You might still define metadata for documentation/clarity,
// even if it's not directly used here to set the browser title.
// The actual browser title would be handled by a parent component or a global title manager.
const pageTitle = `Edit Stat Entry | Dashboard - ${CONFIG.appName}`; // For internal reference or parent component

export default function EditStatsPage() {
  // Get the 'id' parameter from the URL. This 'id' will be the unique ID of the player_stats entry
  // that needs to be edited.
  const { id } = useParams();

  // You'll likely pass this 'id' down to your EditStatsView component
  // so it can fetch the specific stat entry to pre-fill the form.

  return (
    <>
      {/*
        The browser tab title will NOT be set by this component.
        Ensure your main App component or a DashboardLayout component
        uses a global title setter (e.g., react-document-title or a custom context)
        if you need the browser tab title to reflect this page.
      */}

      {/* Renders the actual content of your edit stat form */}
      {/* Pass the 'id' to the view component so it knows which stat to load and edit */}
      <EditStatsView statId={id} />
    </>
  );
}
