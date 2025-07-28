// src/sections/organizations/view/organization-create-view.jsx
import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { isValidPhoneNumber } from 'react-phone-number-input/input';

import { Box, Typography, TextField, Button, CircularProgress, Alert, Grid,  } from '@mui/material';

import { useCreateOrganizationMutation } from 'src/features/organizations/organizationsAPI';

import { useAuthContext } from 'src/auth/context/supabase';

// --- Zod Schema for Validation ---
const NewOrganizationSchema = zod.object({
  name: zod.string().min(1, { message: 'Organization Name is required!' }),
  description: zod.string().optional(),
  email: zod.string().email({ message: 'Invalid email address' }).optional().or(zod.literal('')),
  phoneNumber: zod
    .string()
    .optional()
    .refine((val) => !val || isValidPhoneNumber(val), { message: 'Invalid phone number' })
    .or(zod.literal('')),
  // NEW: Add website to the Zod schema
  website: zod.string().url({ message: 'Invalid URL format' }).optional().or(zod.literal('')),
  address: zod.string().min(1, { message: 'Address is required!' }),
  city: zod.string().min(1, { message: 'City is required!' }),
  state: zod.string().min(1, { message: 'State/Region is required!' }),
  zip_code: zod.string().min(1, { message: 'Zip/Postal Code is required!' }),
  country: zod.string().min(1, { message: 'Country is required!' }),
});
// ---------------------------------

export function OrganizationCreateView() {
  const { user } = useAuthContext();

  const [createOrganization, { isLoading, isError, error, isSuccess, reset: resetMutationStatus }] =
    useCreateOrganizationMutation();

  const methods = useForm({
    resolver: zodResolver(NewOrganizationSchema),
    defaultValues: {
      name: '',
      description: '',
      email: '',
      phoneNumber: '',
      // NEW: Add website to default values
      website: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: '',
    },
  });

  const {
    handleSubmit,
    register,
    formState: { errors },
    reset,
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    if (!user || !user.id) {
      console.error('User not authenticated. Cannot create organization.');
      alert('You must be logged in to create an organization.');
      return;
    }

    const organizationData = {
      owner_id: user.id,
      name: data.name,
      description: data.description || null,
      email: data.email || null,
      phone: data.phoneNumber || null,
      // NEW: Add website to the data sent to the mutation
      website: data.website || null, // Ensure 'null' if optional and empty string
      address: data.address,
      city: data.city,
      state: data.state,
      zip_code: data.zip_code,
      country: data.country,
    };

    try {
      await createOrganization(organizationData).unwrap();
      alert('Organization created successfully!');
      reset();
      resetMutationStatus();
    } catch (err) {
      console.error('Failed to create organization:', err);
    }
  });

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Create New Organization
      </Typography>
      <form onSubmit={onSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              {...register('name')}
              label="Organization Name"
              fullWidth
              margin="normal"
              required
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              {...register('description')}
              label="Description (Optional)"
              fullWidth
              margin="normal"
              multiline
              rows={3}
              error={!!errors.description}
              helperText={errors.description?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              {...register('email')}
              label="Email Address (Optional)"
              fullWidth
              margin="normal"
              type="email"
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              {...register('phoneNumber')}
              label="Phone Number (Optional)"
              fullWidth
              margin="normal"
              error={!!errors.phoneNumber}
              helperText={errors.phoneNumber?.message}
            />
          </Grid>
          {/* NEW: Add the website TextField */}
          <Grid item xs={12}>
            <TextField
              {...register('website')}
              label="Website (Optional)"
              fullWidth
              margin="normal"
              type="url" // Use type="url" for better browser validation hints
              error={!!errors.website}
              helperText={errors.website?.message}
            />
          </Grid>
          {/* End NEW */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
              Address Information
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              {...register('address')}
              label="Address"
              fullWidth
              margin="normal"
              required
              error={!!errors.address}
              helperText={errors.address?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              {...register('city')}
              label="City"
              fullWidth
              margin="normal"
              required
              error={!!errors.city}
              helperText={errors.city?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              {...register('state')}
              label="State/Region"
              fullWidth
              margin="normal"
              required
              error={!!errors.state}
              helperText={errors.state?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              {...register('zip_code')}
              label="Zip/Postal Code"
              fullWidth
              margin="normal"
              required
              error={!!errors.zip_code}
              helperText={errors.zip_code?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              {...register('country')}
              label="Country"
              fullWidth
              margin="normal"
              required
              error={!!errors.country}
              helperText={errors.country?.message}
            />
          </Grid>
        </Grid>

        {isError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error?.data?.message || error?.message || 'Failed to create organization'}
          </Alert>
        )}
        {isSuccess && (
          <Alert severity="success" sx={{ mt: 3 }}>
            Organization created successfully!
          </Alert>
        )}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Organization'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
