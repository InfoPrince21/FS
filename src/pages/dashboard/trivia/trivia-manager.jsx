// src/pages/dashboard/trivia-manager.jsx

import { CONFIG } from 'src/global-config'; // Assuming CONFIG is where your appName is defined

import { TriviaQuestionManager } from 'src/sections/trivia/trivia-question-manager'; // Adjust path if you moved it to 'src/sections/trivia/manager' etc.

// ----------------------------------------------------------------------

// Define the metadata object for the page title
const metadata = { title: `Trivia Questions | Manager - ${CONFIG.appName}` };

export default function TriviaManagerPage() {
  return (
    <>
      {/* Using the <title> tag directly as per your other pages */}
      <title>{metadata.title}</title>

        {/* Your manager layout component */}
        <TriviaQuestionManager />
    </>
  );
}
