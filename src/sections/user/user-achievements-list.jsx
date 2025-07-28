// src/sections/user/user-achievements-list.jsx
import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import ListItemText from '@mui/material/ListItemText';

// ----------------------------------------------------------------------

export function UserAchievementsList({ achievements }) {
  if (!achievements || achievements.length === 0) {
    return (
      <Card>
        <CardHeader title="Achievements" />
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            No achievements found for this player yet. Keep playing!
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Achievements" />
      <CardContent>
        <Grid container spacing={3}>
          {achievements.map((achievement, index) => (
            <Grid item xs={12} sm={6} md={4} key={achievement.name}>
              <Card
                variant="outlined"
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                    {achievement.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {achievement.description}
                  </Typography>
                  <Stack spacing={0.5}>
                    <Typography variant="body2">
                      <Box component="span" sx={{ fontWeight: 'bold' }}>
                        Merits Earned:
                      </Box>{' '}
                      {achievement.totalMeritsEarned}
                    </Typography>
                    <Typography variant="body2">
                      <Box component="span" sx={{ fontWeight: 'bold' }}>
                        Times Earned:
                      </Box>{' '}
                      {achievement.timesEarned}
                    </Typography>
                    <Typography variant="body2">
                      <Box component="span" sx={{ fontWeight: 'bold' }}>
                        Games Achieved In:
                      </Box>{' '}
                      {achievement.uniqueGamesCount}
                    </Typography>
                    <Typography variant="body2">
                      <Box component="span" sx={{ fontWeight: 'bold' }}>
                        Last Earned:
                      </Box>{' '}
                      {achievement.lastEarnedDate}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

UserAchievementsList.propTypes = {
  achievements: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
      totalMeritsEarned: PropTypes.number.isRequired,
      timesEarned: PropTypes.number.isRequired,
      uniqueGamesCount: PropTypes.number,
      lastEarnedDate: PropTypes.string, // Expecting formatted date string
    })
  ),
};
