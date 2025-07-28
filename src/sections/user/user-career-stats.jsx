import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// Import the chart components you just created
import { UserStatsLineChart } from './user-stats-line-chart';
import { UserStatsKpiPieChart } from './user-stats-kpi-pie-chart';

// ----------------------------------------------------------------------

export function UserCareerStats({ careerStats }) {
  // Ensure careerStats and its properties are available
  const { kpiDistribution, scoreProgression, totalGames, averageScore } = careerStats || {};

  return (
    <Box sx={{ p: 3 }}>
      {/* Overview/Summary Statistics (Optional, can expand later) */}
      <Typography variant="h6" sx={{ mb: 3 }}>
        Career Overview
      </Typography>

      <Grid container spacing={3}>
        {/* KPI Distribution Pie Chart */}
        <Grid item xs={12} md={6}>
          <UserStatsKpiPieChart
            title="KPI Contribution"
            subheader="Distribution of scores across different KPIs"
            data={kpiDistribution || []} // Pass kpiDistribution data
          />
        </Grid>

        {/* Score Progression Line Chart */}
        <Grid item xs={12} md={6}>
          <UserStatsLineChart
            title="Total Score Progression"
            subheader="Overall performance trend over time"
            data={scoreProgression || []} // Pass scoreProgression data
          />
        </Grid>

        {/* You can add more career-specific stats here */}
        <Grid item xs={12}>
          <Box sx={{ mt: 3, p: 2, border: '1px dashed grey', borderRadius: 1 }}>
            <Typography variant="body1">
              Total Games Played: {totalGames !== undefined ? totalGames : 'N/A'}
            </Typography>
            <Typography variant="body1">
              Average Score: {averageScore !== undefined ? averageScore.toFixed(2) : 'N/A'}
            </Typography>
            {/* Add more career stats here */}
          </Box>
        </Grid>
      </Grid>
      {/* Add more career stats or sections here */}
    </Box>
  );
}

UserCareerStats.propTypes = {
  careerStats: PropTypes.shape({
    kpiDistribution: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string,
        value: PropTypes.number,
      })
    ),
    scoreProgression: PropTypes.arrayOf(
      PropTypes.shape({
        gameDate: PropTypes.string,
        totalScore: PropTypes.number,
      })
    ),
    totalGames: PropTypes.number,
    averageScore: PropTypes.number,
    // Add other expected careerStats properties here
  }),
};
