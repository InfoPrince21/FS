import React from 'react';
import PropTypes from 'prop-types';

// Material-UI components (all grouped together, sorted alphabetically by path, no empty line within this group)
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import { PieChart } from '@mui/x-charts/PieChart'; // This should immediately follow the last @mui/material import

// ----------------------------------------------------------------------

export function UserStatsKpiPieChart({ title, subheader, data, ...other }) {
  const theme = useTheme();

  const chartData = data.map((item, index) => ({
    id: item.id || `kpi-${index}`,
    value: item.value,
    label: item.label,
  }));

  const chartSeries = [
    {
      data: chartData,
      highlightScope: { faded: 'global', highlighted: 'item' },
      faded: { innerRadius: 30, additionalRadius: -30, color: 'rgba(255, 255, 255, 0.5)' },
    },
  ];

  return (
    <Card {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Box sx={{ p: 3, pb: 1, display: 'flex', justifyContent: 'center', height: 300 }}>
        {data.length > 0 ? (
          <PieChart
            series={chartSeries}
            width={400}
            height={200}
            slotProps={{
              legend: {
                direction: 'column',
                position: { vertical: 'middle', horizontal: 'right' },
                padding: { left: 50 },
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
              No KPI data available
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
}

UserStatsKpiPieChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })
  ).isRequired,
  subheader: PropTypes.string,
  title: PropTypes.string,
};
