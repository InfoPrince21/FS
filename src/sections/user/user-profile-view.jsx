// src/sections/user/user-profile-view.jsx
import PropTypes from 'prop-types'; // Re-adding PropTypes for type-checking
import React, { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

// CORRECTED: Import the hook that fetches a profile by ID
import { useUserProfileById } from 'src/auth/hooks/use-user-profile-by-id'; // Make sure this path is correct

// Import your career stats component
import { UserCareerStats } from './user-career-stats'; // Make sure this path is correct
// Import other tab components as needed
// import { UserCurrentGameStats } from './user-current-game-stats';
import { UserAchievementsList } from './user-achievements-list'; // UNCOMMENTED AND IMPORTED

// ----------------------------------------------------------------------

// Custom Tab Panel helper function
function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3, pb: 1 }}>{children}</Box>}
    </div>
  );
}

// Re-adding CustomTabPanel.propTypes for type-checking
CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}
// ----------------------------------------------------------------------

// Ensure that UserProfileView is correctly exported as a named export
export function UserProfileView({ userId }) {
  const [activeTab, setActiveTab] = useState(0);

  // CORRECTED: Consume useUserProfileById hook and pass the userId prop
  const { profile, loading, error } = useUserProfileById(userId); // This hook fetches the profile for the given userId

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle loading and error states from your hook
  if (loading) {
    return (
      <Container sx={{ mt: 5 }}>
        <Typography variant="h5">Loading profile...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 5 }}>
        <Typography variant="h5" color="error">
          Error: {error}
        </Typography>
      </Container>
    );
  }

  // Check if profile exists and has the necessary data
  // For useUserProfileById, if no profile found for the ID, it might still return null/error
  if (!profile || !profile.id) {
    return (
      <Container sx={{ mt: 5 }}>
        <Typography variant="h5">No profile data found for this user ID.</Typography>
      </Container>
    );
  }

  // Destructure directly from the 'profile' object, including achievementsList
  const user = profile;
  const { careerStats, achievementsList } = profile; // ADDED achievementsList here

  return (
    <Container maxWidth="xl" sx={{ mt: 5 }}>
      {/* User Header Section */}
      <Card sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center' }}>
        <Avatar
          src={user.photo_url || '/assets/images/avatars/avatar_default.jpg'}
          alt={user.display_name || `${user.first_name} ${user.last_name}`}
          sx={{ width: 80, height: 80, mr: 3 }}
        />
        <Box>
          <Typography variant="h4">
            {user.display_name || `${user.first_name} ${user.last_name}`}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {user.organization_name || 'N/A'}
          </Typography>
        </Box>
      </Card>

      {/* Tabs for Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="profile tabs">
          <Tab label="Current Game" {...a11yProps(0)} />
          <Tab label="Career" {...a11yProps(1)} />
          <Tab label="Achievements" {...a11yProps(2)} />
          {/* Add Player Comparison tab here later */}
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <CustomTabPanel value={activeTab} index={0}>
        <Typography variant="h6">Current Game Stats Content Goes Here</Typography>
        {/* Render UserCurrentGameStats component here, passing relevant data */}
      </CustomTabPanel>

      <CustomTabPanel value={activeTab} index={1}>
        {/* Render UserCareerStats component here, passing the derived careerStats */}
        {careerStats ? (
          <UserCareerStats careerStats={careerStats} />
        ) : (
          <Typography>No career stats available for this player.</Typography>
        )}
      </CustomTabPanel>

      <CustomTabPanel value={activeTab} index={2}>
        {/* Render UserAchievementsList component here, passing the achievementsList */}
        {achievementsList ? (
          <UserAchievementsList achievements={achievementsList} />
        ) : (
          <Typography>No achievements found for this player.</Typography>
        )}
      </CustomTabPanel>

      {/* Placeholder for Player Comparison */}
      <CustomTabPanel value={activeTab} index={3}>
        <Typography variant="h6">Player Comparison Tool Content Goes Here</Typography>
      </CustomTabPanel>
    </Container>
  );
}

// Re-adding UserProfileView.propTypes for type-checking
UserProfileView.propTypes = {
  userId: PropTypes.string.isRequired,
};
