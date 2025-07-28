import { useMemo } from 'react';

import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Button,
  Stack,
  Avatar,
} from '@mui/material';

// IMPORTANT: Add these imports for Iconify and getDefaultIcon
import { Iconify } from 'src/components/iconify';
import { getDefaultIcon } from 'src/components/icon-picker/icon-picker';

export function TeamStandingsTable({
  teamStandings,
  kpiColumnNames,
  kpiDetailsMap, // This map is crucial for getting the icon URLs
  teamOrderBy,
  teamOrder,
  handleTeamRequestSort,
  onTeamClick,
}) {
  if (!teamStandings || teamStandings.length === 0) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No team standings data available yet.
      </Alert>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table aria-label="team standings table">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Rank</TableCell>
            <TableCell
              sx={{ fontWeight: 'bold' }}
              sortDirection={teamOrderBy === 'team_name' ? teamOrder : false}
            >
              <TableSortLabel
                active={teamOrderBy === 'team_name'}
                direction={teamOrderBy === 'team_name' ? teamOrder : 'asc'}
                onClick={() => handleTeamRequestSort('team_name')}
              >
                Team Name
              </TableSortLabel>
            </TableCell>
            <TableCell
              sx={{ fontWeight: 'bold' }}
              align="right"
              sortDirection={teamOrderBy === 'total_score' ? teamOrder : false}
            >
              <TableSortLabel
                active={teamOrderBy === 'total_score'}
                direction={teamOrderBy === 'total_score' ? teamOrder : 'desc'}
                onClick={() => handleTeamRequestSort('total_score')}
              >
                Total Score
              </TableSortLabel>
            </TableCell>
            {kpiColumnNames.map((kpiName) => {
              // Retrieve the KPI details from the map, which includes the 'icon' property
              const kpiDetail = kpiDetailsMap?.get(kpiName);
              // Prefer 'icon_name' if available, otherwise fallback to 'icon' or 'iconName'
              const kpiIconName = kpiDetail?.icon_name || kpiDetail?.icon || kpiDetail?.iconName;

              return (
                <TableCell
                  key={kpiName}
                  sx={{ fontWeight: 'bold' }}
                  align="right"
                  sortDirection={teamOrderBy === `kpi_${kpiName}` ? teamOrder : false}
                >
                  <TableSortLabel
                    active={teamOrderBy === `kpi_${kpiName}`}
                    direction={teamOrderBy === `kpi_${kpiName}` ? teamOrder : 'desc'}
                    onClick={() => handleTeamRequestSort(`kpi_${kpiName}`)}
                  >
                    {/* Render the icon and text using Stack */}
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      {/* Use Iconify with getDefaultIcon */}
                      {kpiIconName && (
                        <Iconify
                          icon={getDefaultIcon(kpiIconName)} // Pass the icon name to getDefaultIcon
                          width={18} // Match the desired size
                          height={18}
                          sx={{ mr: 0.5, color: 'text.secondary' }} // Add styling for consistency
                        />
                      )}
                      <span>{kpiName.replace(/_/g, ' ')}</span>
                    </Stack>
                  </TableSortLabel>
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {teamStandings.map((teamStanding, index) => (
            // Changed key from teamStanding.teamId to teamStanding.team.id
            <TableRow key={teamStanding.team.id}>
              <TableCell>{index + 1}</TableCell> {/* Rank */}
              <TableCell>
                <Button
                  onClick={() => {
                    // Changed teamStanding.teamId to teamStanding.team.id
                    if (onTeamClick && teamStanding.team.id) {
                      onTeamClick(teamStanding.team.id);
                    }
                  }}
                  sx={{
                    textTransform: 'none',
                    justifyContent: 'flex-start',
                    p: 0,
                    minWidth: 0,
                    color: 'text.primary',
                    fontWeight: 'bold',
                    '&:hover': {
                      bgcolor: 'transparent',
                      textDecoration: 'underline',
                    },
                  }}
                  // Changed teamStanding.teamId to teamStanding.team.id
                  disabled={!teamStanding.team.id || !onTeamClick}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar
                      sx={{
                        // Changed teamStanding.teamColor to teamStanding.team.color
                        bgcolor: teamStanding.team.color || '#9E9E9E',
                        width: 24,
                        height: 24,
                        fontSize: '0.8rem',
                      }}
                    >
                      {/* Changed teamStanding.teamName to teamStanding.team.name */}
                      {teamStanding.team.name.charAt(0)}
                    </Avatar>
                    <Typography variant="subtitle2" color="text.primary">
                      {/* Changed teamStanding.teamName to teamStanding.team.name */}
                      {teamStanding.team.name}
                    </Typography>
                  </Stack>
                </Button>
              </TableCell>
              <TableCell align="right">{teamStanding.totalScore}</TableCell>
              {kpiColumnNames.map((kpiName) => (
                <TableCell key={kpiName} align="right">
                  {teamStanding.kpis[kpiName] || 0}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
