// src/views/dashboard/user/UserNewEditForm.jsx
import { z as zod } from 'zod';
import { useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';

// Material-UI components
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

// Router and Supabase
import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

// RTK Query API Imports
import { useGetOrganizationsQuery } from 'src/features/organizations/organizationsAPI';
import {
  useCreatePlayerMutation,
  useUpdatePlayerMutation,
  useGetPlayerQuery,
} from 'src/features/players/playersAPI';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Form, Field, schemaHelper } from 'src/components/hook-form';

// ----------------------------------------------------------------------
// Zod Schema for form validation
// ----------------------------------------------------------------------
export const NewUserSchema = zod
  .object({
    id: zod.string().optional(),
    firstName: zod.string().min(1, { message: 'First name is required!' }),
    lastName: zod.string().min(1, { message: 'Last name is required!' }),
    // Email is now optional for ALL cases if you don't need it for passwordless creation.
    // If email is still required for user identification, keep .min(1) for new users below.
    email: zod.string().email({ message: 'Invalid email' }).optional().or(zod.literal('')),
    // Password is now entirely optional and will not be passed for creation
    password: zod.string().optional().or(zod.literal('')),
    status: zod.string().optional(),
    isVerified: zod.boolean().optional(),
    organizationName: zod.string().optional().nullable(),
    profileType: zod
      .enum(['admin', 'player', 'manager', 'guest'], {
        errorMap: () => ({ message: 'Profile type is required!' }),
      })
      .optional(),
    photo_url: zod.string().url('Invalid URL format').optional().or(zod.literal('')),
    isNewUser: zod.boolean(),
  })
  .superRefine((data, ctx) => {
    // If email is required for NEW users only (e.g., for passwordless email verification)
    // Re-add this check if email is still mandatory for new users
    if (data.isNewUser && (!data.email || data.email === '')) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: 'Email is required for new users!',
        path: ['email'],
      });
    }

    // Ensure profileType has a value
    if (!data.profileType) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: 'Profile type is required!',
        path: ['profileType'],
      });
    }
  });

