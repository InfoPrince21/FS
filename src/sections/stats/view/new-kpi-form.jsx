// src/sections/stats/view/new-kpi-form.jsx
import React, { useState } from 'react';

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

import { useCreateKpiMutation } from 'src/features/stats/statsAPI';

// --- IMPORTANT CHANGES HERE ---
// 1. Import your custom Iconify component
import { Iconify } from 'src/components/iconify';
// 2. Import getDefaultIcon instead of getIconComponent from icon-picker
import { IconPicker, getDefaultIcon } from 'src/components/icon-picker/icon-picker';
// --- END IMPORTANT CHANGES ---

// ----------------------------------------------------------------------

export function NewKpiForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    points: '',
    iconName: '', // Add the new iconName field to state
  });

  const [createKpi, { isLoading, isSuccess, isError, error }] = useCreateKpiMutation();

  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false); // State to control picker visibility

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
    try {
      await createKpi(formData).unwrap();
      // Clear form on success, including the new iconName
      setFormData({ name: '', description: '', points: '', iconName: '' });
    } catch (err) {
      console.error('Failed to create KPI:', err);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 5, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Create New KPI
        </Typography>
        {isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            KPI created successfully!
          </Alert>
        )}
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error creating KPI: {error?.data?.message || error?.message || 'Unknown error'}
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
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          fullWidth
          multiline
          rows={3}
          margin="normal"
        />
        <TextField
          label="Points"
          name="points"
          value={formData.points}
          onChange={handleChange}
          type="number"
          fullWidth
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

        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isLoading}
          sx={{ mt: 3 }}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Create KPI'}
        </Button>
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
