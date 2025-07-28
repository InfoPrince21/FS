// src/components/organization/join-organization-form.jsx
import { useState, useEffect } from 'react';

import Autocomplete from '@mui/material/Autocomplete'; // Import Autocomplete
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Card,
} from '@mui/material';

import { supabase } from 'src/lib/supabase'; // Your Supabase client

export function JoinOrganizationForm({ onOrganizationJoined }) {
  const [organizations, setOrganizations] = useState([]); // State to store the list of organizations
  const [selectedOrganization, setSelectedOrganization] = useState(null); // State for the selected organization from Autocomplete
  const [currentOrganizationId, setCurrentOrganizationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');

      try {
        // Fetch current user's organization
        const { data: userData, error: userAuthError } = await supabase.auth.getUser();
        if (userAuthError || !userData?.user) {
          throw new Error('User not authenticated.');
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userData.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError.message);
          setError('Failed to fetch your current organization status.');
        } else if (profileData?.organization_id) {
          setCurrentOrganizationId(profileData.organization_id);
        }

        // Fetch all organizations
        const { data: orgsData, error: fetchOrgsError } = await supabase
          .from('organizations')
          .select('id, name')
          .order('name', { ascending: true }); // Order alphabetically

        if (fetchOrgsError) {
          console.error('Error fetching organizations:', fetchOrgsError.message);
          setError('Failed to load organizations. Please try again.');
        } else {
          setOrganizations(orgsData || []);
        }
      } catch (err) {
        console.error('Error in fetchData:', err.message);
        setError(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleJoinOrganization = async (event) => {
    event.preventDefault();
    setJoining(true);
    setError('');
    setSuccess('');

    if (!selectedOrganization) {
      setError('Please select an organization.');
      setJoining(false);
      return;
    }

    try {
      const organizationIdToJoin = selectedOrganization.id;
      const organizationNameToJoin = selectedOrganization.name; // Get the organization name

      // Get current user ID
      const { data: userData, error: userAuthError } = await supabase.auth.getUser();
      if (userAuthError || !userData?.user) {
        throw new Error('User not authenticated. Please log in.');
      }
      const userId = userData.user.id;

      // Update the user's profile with the organization_id AND the company name
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          organization_id: organizationIdToJoin,
          company: organizationNameToJoin, // <--- ADDED THIS LINE
        })
        .eq('id', userId);

      if (updateProfileError) {
        throw updateProfileError;
      }

      setSuccess(`Successfully joined organization '${selectedOrganization.name}'!`);
      setCurrentOrganizationId(organizationIdToJoin); // Update state to reflect change
      setSelectedOrganization(null); // Clear selected organization
      if (onOrganizationJoined) {
        onOrganizationJoined(organizationIdToJoin); // Callback to parent if needed
      }
    } catch (err) {
      console.error('Error joining organization:', err.message);
      setError(`Failed to join organization: ${err.message}`);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" sx={{ ml: 1 }}>
          Loading organization data...
        </Typography>
      </Box>
    );
  }

  if (currentOrganizationId) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        You are already associated with an organization.
      </Alert>
    );
  }

  return (
    <Card sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Join an Organization
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select the organization you wish to join from the list.
      </Typography>
      <Stack component="form" onSubmit={handleJoinOrganization} spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <Autocomplete
          id="organization-select"
          options={organizations}
          getOptionLabel={(option) => option.name}
          value={selectedOrganization}
          onChange={(event, newValue) => {
            setSelectedOrganization(newValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Organization"
              placeholder="Start typing to search..."
              fullWidth
              required
              error={!!error && !selectedOrganization}
              helperText={!!error && !selectedOrganization ? 'Please select an organization.' : ''}
              disabled={joining}
            />
          )}
          disabled={joining}
          sx={{ width: '100%' }}
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={joining || !selectedOrganization}
          startIcon={joining ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {joining ? 'Joining...' : 'Join Organization'}
        </Button>
      </Stack>
    </Card>
  );
}
