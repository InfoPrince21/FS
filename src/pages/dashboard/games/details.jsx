// src/pages/dashboard/games/details.jsx

import { useParams } from 'src/routes/hooks'; // Importing your custom useParams hook

// Make sure this path is correct for your GameDetailsView component
import { GameDetailsView } from 'src/sections/games/view';

// ----------------------------------------------------------------------

// No metadata constant if you're not using Helmet for title management

export default function GamesDetailsPage() {
  const { id } = useParams(); // Get the game ID from the URL parameter using your hook

  return (
    <>
      {/* If you're not using Helmet, the page title will be managed elsewhere or not at all */}
      {/* <title>{metadata.title}</title> */}

      {/* Render the GameDetailsView and pass the gameId to it */}
      <GameDetailsView gameId={id} />
    </>
  );
}
