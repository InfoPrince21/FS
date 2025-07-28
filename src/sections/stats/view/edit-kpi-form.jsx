// src/sections/stats/view/edit-kpi-form.jsx
import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';

import { AddPhotoAlternate as ImageIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  TextField,
  Typography,
} from '@mui/material';

import { useGetKpiByIdQuery, useUpdateKpiMutation } from 'src/features/stats/statsAPI';

// --- IMPORTANT CHANGES HERE ---
// 1. Import your custom Iconify component
import { Iconify } from 'src/components/iconify';
// 2. Import getDefaultIcon instead of getIconComponent from icon-picker
import { IconPicker, getDefaultIcon } from 'src/components/icon-picker/icon-picker';
// --- END IMPORTANT CHANGES ---

export function EditKpiForm({ kpiId, onCancelEdit, onKpiUpdated }) {
  const {
    data: kpi,
    isLoading: isLoadingKpi,
    error: kpiError,
    isSuccess: isKpiLoadSuccess,
  } = useGetKpiByIdQuery(kpiId, {
    skip: !kpiId,
  });

  const [
    updateKpi,
    { isLoading: isUpdating, isSuccess: updateSuccess, isError: updateIsError, error: updateError },
  ] = useUpdateKpiMutation();

  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    description: '',
    points: '', // Make sure 'points' is part of formData
    iconName: '', // Add the new iconName field to state
  });

  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false); // State to control picker visibility

  useEffect(() => {
    if (kpi) {
      setFormData({
        name: kpi.name || '',
        unit: kpi.unit || '',
        description: kpi.description || '',
        points: kpi.points || '', // Load points from kpi data
        iconName: kpi.iconName || '', // Load the existing iconName from kpi data
      });
    }
  }, [kpi]);

  useEffect(() => {
    if (updateSuccess && onKpiUpdated) {
      onKpiUpdated();
    }
  }, [updateSuccess, onKpiUpdated]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleIconSelect = (iconName) => {
    setFormData((prev) => ({
      ...prev,
      iconName,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!kpiId) {
      console.error('No KPI ID provided for update.');
      return;
    }
    try {
      // Ensure formData includes iconName when sent
      await updateKpi({ id: kpiId, ...formData }).unwrap();
    } catch (err) {
      console.error('Failed to update KPI:', err);
    }
  };

  if (isLoadingKpi) {
    return (
      <Container maxWidth="lg" sx={{ mt: 5, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1">Loading KPI details...</Typography>
      </Container>
    );
  }

  if (kpiError) {
    return (
      <Container maxWidth="lg" sx={{ mt: 5, textAlign: 'center' }}>
        <Alert severity="error">Error loading KPI: {kpiError?.message || 'Unknown error'}</Alert>
      </Container>
    );
  }

  if (!kpi && isKpiLoadSuccess) {
    return (
      <Container maxWidth="lg" sx={{ mt: 5, textAlign: 'center' }}>
        <Alert severity="warning">KPI with ID &quot;{kpiId}&quot; not found.</Alert>
        {onCancelEdit && (
          <Button variant="outlined" onClick={onCancelEdit} sx={{ mt: 2 }}>
            Back to List
          </Button>
        )}
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 2, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Edit KPI: {kpi?.name || 'Loading...'}
        </Typography>
        {updateSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            KPI updated successfully!
          </Alert>
        )}
        {updateIsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error updating KPI: {updateError?.data?.message || 'Unknown error'}
          </Alert>
        )}
      </Box>

      <form onSubmit={handleSubmit}>
        <TextField
          label="KPI Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Points"
          name="points"
          value={formData.points}
          onChange={handleChange}
          type="number" // Important for numerical input
          fullWidth
          margin="normal"
        />
        <TextField
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          fullWidth
          multiline
          rows={3}
          margin="normal"
        />

        {/* New: Icon Selection Field */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setIsIconPickerOpen(true)}
            startIcon={
              // --- IMPORTANT CHANGE HERE ---
              // Use Iconify component with getDefaultIcon
              formData.iconName ? (
                <Iconify icon={getDefaultIcon(formData.iconName)} width={24} height={24} />
              ) : (
                <ImageIcon />
              )
              // --- END IMPORTANT CHANGE ---
            }
          >
            {formData.iconName ? `Change Icon (${formData.iconName})` : 'Select Icon'}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button type="submit" variant="contained" color="primary" disabled={isUpdating}>
            {isUpdating ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
          {onCancelEdit && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={onCancelEdit}
              disabled={isUpdating}
            >
              Cancel
            </Button>
          )}
        </Box>
      </form>

      {/* New: IconPicker Component */}
      <IconPicker
        open={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelectIcon={handleIconSelect}
        selectedIconName={formData.iconName}
      />
    </Container>
  );
}

EditKpiForm.propTypes = {
  kpiId: PropTypes.string.isRequired,
  onCancelEdit: PropTypes.func,
  onKpiUpdated: PropTypes.func,
};
