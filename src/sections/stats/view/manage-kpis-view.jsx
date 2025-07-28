// src/sections/stats/view/manage-kpis-view.jsx
import React, { useState, useCallback } from 'react';

import { Container, Typography, Box, CircularProgress, Alert, List } from '@mui/material';

// Import RTK Query hook
import { useGetKpisQuery } from 'src/features/stats/statsAPI';

// Import components from the same 'view' directory
import { NewKpiForm } from './new-kpi-form';
import { KpiListItem } from './kpi-list-item';
import { EditKpiForm } from './edit-kpi-form'; // Correctly import EditKpiForm from its own file

export function ManageKpisView() {
  // Renamed to 'View' to distinguish from 'Page'
  const [editingKpiId, setEditingKpiId] = useState(null);

  const {
    data: kpis,
    isLoading: isLoadingKpis,
    isError: isKpisError,
    error: kpisError,
    refetch,
  } = useGetKpisQuery();

  const handleEditKpi = useCallback((id) => {
    setEditingKpiId(id);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingKpiId(null);
  }, []);

  const handleKpiUpdated = useCallback(() => {
    setEditingKpiId(null);
    refetch();
  }, [refetch]);

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 5 }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h3" gutterBottom>
          Manage KPIs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create, view, edit, and delete Key Performance Indicators.
        </Typography>
      </Box>

      {/* Conditionally render the Edit form or the New KPI form + list */}
      {editingKpiId ? (
        <EditKpiForm
          kpiId={editingKpiId}
          onCancelEdit={handleCancelEdit}
          onKpiUpdated={handleKpiUpdated}
        />
      ) : (
        <>
          <Box sx={{ mb: 8 }}>
            <NewKpiForm />
          </Box>

          <Box sx={{ mt: 5 }}>
            <Typography variant="h4" gutterBottom>
              Existing KPIs
            </Typography>

            {isLoadingKpis && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                  Loading KPIs...
                </Typography>
              </Box>
            )}

            {isKpisError && (
              <Alert severity="error" sx={{ mt: 3 }}>
                Error loading KPIs: {kpisError?.message || 'Unknown error'}
              </Alert>
            )}

            {kpis && kpis.length > 0 ? (
              <List>
                {kpis.map((kpi) => (
                  <KpiListItem
                    // FIX: Changed kpi.uuid to kpi.id for the key prop
                    key={kpi.id}
                    kpi={kpi}
                    onEditKpi={handleEditKpi}
                  />
                ))}
              </List>
            ) : (
              !isLoadingKpis &&
              !isKpisError && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  No KPIs found. Create a new one above!
                </Alert>
              )
            )}
          </Box>
        </>
      )}
    </Container>
  );
}
