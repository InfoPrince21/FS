// src/sections/account/account-general.jsx

import { z as zod } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useCallback, useState } from 'react';
import { isValidPhoneNumber } from 'react-phone-number-input/input';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import { Alert } from '@mui/material';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { fData } from 'src/utils/format-number';

import { supabase } from 'src/lib/supabase';

import { toast } from 'src/components/snackbar';
import { Form, Field, schemaHelper } from 'src/components/hook-form';

import { JoinOrganizationForm } from 'src/sections/organizations/join-organization-form';

import { useProfile } from 'src/auth/hooks/use-profile';

// ----------------------------------------------------------------------
// Define UpdateUserSchema here, before AccountGeneral uses it
export const UpdateUserSchema = zod.object({
  firstName: zod.string().min(1, { message: 'First name is required!' }),
  lastName: zod.string().min(1, { message: 'Last name is required!' }),
  displayName: zod.string().optional().or(zod.literal('')),
  email: zod
    .string()
    .email({ message: 'Email must be a valid email address!' })
    .optional()
    .or(zod.literal('')),
  photoURL: zod.any().optional(),
  phoneNumber: zod
    .string()
    .refine(
      (value) => {
        if (!value) return true;
        return isValidPhoneNumber(value);
      },
      {
        message: 'Invalid phone number!',
      }
    )
    .optional(),
  country: zod.string().optional().nullable(),
  address: zod.string().optional().or(zod.literal('')),
  state: zod.string().optional().or(zod.literal('')),
  city: zod.string().optional().or(zod.literal('')),
  zipCode: zod.string().optional().or(zod.literal('')),
  about: zod.string().optional().or(zod.literal('')),
  isPublic: zod.boolean().optional(),
});

// ----------------------------------------------------------------------