// ----------------------------------------------------------------------
// User New/Edit Form Component
// ----------------------------------------------------------------------
export function UserNewEditForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('id');

  console.log('UserNewEditForm: Current userId from URL:', userId);

  const {
    data: currentUser,
    isLoading: isUserLoading,
    error: userError,
  } = useGetPlayerQuery(userId, {
    skip: !userId,
  });

  console.log('UserNewEditForm: currentUser data from RTK Query:', currentUser);
  console.log('UserNewEditForm: isUserLoading:', isUserLoading);
  console.log('UserNewEditForm: userError:', userError);

  const {
    data: organizations,
    isLoading: organizationsLoading,
    error: organizationsError,
  } = useGetOrganizationsQuery();

  const [createPlayer, { isLoading: isCreatingPlayer }] = useCreatePlayerMutation();
  const [updatePlayer, { isLoading: isUpdatingPlayer }] = useUpdatePlayerMutation();

  const PROFILE_TYPES = ['admin', 'player', 'manager', 'guest'];

  const defaultValues = {
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    // password: '', // Removed from defaultValues as it's no longer managed by form
    status: 'active',
    isVerified: true,
    organizationName: null,
    profileType: 'player',
    photo_url: '',
    isNewUser: true,
  };

  const methods = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(NewUserSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = methods;

  const values = watch();
  console.log('UserNewEditForm: Current form values (from watch()):', values);

  useEffect(() => {
    if (userId && !isUserLoading && currentUser) {
      console.log('UserNewEditForm: Populating form for existing user...');
      const formValues = {
        ...currentUser,
        id: currentUser.id || '',
        firstName: currentUser.first_name || '',
        lastName: currentUser.last_name || '',
        email: currentUser.email || '',
        status: currentUser.status || 'active',
        isVerified: currentUser.is_verified ?? true,
        profileType: currentUser.user_type || 'player',
        photo_url: currentUser.photo_url || '',
        isNewUser: false,
        // password is intentionally omitted for editing existing users and new user creation
      };

      if (currentUser.organization_id && organizations) {
        const currentOrg = organizations.find((org) => org.id === currentUser.organization_id);
        if (currentOrg) {
          formValues.organizationName = currentOrg.name;
          console.log('UserNewEditForm: Organization found and set:', currentOrg.name);
        } else {
          formValues.organizationName = null;
          console.log(
            'UserNewEditForm: Organization ID exists but organization not found. Setting to null.'
          );
        }
      } else if (!currentUser.organization_id) {
        formValues.organizationName = null;
        console.log(
          'UserNewEditForm: No organization ID for current user. Setting organizationName to null.'
        );
      } else {
        console.log(
          'UserNewEditForm: Organizations still loading for existing user. Will re-run useEffect.'
        );
      }

      reset(formValues);
      console.log('UserNewEditForm: Form reset with currentUser data:', formValues);
    } else if (!userId) {
      console.log('UserNewEditForm: Initializing form for new user with default values.');
      reset(defaultValues);
    }
  }, [userId, isUserLoading, currentUser, organizations, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const selectedOrganization = organizations?.find((org) => org.name === data.organizationName);
      const organizationIdToSend = selectedOrganization ? selectedOrganization.id : null;

      const payload = {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email || null, // Email can still be optional
        organization_id: organizationIdToSend,
        user_type: data.profileType,
        status: data.status,
        is_verified: data.isVerified,
        photo_url: data.photo_url || null,
      };

      if (userId) {
        // Update user
        if (!currentUser?.id) {
          console.error(
            'UserNewEditForm: currentUser.id is missing for update operation, despite userId being present.'
          );
          toast.error('Cannot update user: User ID is missing.');
          return;
        }
        console.log('UserNewEditForm: Updating user with payload:', payload);
        await updatePlayer({ id: currentUser.id, ...payload }).unwrap();
        toast.success('User updated successfully!');
      } else {
        // Create new user (NO password passed)
        console.log('UserNewEditForm: Creating new user with payload:', payload);
        // Ensure createPlayer mutation in playersAPI supports creating without a password
        // This likely means it calls supabase.auth.admin.createUser() on the backend.
        await createPlayer(payload).unwrap();
        toast.success('User created!');
      }

      reset();
      router.push(paths.dashboard.user.list);
    } catch (error) {
      console.error('UserNewEditForm: Submission error:', error);
      toast.error(error.data?.message || error.message || 'Something went wrong!');
    }
  });

  const isSubmittingForm = isSubmitting || isCreatingPlayer || isUpdatingPlayer;

  if (isUserLoading || organizationsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (userError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Error loading user: {userError.message}</Alert>
      </Box>
    );
  }

  if (organizationsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Error loading organizations: {organizationsError.message}</Alert>
      </Box>
    );
  }

  const isNewUser = !currentUser;
  console.log('UserNewEditForm: isNewUser (derived):', isNewUser);

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ pt: 10, pb: 5, px: 3 }}>
            {/* Photo display and upload placeholder */}
            <Box sx={{ mb: 5, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Avatar
                src={values.photo_url || '/assets/images/avatars/avatar_default.jpg'}
                alt={values.firstName || 'User Photo'}
                sx={{ width: 128, height: 128, mb: 2 }}
              />
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                id="photo-upload-input"
              />
              <label htmlFor="photo-upload-input">
                <Button
                  component="span"
                  variant="outlined"
                  sx={{ position: 'absolute', bottom: 0, right: 0 }}
                >
                  Upload Photo
                </Button>
              </label>
            </Box>

            {currentUser && (
              <Label
                color={
                  (values.status === 'active' && 'success') ||
                  (values.status === 'banned' && 'error') ||
                  'warning'
                }
                sx={{ position: 'absolute', top: 24, right: 24 }}
              >
                {values.status}
              </Label>
            )}

            {currentUser && (
              <FormControlLabel
                labelPlacement="start"
                control={
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        {...field}
                        checked={field.value === 'banned'}
                        onChange={(event) =>
                          field.onChange(event.target.checked ? 'banned' : 'active')
                        }
                      />
                    )}
                  />
                }
                label={
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      Banned
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Apply disable account
                    </Typography>
                  </>
                }
                sx={{
                  mx: 0,
                  mb: 3,
                  width: 1,
                  justifyContent: 'space-between',
                }}
              />
            )}

            <Field.Switch
              name="isVerified"
              labelPlacement="start"
              label={
                <>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Email verified
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Disabling this will automatically send the user a verification email
                  </Typography>
                </>
              }
              sx={{ mx: 0, width: 1, justifyContent: 'space-between' }}
            />

            {currentUser && (
              <Stack sx={{ mt: 3, alignItems: 'center', justifyContent: 'center' }}>
                <Button variant="soft" color="error">
                  Delete user
                </Button>
              </Stack>
            )}
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
              <Field.Text name="email" label="Email address (Optional)" />
              {/* Removed password field for new users */}
              {/* If you need to include a password field for specific admin cases,
                  you can re-add it here with conditional rendering,
                  but it won't be passed in the createPlayer mutation in onSubmit. */}

              <Controller
                name="organizationName"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <Autocomplete
                    {...field}
                    options={organizations || []}
                    getOptionLabel={(option) =>
                      typeof option === 'string' ? option : option?.name || ''
                    }
                    isOptionEqualToValue={(option, value) => option.name === value}
                    loading={organizationsLoading}
                    onChange={(event, newValue) => {
                      field.onChange(newValue ? newValue.name : null);
                    }}
                    value={field.value || null}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Organization (Optional)"
                        placeholder="Select an organization"
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                )}
              />

              <Controller
                name="profileType"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <FormControl fullWidth error={!!error}>
                    <InputLabel id="profile-type-label">Profile Type</InputLabel>
                    <Select
                      labelId="profile-type-label"
                      id="profile-type-select"
                      label="Profile Type"
                      {...field}
                      value={field.value || ''}
                    >
                      {PROFILE_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                    {!!error && (
                      <Typography variant="caption" color="error">
                        {error?.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Box>

            <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
              <Button type="submit" variant="contained" loading={isSubmittingForm}>
                {isNewUser ? 'Create user' : 'Save changes'}
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
