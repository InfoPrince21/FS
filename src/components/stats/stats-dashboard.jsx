// src/components/stats/stats-dashboard.jsx

import React, { useState, useMemo, useEffect } from 'react';

import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarColumnsButton,
} from '@mui/x-data-grid';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  MenuItem,
  TextField,
  Button,
  Stack,
} from '@mui/material';

import {
  useGetDashboardStatsQuery,
  useGetProfilesQuery,
  useGetGamesQuery,
  useGetKpisQuery,
  useGetTeamsQuery,
} from 'src/features/stats/statsAPI'; // Ensure this path is correct

// Custom Toolbar for DataGrid
function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
    </GridToolbarContainer>
  );
}

export function StatsDashboard() {
  const [filters, setFilters] = useState({
    gameId: '',
    playerId: '',
    kpiId: '',
    teamId: '',
    startDate: '',
    endDate: '',
  });

  // State to hold the prepared rows for DataGrid
  const [gridRows, setGridRows] = useState([]);

  // Fetch data for filter dropdowns
  const {
    data: profiles,
    isLoading: isLoadingProfiles,
    isError: isErrorProfiles,
    error: profilesError,
  } = useGetProfilesQuery();
  const {
    data: games,
    isLoading: isLoadingGames,
    isError: isErrorGames,
    error: gamesError,
  } = useGetGamesQuery();
  const {
    data: kpis,
    isLoading: isLoadingKpis,
    isError: isErrorKpis,
    error: kpisError,
  } = useGetKpisQuery();
  const {
    data: teams,
    isLoading: isLoadingTeams,
    isError: isErrorTeams,
    error: teamsError,
  } = useGetTeamsQuery();

  const playerOptions = useMemo(
    () =>
      profiles?.map((p) => {
        let playerName = `Player ${p.id ? String(p.id).substring(0, 4) : 'N/A'}`; // Default fallback

        if (p.display_name) {
          playerName = p.display_name; // Prioritize display_name if available
        } else if (p.first_name && p.last_name) {
          playerName = `${p.first_name} ${p.last_name}`; // Fallback to full name
        } else if (p.first_name) {
          playerName = p.first_name; // Fallback to first name
        } else if (p.last_name) {
          playerName = p.last_name; // Fallback to last name
        }

        console.log(
          `DEBUG_PLAYER_OPTIONS: Player ID: ${p.id}, Display Name: "${p.display_name}", First: "${p.first_name}", Last: "${p.last_name}", Final Name: "${playerName}"`
        );

        return {
          id: String(p.id), // CRITICAL: Ensure ID is a string for MenuItem value and DataGrid valueOptions
          name: playerName,
        };
      }) || [],
    [profiles]
  );
  const gameOptions = useMemo(
    () => games?.map((g) => ({ id: String(g.id), name: g.name })) || [],
    [games]
  );
  const kpiOptions = useMemo(
    () => kpis?.map((k) => ({ id: String(k.id), name: k.name })) || [],
    [kpis]
  );
  const teamOptions = useMemo(
    () => teams?.map((t) => ({ id: String(t.id), name: t.name })) || [],
    [teams]
  );

  // Use the dashboard query
  const {
    data: rawDashboardStats,
    isLoading: isLoadingDashboardStats,
    isError: isErrorDashboardStats,
    error: dashboardStatsError,
    refetch,
  } = useGetDashboardStatsQuery(filters);

  console.log(
    'DEBUG_DASHBOARD_COMPONENT: rawDashboardStats directly from hook (before any processing):',
    rawDashboardStats
  );

  // Robust handling of rawDashboardStats and row 'id' with useEffect to update state
  useEffect(() => {
    let processedStats = [];
    if (Array.isArray(rawDashboardStats)) {
      const seenIds = new Set();
      processedStats = rawDashboardStats.filter((stat, index) => {
        // Step 1: Filter out any top-level null/undefined entries
        if (stat === null || stat === undefined) {
          console.warn(
            `DEBUG_DATA_PREP_EFFECT: Filtering out null/undefined top-level stat entry at index ${index}:`,
            stat
          );
          return false; // Exclude
        }
        // Step 2: Ensure the object itself is an object and has a valid, non-empty string ID
        // This is crucial for DataGrid.
        if (
          typeof stat !== 'object' ||
          stat.id === null ||
          stat.id === undefined ||
          typeof stat.id !== 'string' ||
          stat.id.length === 0
        ) {
          console.error(
            `DEBUG_DATA_PREP_EFFECT: Invalid stat row (not an object or missing/invalid ID) at index ${index}:`,
            stat
          );
          return false; // Exclude
        }
        // Step 3: Ensure unique IDs
        if (seenIds.has(stat.id)) {
          console.warn(
            `DEBUG_DATA_PREP_EFFECT: Duplicate ID found at index ${index}, filtering out:`,
            stat.id,
            stat
          );
          return false; // Exclude
        }
        seenIds.add(stat.id);

        // *** DEBUGGING: Check date_recorded and value here ***
        if (stat.date_recorded === undefined) {
          console.error(
            `DEBUG_DATA_PREP_EFFECT: 'date_recorded' is UNDEFINED for stat with ID ${stat.id}`,
            stat
          );
        } else if (stat.date_recorded === null) {
          console.warn(
            `DEBUG_DATA_PREP_EFFECT: 'date_recorded' is NULL for stat with ID ${stat.id}`,
            stat
          );
        } else {
          console.log(
            `DEBUG_DATA_PREP_EFFECT: 'date_recorded' is present and has value '${stat.date_recorded}' for stat with ID ${stat.id}`
          );
        }

        if (stat.value === undefined) {
          console.error(
            `DEBUG_DATA_PREP_EFFECT: 'value' is UNDEFINED for stat with ID ${stat.id}`,
            stat
          );
        } else if (stat.value === null) {
          console.warn(`DEBUG_DATA_PREP_EFFECT: 'value' is NULL for stat with ID ${stat.id}`, stat);
        } else {
          console.log(
            `DEBUG_DATA_PREP_EFFECT: 'value' is present and has value '${stat.value}' (type: ${typeof stat.value}) for stat with ID ${stat.id}`
          );
        }
        // *************************************************

        return true; // Include this stat
      });
      // Explicitly map properties to ensure they exist and are correctly typed for DataGrid
      processedStats = processedStats.map((stat) => ({
        id: String(stat.id), // DataGrid requires 'id' as a string
        date_recorded: stat.date_recorded, // Make sure this property is explicitly carried over
        game_name: stat.game_name,
        player_display_name: stat.player_display_name,
        kpi_name: stat.kpi_name,
        team_name: stat.team_name,
        value: stat.value, // Ensure value is directly mapped here
        player_first_name: stat.player_first_name,
        player_last_name: stat.player_last_name,
        kpi_description: stat.kpi_description,
        kpi_points: stat.kpi_points,
        kpi_icon_name: stat.kpi_icon_name,
      }));
    } else {
      // This warning is expected when the query is loading or has an error initially
      console.warn(
        'DEBUG_DATA_PREP_EFFECT: rawDashboardStats is not an array or is undefined/null (expected during loading/error):',
        rawDashboardStats
      );
    }
    console.log(
      'DEBUG_DATA_PREP_EFFECT: Final processed dashboardStats length:',
      processedStats.length
    );
    setGridRows(processedStats); // Update the state that DataGrid consumes
  }, [rawDashboardStats]); // Rerun this effect when raw data changes

  // Client-side logging of the final rows array being passed to DataGrid (will now reflect gridRows state)
  useEffect(() => {
    console.log('DEBUG_DATAGRID_PROPS: Rows array being passed to DataGrid:', gridRows);
  }, [gridRows]);

  const columns = useMemo(
    () => [
      {
        field: 'date_recorded', // This must EXACTLY match the property name in your row objects.
        headerName: 'Date',
        width: 150,
        // No valueFormatter here, as it's intended to be a raw string.
        // If you need specific date formatting, you'd add a formatter here
        // like: valueFormatter: (params) => new Date(params.value).toLocaleDateString()
      },
      {
        field: 'game_name', // Matches your schema exactly
        headerName: 'Game',
        width: 200,
      },
      {
        field: 'player_display_name', // Matches your schema exactly
        headerName: 'Player',
        width: 200,
      },
      {
        field: 'kpi_name', // Matches your schema exactly
        headerName: 'Stat Type',
        width: 150,
      },
      {
        field: 'team_name', // Matches your schema exactly
        headerName: 'Team',
        width: 150,
      },
      {
        field: 'value', // Matches your schema exactly
        headerName: 'Value',
        type: 'number', // Keep type as 'number' for sorting/filtering capabilities
        width: 100,
        // Removed valueFormatter completely. DataGrid should now attempt to render the raw value.
      },
      // You can add other columns from your schema here if you want them visible:
      // { field: 'player_first_name', headerName: 'First Name', width: 150 },
      // { field: 'player_last_name', headerName: 'Last Name', width: 150 },
      // { field: 'kpi_description', headerName: 'Description', width: 250 },
      // { field: 'kpi_points', headerName: 'Points', type: 'number', width: 80 },
    ],
    []
  );

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      gameId: '',
      playerId: '',
      kpiId: '',
      teamId: '',
      startDate: '',
      endDate: '',
    });
  };

  const isAnyLoading =
    isLoadingDashboardStats ||
    isLoadingProfiles ||
    isLoadingGames ||
    isLoadingKpis ||
    isLoadingTeams;
  const isAnyError =
    isErrorDashboardStats || isErrorProfiles || isErrorGames || isErrorKpis || isErrorTeams;

  if (isAnyLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading Player Stats Dashboard...
        </Typography>
      </Box>
    );
  }

  if (isAnyError) {
    console.error('DEBUGGING ERROR STATE (FRONTEND):');
    if (isErrorProfiles) console.error('   Profiles Error Object:', profilesError);
    if (isErrorGames) console.error('   Games Error Object:', gamesError);
    if (isErrorKpis) console.error('   KPIs Error Object:', kpisError);
    if (isErrorTeams) console.error('   Teams Error Object:', teamsError);
    if (isErrorDashboardStats) {
      console.error('   Dashboard Stats Error Object:', dashboardStatsError);
      console.error('   Dashboard Stats Error Message:', dashboardStatsError?.message);
      console.error('   Dashboard Stats Error Data:', dashboardStatsError?.data);
      console.error('   Dashboard Stats Error Status:', dashboardStatsError?.status);
    }

    return (
      <Box sx={{ mt: 4, p: 3 }}>
        <Alert severity="error">
          Error loading data for the Stats Dashboard.
          {dashboardStatsError?.message && ` Stats Error: ${dashboardStatsError.message}`}
          {isErrorProfiles && ` Profiles Error: ${profilesError?.message || 'Unknown'}`}
          {isErrorGames && ` Games Error: ${gamesError?.message || 'Unknown'}`}
          {isErrorKpis && ` KPIs Error: ${kpisError?.message || 'Unknown'}`}
          {isErrorTeams && ` Teams Error: ${teamsError?.message || 'Unknown'}`} <br />
          Please check your Supabase RLS policies and network connection.
        </Alert>
        <Button onClick={refetch} variant="outlined" sx={{ mt: 2 }}>
          Retry Loading Player Stats
        </Button>
      </Box>
    );
  }

  // Use the state variable for rows
  const rows = gridRows;

  return (
    <Box sx={{ p: 3 }}>
        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          {/* Player Filter */}
          <TextField
            select
            label="Player"
            name="playerId"
            value={filters.playerId}
            onChange={handleFilterChange}
            fullWidth
            size="small"
          >
            <MenuItem value="">All Players</MenuItem>
            {playerOptions.map((player) => (
              <MenuItem key={player.id} value={player.id}>
                {player.name}
              </MenuItem>
            ))}
          </TextField>

          {/* Game Filter */}
          <TextField
            select
            label="Game"
            name="gameId"
            value={filters.gameId}
            onChange={handleFilterChange}
            fullWidth
            size="small"
          >
            <MenuItem value="">All Games</MenuItem>
            {gameOptions.map((game) => (
              <MenuItem key={game.id} value={game.id}>
                {game.name}
              </MenuItem>
            ))}
          </TextField>

          {/* KPI Filter */}
          <TextField
            select
            label="Stat Type"
            name="kpiId"
            value={filters.kpiId}
            onChange={handleFilterChange}
            fullWidth
            size="small"
          >
            <MenuItem value="">All Stat Types</MenuItem>
            {kpiOptions.map((kpi) => (
              <MenuItem key={kpi.id} value={kpi.id}>
                {kpi.name}
              </MenuItem>
            ))}
          </TextField>

          {/* Team Filter */}
          <TextField
            select
            label="Team"
            name="teamId"
            value={filters.teamId}
            onChange={handleFilterChange}
            fullWidth
            size="small"
          >
            <MenuItem value="">All Teams</MenuItem>
            {teamOptions.map((team) => (
              <MenuItem key={team.id} value={team.id}>
                {team.name}
              </MenuItem>
            ))}
          </TextField>

          {/* Date Filters */}
          <TextField
            label="Start Date"
            name="startDate"
            type="date"
            value={filters.startDate}
            onChange={handleFilterChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
          />
          <TextField
            label="End Date"
            name="endDate"
            type="date"
            value={filters.endDate}
            onChange={handleFilterChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
          />
        </Stack>
        <Button variant="outlined" onClick={handleClearFilters}>
          Clear Filters
        </Button>
      </Paper>

      <Box sx={{ height: 600, width: '100%' }}>
        {rows.length > 0 ? (
          <DataGrid
            rows={rows}
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            slots={{
              toolbar: CustomToolbar,
            }}
          />
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No player stats found for the current filters.
          </Alert>
        )}
      </Box>
    </Box>
  );
}
