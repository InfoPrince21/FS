import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Pagination from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';

// Import the RTK Query hook
import { useGetOrganizationsQuery } from 'src/features/organizations/organizationsAPI';

// Assuming you'll create an OrganizationCard component similar to UserCard
import { OrganizationCard } from '../organization-card'; // You'll need to create this file

// ----------------------------------------------------------------------

export function OrganizationListView() {
  // Use the RTK Query hook to fetch organizations
  const {
    data: organizations, // Rename 'data' to 'organizations' for clarity
    isLoading, // True while fetching
    isFetching, // True if initial fetch or background refetch
    isError, // True if an error occurred
    error, // The error object from RTK Query
    refetch, // Function to manually refetch
  } = useGetOrganizationsQuery();

  // You might want pagination state here, similar to UserCardList
  const [page, setPage] = useState(1);
  const rowsPerPage = 12; // Example rows per page

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  // Determine which organizations to display based on pagination
  const paginatedOrganizations = organizations
    ? organizations.slice((page - 1) * rowsPerPage, page * rowsPerPage)
    : [];

  // --- Helper function to get a readable error message ---
  const getErrorMessage = (err) => {
    if (!err) {
      return 'An unknown error occurred.';
    }

    // --- Critical debugging step: Log the raw error object ---
    // Look at this in your browser's console when the error happens
    console.error('Raw RTK Query error object:', err);

    // 1. Prioritize 'message' property if it exists directly on the error object (e.g., standard Error)
    if (
      typeof err === 'object' &&
      err !== null &&
      'message' in err &&
      typeof err.message === 'string'
    ) {
      return err.message;
    }

    // 2. Handle RTK Query fetchBaseQuery errors (status, data)
    // Supabase errors often have `error.data.message`
    if (typeof err === 'object' && err !== null && 'status' in err && 'data' in err) {
      const { status, data } = err;
      if (typeof data === 'object' && data !== null) {
        if ('message' in data && typeof data.message === 'string') {
          return data.message; // Common for Supabase detailed error messages
        }
        // If 'data' is an object but no 'message', try to stringify 'data'
        try {
          return `Error ${status}: ${JSON.stringify(data)}`;
        } catch (e) {
          // Fallback if stringify fails (e.g., circular reference, non-JSON-serializable value)
          return `Error ${status}: [Unstringifiable data]`;
        }
      }
      // If 'data' is a primitive (string, number, boolean)
      return `Error ${status}: ${String(data)}`;
    }

    // 3. Last resort: Try to stringify the entire error object, or fall back to generic message
    try {
      // Attempt to JSON stringify the whole error object
      return JSON.stringify(err);
    } catch (e) {
      // If JSON.stringify fails, fall back to String()
      return String(err);
    }
  };

  // --- Conditional Rendering for Loading, Error, and Empty States ---

  if (isLoading || isFetching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading organizations...
        </Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ mt: 5, textAlign: 'center' }}>
        <Alert severity="error">
          <Typography variant="h6">Error loading organizations:</Typography>
          {/* Use the helper function here to ensure a string is always rendered */}
          <Typography variant="body2">{getErrorMessage(error)}</Typography>
          <Button onClick={refetch} sx={{ mt: 1 }}>
            Try Again
          </Button>
        </Alert>
      </Box>
    );
  }

  if (!organizations || organizations.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
          border: '1px dashed grey',
          p: 3,
          m: 3,
        }}
      >
        <Typography variant="h5" color="text.secondary">
          No organizations found.
        </Typography>
        <Button onClick={refetch} sx={{ mt: 2 }}>
          Refresh List
        </Button>
      </Box>
    );
  }

  // --- Displaying Organizations ---

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        All Organizations
      </Typography>

      <Grid
        container
        spacing={3}
        // Note: Using `display: 'grid'` on the container and `Grid item` simultaneously
        // can sometimes lead to unexpected layout behavior. If you need a strict CSS Grid,
        // you might remove the `Grid item` and just map directly to your `OrganizationCard`
        // within the CSS Grid context of the container. However, for a simple card layout,
        // this often works due to how `Grid item` sets its own width.
        sx={{
          display: 'grid', // Keeps your grid template columns
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)', // Adjust as needed for your card layout
          },
          gap: 3, // Apply gap here if using CSS Grid directly without MUI Grid items' spacing prop
        }}
      >
        {paginatedOrganizations.map((organization) => (
          // When using `display: 'grid'` on the container, `Grid item` might be redundant
          // or could conflict. If you keep it, ensure it's not overriding your desired grid columns.
          // For a simple case, `Grid item` still provides responsive breakpoints.
          <Grid item xs={12} sm={6} md={4} key={organization.id}>
            <OrganizationCard organization={organization} />
          </Grid>
        ))}
      </Grid>

      {/* Pagination control */}
      {organizations.length > rowsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={Math.ceil(organizations.length / rowsPerPage)}
            page={page}
            onChange={handleChangePage}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
}
