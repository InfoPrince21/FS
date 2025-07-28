import { useParams } from 'react-router';

import { CONFIG } from 'src/global-config'; 

import { EditStatsView } from 'src/sections/stats/view/edit-stats-view'; // Your view component for editing

const metadata = { title: `Edit Stat Entry | Dashboard - ${CONFIG.appName}` };

export default function EditStatsPage() {
  // Get the 'id' parameter from the URL. This 'id' will be the unique ID of the player_stats entry
  // that needs to be edited.
  const { id } = useParams();

  return (
    <>
      {/* This sets the browser tab title using a <title> tag directly */}
      {/* Note: This method only works if a parent component or the HTML structure
          allows a direct <title> tag within the component's render.
          For single-page applications, 'react-helmet-async' or a similar library
          is generally recommended for reliable title management. */}
      <title>{metadata.title}</title>

      {/* Renders the actual content of your edit stat form */}
      {/* Pass the 'id' to the view component so it knows which stat to load and edit */}
      <EditStatsView statId={id} />
    </>
  );
}