export function AccountGeneral() {
  const { profile, loading, refetch } = useProfile();

  // --- NEW DEBUG LOG START ---
  // This will log the raw profile.organizations object every time it renders
  // when an organization_id is present.
  useEffect(() => {
    if (!loading && profile?.organization_id) {
      console.log(
        'DEBUG: Profile has organization_id. Profile.organizations:',
        profile.organizations // This will now likely log 'undefined' as expected from useProfile
      );
      console.log('DEBUG: Profile.organization_name:', profile.organization_name); // ADDED THIS LOG TO SEE THE TRANSFORMED NAME
      // Also check the type of profile.organizations.name if it exists
      if (profile.organizations) {
        console.log(
          'DEBUG: Type of profile.organizations.name:',
          typeof profile.organizations.name
        );
      }
    }
  }, [loading, profile]);
  // --- NEW DEBUG LOG END ---

  const defaultValues = {
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phoneNumber: '',
    photoURL: null,
    country: null,
    address: '',
    state: '',
    city: '',
    zipCode: '',
    about: '',
    isPublic: false,
  };

  const methods = useForm({
    mode: 'all',
    resolver: zodResolver(UpdateUserSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        displayName: profile.display_name || '',
        email: profile.email || '',
        phoneNumber: profile.phone_number || '',
        photoURL: null,
        country: profile.country || null,
        address: profile.address || '',
        state: profile.state || '',
        city: profile.city || '',
        zipCode: profile.zip_code || '',
        about: profile.about || '',
        isPublic: profile.is_public || false,
      });
    }
  }, [profile, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      let photoURL = profile?.photo_url || '';

      if (data.photoURL instanceof File) {
        const fileExt = data.photoURL.name.split('.').pop();
        const fileName = `${profile.id}-${uuidv4()}.${fileExt}`;
        const filePath = `${profile.id}/${fileName}`;

        if (photoURL && photoURL.includes(supabase.storage.url)) {
          const previousFilePath = photoURL.split('/').pop();
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove([`${profile.id}/${previousFilePath}`]);

          if (deleteError) {
            console.warn('Error deleting old avatar:', deleteError.message);
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, data.photoURL, {
            upsert: true,
            contentType: data.photoURL.type,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        photoURL = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          display_name: data.displayName || null,
          email: data.email || null,
          phone_number: data.phoneNumber || null,
          photo_url: photoURL,
          country: data.country || null,
          address: data.address || null,
          state: data.state || null,
          city: data.city || null,
          zip_code: data.zipCode || null,
          about: data.about || null,
          is_public: data.isPublic,
          // If you intend to save the company name directly in the 'profiles' table's 'company' column
          // based on the joined organization name, this line is correct for that purpose.
          // However, consider the redundancy discussed earlier.
          company: profile?.organization_name || null, // Changed from profile?.organizations?.name
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await refetch();
      toast.success('Update success!');
    } catch (error) {
      console.error(error);
      toast.error(`Something went wrong: ${error.message}. Please try again.`);
    }
  });

  const handleOrganizationJoined = useCallback(() => {
    refetch();
    toast.success('You have successfully joined an organization!');
  }, [refetch]);

  if (loading) return <Typography>Loading profile...</Typography>;

  // CRITICAL FIX: Safely get the organization name from the transformed property
  const organizationName = profile?.organization_name || 'Unknown Organization';

  return (
    <>
      <Form methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                pt: 10,
                pb: 5,
                px: 3,
                textAlign: 'center',
              }}
            >
              {profile?.photo_url && (
                <Box mb={2}>
                  <img
                    src={profile.photo_url}
                    alt="Current Avatar"
                    style={{ width: 120, height: 120, borderRadius: '50%' }}
                  />
                </Box>
              )}
              <Field.UploadAvatar
                name="photoURL"
                defaultValue={profile?.photo_url || ''}
                maxSize={3145728}
                helperText={
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 3,
                      mx: 'auto',
                      display: 'block',
                      textAlign: 'center',
                      color: 'text.disabled',
                    }}
                  >
                    Allowed *.jpeg, *.jpg, *.png, *.gif
                    <br /> max size of {fData(3145728)}
                  </Typography>
                }
              />

              <Field.Switch
                name="isPublic"
                labelPlacement="start"
                label="Public profile"
                sx={{ mt: 5 }}
              />

              <Button variant="soft" color="error" sx={{ mt: 3 }}>
                Delete user
              </Button>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              <Box
                sx={{
                  rowGap: 3,
                  columnGap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                }}
              >
                <Field.Text name="firstName" label="First name" />
                <Field.Text name="lastName" label="Last name" />
                <Field.Text name="displayName" label="Display name (Optional)" />
                <Field.Text name="email" label="Email address (Optional)" />
                <Field.Phone name="phoneNumber" label="Phone number (Optional)" />
                <Field.Text name="address" label="Address (Optional)" />
                <Field.CountrySelect
                  name="country"
                  label="Country (Optional)"
                  placeholder="Choose a country"
                />
                <Field.Text name="state" label="State/region (Optional)" />
                <Field.Text name="city" label="City (Optional)" />
                <Field.Text name="zipCode" label="Zip/code (Optional)" />
              </Box>

              <Stack spacing={3} sx={{ mt: 3, alignItems: 'flex-end' }}>
                <Field.Text name="about" multiline rows={4} label="About (Optional)" />

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {isSubmitting ? 'Saving...' : 'Save changes'}
                </Button>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </Form>

      {/* --- */}

      {/* Render JoinOrganizationForm if the user does not have an organization_id */}
      {!loading && !profile?.organization_id && (
        <Box sx={{ mt: 3 }}>
          <JoinOrganizationForm onOrganizationJoined={handleOrganizationJoined} />
        </Box>
      )}

      {/* Display current organization if available */}
      {!loading && profile?.organization_id && (
        <Alert severity="info" sx={{ mt: 3 }}>
          Your profile is currently associated with an organization:{' '}
          <strong>{organizationName}</strong>.
        </Alert>
      )}
    </>
  );
}
