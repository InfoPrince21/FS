// src/pages/dashboard/user-profile-view-page.jsx
import { useParams } from 'react-router'; 

import { CONFIG } from 'src/global-config';

// We will create this component next
import { UserProfileView } from 'src/sections/user/user-profile-view';

// ----------------------------------------------------------------------

const metadata = { title: `User Profile | Dashboard - ${CONFIG.appName}` };

export default function UserProfileViewPage() {
  // Extract the userId from the URL parameters using useParams
  const { userId } = useParams(); // <--- YOU NEED THIS LINE!

  // console.log("UserProfileViewPage: Extracted userId from URL:", userId); // Good for debugging

  return (
    <>
      <title>{metadata.title}</title> {/* Using the <title> tag directly as per your style */}
      <UserProfileView userId={userId} /> {/* <--- PASS THE userId PROP HERE! */}
    </>
  );
}
