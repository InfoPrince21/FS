import React from 'react';
import PropTypes from 'prop-types';

// Material-UI components
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import { LineChart } from '@mui/x-charts/LineChart';
import { axisClasses } from '@mui/x-charts/ChartsAxis';

// ----------------------------------------------------------------------

export function UserStatsLineChart({ title, subheader, data, ...other }) {
  const theme = useTheme();

  // Ensure data is sorted by gameDate for accurate line chart progression
  const sortedData = [...data].sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate));

  // Extract dates for x-axis and scores for y-axis
  const xData = sortedData.map((item) => new Date(item.gameDate)); // Dates for X-axis
  const yData = sortedData.map((item) => item.totalScore); // Scores for Y-axis

  // Configure chart series
  const series = [
    {
      data: yData,
      label: 'Total Score',
      showMark: true, // Show points on the line
    },
  ];

  // Configure x-axis for dates
  const xAxis = [
    {
      data: xData,
      scaleType: 'time', // Use time scale for dates
      valueFormatter: (date) => (date ? date.toLocaleDateString() : ''), // Format date for display
      label: 'Game Date',
    },
  ];

  return (
    <Card {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Box sx={{ p: 3, pb: 1, display: 'flex', justifyContent: 'center', height: 350 }}>
        {data.length > 0 ? (
          <LineChart
            series={series}
            xAxis={xAxis}
            width={600} // Adjust width as needed
            height={300} // Adjust height as needed
            sx={{
              [`.${axisClasses.left} .${axisClasses.label}`]: {
                transform: 'translateX(-10px)',
              },
            }}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              width: '100%',
            }}
          >
            <Typography variant="subtitle1" color="text.secondary">
              No performance data available
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
}

UserStatsLineChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      gameDate: PropTypes.string.isRequired, // Assuming date comes as a string
      totalScore: PropTypes.number.isRequired,
      gameId: PropTypes.string, // Optional, depending on your data use
      gameName: PropTypes.string, // Optional
    })
  ).isRequired,
  subheader: PropTypes.string,
  title: PropTypes.string,
};
