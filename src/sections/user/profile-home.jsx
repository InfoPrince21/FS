// src/sections/account/profile-home.jsx
import { varAlpha } from 'minimal-shared/utils';
import { useRef, useState, useEffect, useCallback } from 'react';
// Removed AvatarCreator import as it's no longer directly used here
// import { AvatarCreator } from '@readyplayerme/react-avatar-creator'; // REMOVED

import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
// Removed Dialog related imports
// import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
// import IconButton from '@mui/material/IconButton'; // Not strictly needed, but keeping for now if other uses exist
// import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
// import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';
import { fNumber } from 'src/utils/format-number';

import { supabase } from 'src/lib/supabase';
import { useGetPlayerAchievementsQuery } from 'src/features/stats/statsAPI';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { AvatarDisplay } from 'src/components/ready-player-me/AvatarDisplay';

import { useProfile } from 'src/auth/hooks/use-profile';

// ----------------------------------------------------------------------

export const ANIMATION_STOPPED = 'STOPPED';

const SUPABASE_ANIMATIONS_BASE_URL =
  'https://lnimaqgvxfrougxjlhgo.supabase.co/storage/v1/object/public/3d-animations/';

const DEFAULT_RPM_AVATAR_URL = 'https://models.readyplayer.me/686f12b0f439768e54fa6bd6.glb';

export function ProfileHome() {
  const fileRef = useRef(null);
  const router = useRouter(); // Initialize useRouter
  const { profile, loading, error, refetch: refetchProfile } = useProfile();

  // Removed openAvatarCreator state as it's no longer used for a dialog
  // const [openAvatarCreator, setOpenAvatarCreator] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState('');

  // States to manage the avatar URL and login token, initialized from profile
  const [rpmLoginToken, setRpmLoginToken] = useState(profile?.rpm_login_token || null);
  const [userAvatarUrl, setUserAvatarUrl] = useState(
    profile?.['3d_avatar_url'] || DEFAULT_RPM_AVATAR_URL
  );
  // ✨ ADD THIS NEW STATE ✨
  const [cacheBuster, setCacheBuster] = useState(Date.now()); // Initialize with current timestamp

  const {
    data: achievements,
    isLoading: achievementsLoading,
    error: achievementsError,
  } = useGetPlayerAchievementsQuery({ playerId: profile?.id }, { skip: !profile?.id });

  // Synchronize local states with profile data when it changes
  useEffect(() => {
    console.log('DEBUG ProfileHome: Profile useEffect triggered. Current profile:', profile);
    if (profile) {
      // Update avatar URL if it's different from the profile or needs to be set to default
      const newAvatarUrl = profile['3d_avatar_url'] || DEFAULT_RPM_AVATAR_URL;
      if (newAvatarUrl !== userAvatarUrl) {
        setUserAvatarUrl(newAvatarUrl);
        console.log('DEBUG ProfileHome: userAvatarUrl state updated to:', newAvatarUrl);
        // ✨ CRITICAL: Update cache buster when avatar URL changes ✨
        setCacheBuster(Date.now());
      }

      // Update login token if it's different from the profile or needs to be cleared
      const newRpmLoginToken = profile.rpm_login_token || null;
      if (newRpmLoginToken !== rpmLoginToken) {
        setRpmLoginToken(newRpmLoginToken);
        console.log('DEBUG ProfileHome: rpmLoginToken state updated to:', newRpmLoginToken);
      }
    } else {
      // If profile is cleared/not found, reset to default and bust cache
      setUserAvatarUrl(DEFAULT_RPM_AVATAR_URL);
      setRpmLoginToken(null);
      setCacheBuster(Date.now()); // ✨ Reset cache buster if profile clears ✨
    }
  }, [profile, userAvatarUrl, rpmLoginToken]);

  const handleAttach = () => {
    if (fileRef.current) {
      fileRef.current.click();
    }
  };

  // Removed handleOpenAvatarCreator and handleCloseAvatarCreator as they are for dialog
  // const handleOpenAvatarCreator = useCallback(() => {
  //   setOpenAvatarCreator(true);
  //   console.log('DEBUG ProfileHome: handleOpenAvatarCreator called.');
  // }, []);

  // const handleCloseAvatarCreator = useCallback(() => {
  //   setOpenAvatarCreator(false);
  //   console.log('DEBUG ProfileHome: handleCloseAvatarCreator called.');
  // }, []);

  // Ready Player Me AvatarCreator configuration (can be moved to the 3d-avatar-page)
  // const avatarCreatorConfig = {
  //   clearCache: false,
  //   bodyType: 'fullbody',
  //   quickStart: false,
  //   language: 'en',
  //   selectBodyType: true,
  //   portal: 'v1',
  //   login: 'guest',
  //   hideFaceTracking: true,
  //   hideDownloadReady: true,
  // };

  // This function is still needed to save avatar data if it were passed back from the other page,
  // but if the dedicated page handles its own saving, this might become redundant here.
  // For now, keeping it as a placeholder or for potential future use if data needs to be passed back.
  const saveAvatarUrlAndTokenToProfile = useCallback(
    async (url, token) => {
      console.log(
        'DEBUG (saveAvatarUrlAndTokenToProfile): Function called with URL:',
        url,
        'and Token:',
        token
      );
      if (!profile || !profile.id) {
        toast.error('User profile not found. Cannot save avatar URL/token.');
        return;
      }
      try {
        const updateData = { '3d_avatar_url': url };
        // Ensure the token is a non-empty string before setting it, otherwise set to null
        if (typeof token === 'string' && token.length > 0) {
          updateData.rpm_login_token = token;
          console.log(
            'DEBUG (saveAvatarUrlAndTokenToProfile): Including rpm_login_token in updateData:',
            token
          );
        } else {
          updateData.rpm_login_token = null;
          console.warn(
            'DEBUG (saveAvatarUrlAndTokenToProfile): rpm_login_token was not a valid string or empty. Setting to NULL in database.'
          );
        }

        console.log(
          'DEBUG (saveAvatarUrlAndTokenToProfile): updateData object before Supabase update:',
          updateData
        );

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id);

        if (updateError) {
          throw updateError;
        }

        toast.success('3D Avatar saved successfully!');
        refetchProfile(); // Refresh the profile to get the latest data
      } catch (err) {
        console.error('Error saving avatar URL/token:', err.message);
        toast.error('Failed to save 3D Avatar.');
      }
    },
    [profile, refetchProfile]
  );

  // This handler is now redundant if the dedicated page handles its own export logic
  // and direct state updates/profile saving.
  const handleAvatarExported = useCallback(
    (event /*: AvatarExportedEvent */) => {
      console.group('Ready Player Me onExported Event Data:');
      console.log('Raw event data:', event.data);

      let newAvatarUrl = event.data.url;
      // *** CRITICAL CORRECTION: Use the fallback logic for loginToken from your inspiration file ***
      const exportedLoginToken =
        event.data.loginToken ||
        (newAvatarUrl ? newAvatarUrl.split('/').pop().split('.')[0] : null);

      console.log('Original avatar URL from RPM:', newAvatarUrl);
      console.log('Resolved exportedLoginToken (with fallback):', exportedLoginToken);

      // Append a unique query parameter to the URL to force re-fetch and bypass cache
      const timestamp = new Date().getTime();
      newAvatarUrl = `${newAvatarUrl}?v=${timestamp}`;
      console.log('Cache-busted avatar URL for saving:', newAvatarUrl);

      if (newAvatarUrl) {
        // Update local state immediately for visual feedback
        setUserAvatarUrl(newAvatarUrl);
        setRpmLoginToken(exportedLoginToken);
        saveAvatarUrlAndTokenToProfile(newAvatarUrl, exportedLoginToken);
      } else {
        console.warn('DEBUG (onAvatarExported): No avatar URL received from RPM export event.');
      }
      // handleCloseAvatarCreator(); // This line is removed as there is no dialog to close
      console.groupEnd();
    },
    [saveAvatarUrlAndTokenToProfile] // Removed handleCloseAvatarCreator from dependencies
  );

  const handlePlayDance = useCallback(() => {
    console.log('Attempting to play dance animation');
    setCurrentAnimation('F_Dances_001.glb');
  }, []);

  const handleSetIdle = useCallback(() => {
    console.log('Setting idle animation');
    setCurrentAnimation('');
  }, []);

  const handlePlayExpression = useCallback(() => {
    console.log('Attempting to play expression animation');
    setCurrentAnimation('F_Expressions_008.glb');
  }, []);

  const handleStopAnimation = useCallback(() => {
    console.log('Stopping current animation');
    setCurrentAnimation(ANIMATION_STOPPED);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading profile data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Alert severity="error">Error loading profile: {error.message || String(error)}</Alert>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Alert severity="info">No profile found. Please ensure you are logged in.</Alert>
      </Box>
    );
  }

  const gender = profile?.custom_animation_settings?.gender || 'masculine';

  const customAnimationSettings = {
    idle: profile?.custom_animation_settings?.idle
      ? `${SUPABASE_ANIMATIONS_BASE_URL}${gender}/idle/${profile.custom_animation_settings.idle}`
      : null,
    dance: profile?.custom_animation_settings?.dance
      ? `${SUPABASE_ANIMATIONS_BASE_URL}${gender}/dance/${profile.custom_animation_settings.dance}`
      : null,
    expression: profile?.custom_animation_settings?.expression
      ? `${SUPABASE_ANIMATIONS_BASE_URL}${gender}/expression/${profile.custom_animation_settings.expression}`
      : null,
  };

  // --- Crucial Console Logs for Debugging ---
  console.group('ProfileHome Render Debug');
  console.log('Profile loaded (from useProfile)?', !loading);
  console.log('Profile data (from useProfile):', profile);
  console.log('Local userAvatarUrl state:', userAvatarUrl);
  console.log('Local rpmLoginToken state:', rpmLoginToken);
  console.log('Local cacheBuster state:', cacheBuster); // ✨ ADD THIS DEBUG LOG ✨
  // console.log('Is dialog open?', openAvatarCreator); // Removed debug log
  console.groupEnd();

  // ✨ ADD THIS LINE BEFORE THE RETURN STATEMENT ✨
  const cacheBustedAvatarUrl = userAvatarUrl ? `${userAvatarUrl}?v=${cacheBuster}` : null;

  const renderAbout = () => (
    <Card>
      <CardHeader title="About" />
      <Box
        sx={{
          p: 3,
          gap: 2,
          display: 'flex',
          typography: 'body2',
          flexDirection: 'column',
        }}
      >
        <div>{profile.about || 'No "About" description available.'}</div>
        <Box sx={{ gap: 2, display: 'flex', lineHeight: '24px' }}>
          <Iconify width={24} icon="mingcute:location-fill" />
          <span>
            Live at
            <Link variant="subtitle2" color="inherit">
              &nbsp;{profile.city}, {profile.state}, {profile.country}
            </Link>
          </span>
        </Box>
        <Box sx={{ gap: 2, display: 'flex', lineHeight: '24px' }}>
          <Iconify width={24} icon="solar:letter-bold" />
          {profile.email}
        </Box>
        <Box sx={{ gap: 2, display: 'flex', lineHeight: '24px' }}>
          <Iconify width={24} icon="solar:case-minimalistic-bold" />
          <span>
            {profile.role || 'N/A'} at
            <Link variant="subtitle2" color="inherit">
              &nbsp;{profile.organization_name || 'No Organization'}
            </Link>
          </span>
        </Box>
      </Box>
    </Card>
  );

  const renderPostInput = () => (
    <Card sx={{ p: 3 }}>
      <InputBase
        multiline
        fullWidth
        rows={4}
        placeholder="Share what you are thinking here..."
        inputProps={{ id: 'post-input' }}
        sx={[
          (theme) => ({
            p: 2,
            mb: 3,
            borderRadius: 1,
            border: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.2)}`,
          }),
        ]}
      />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box
          sx={{
            gap: 1,
            display: 'flex',
            alignItems: 'center',
            color: 'text.secondary',
          }}
        >
          <Fab size="small" color="inherit" variant="softExtended" onClick={handleAttach}>
            <Iconify icon="solar:gallery-wide-bold" width={24} sx={{ color: 'success.main' }} />
            Image/Video
          </Fab>
          <Fab size="small" color="inherit" variant="softExtended">
            <Iconify icon="solar:videocamera-record-bold" width={24} sx={{ color: 'error.main' }} />
            Streaming
          </Fab>
        </Box>
        <Button variant="contained">Post</Button>
      </Box>
      <input ref={fileRef} type="file" style={{ display: 'none' }} />
    </Card>
  );

  const renderCareerStats = () => (
    <Card>
      <CardHeader title="Career Statistics" />
      <Box sx={{ p: 3 }}>
        {profile.careerStats ? (
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2">Total Games:</Typography>
              <Typography variant="body2">{fNumber(profile.careerStats.totalGames)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2">Average Score:</Typography>
              <Typography variant="body2">{fNumber(profile.careerStats.averageScore)}</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">KPI Distribution:</Typography>
            <List disablePadding>
              {profile.careerStats.kpiDistribution &&
              profile.careerStats.kpiDistribution.length > 0 ? (
                profile.careerStats.kpiDistribution.map((kpi) => (
                  <ListItem key={kpi.id} disablePadding sx={{ py: 0.5 }}>
                    <ListItemText primary={kpi.label} secondary={`Value: ${fNumber(kpi.value)}`} />
                  </ListItem>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No KPI data available.
                </Typography>
              )}
            </List>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">Score Progression:</Typography>
            <List disablePadding>
              {profile.careerStats.scoreProgression &&
              profile.careerStats.scoreProgression.length > 0 ? (
                profile.careerStats.scoreProgression.map((score, index) => (
                  <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={`Game on ${fDate(score.gameDate, 'MMM dd,YYYY')}`}
                      secondary={`Score: ${fNumber(score.totalScore)}`}
                    />
                  </ListItem>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No score progression data available.
                </Typography>
              )}
            </List>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No career statistics available.
          </Typography>
        )}
      </Box>
    </Card>
  );

  const renderAchievements = () => (
    <Card>
      <CardHeader title="Achievements" />
      <Box sx={{ p: 3 }}>
        {achievementsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : achievementsError ? (
          <Alert severity="error">
            Error loading achievements: {achievementsError.message || String(achievementsError)}
          </Alert>
        ) : (
          <List disablePadding>
            {achievements && achievements.length > 0 ? (
              achievements.map((achievement) => (
                <ListItem key={achievement.id} disablePadding sx={{ py: 1 }}>
                  <ListItemIcon>
                    <Iconify icon="solar:medal-star-bold" width={24} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2">
                        {achievement.achievement_name || 'Unnamed Achievement'}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" component="span" color="text.secondary">
                          {achievement.achievement_description || 'No description.'}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.disabled">
                          Earned on {fDate(achievement.created_at, 'MMM dd,YYYY')}
                          {achievement.source_game_id &&
                            ` in Game ID: ${achievement.source_game_id}`}
                          {achievement.amount && ` (+${achievement.amount} Merit)`}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No achievements earned yet. Keep playing to unlock them!
              </Typography>
            )}
          </List>
        )}
      </Box>
    </Card>
  );

  const renderSocials = () => (
    <Card>
      <CardHeader title="Social" />
      <Box
        sx={{
          p: 3,
          gap: 2,
          display: 'flex',
          flexDirection: 'column',
          typography: 'body2',
        }}
      >
        <Box
          sx={{
            gap: 2,
            display: 'flex',
            lineHeight: '20px',
            wordBreak: 'break-all',
            alignItems: 'flex-start',
          }}
        >
          <Iconify icon="socials:twitter" />
          <Link color="inherit" href={profile.twitter_url || '#'} target="_blank" rel="noopener">
            {profile.twitter_url || 'Not set'}
          </Link>
        </Box>
        <Box
          sx={{
            gap: 2,
            display: 'flex',
            lineHeight: '20px',
            wordBreak: 'break-all',
            alignItems: 'flex-start',
          }}
        >
          <Iconify icon="socials:facebook" />
          <Link color="inherit" href={profile.facebook_url || '#'} target="_blank" rel="noopener">
            {profile.facebook_url || 'Not set'}
          </Link>
        </Box>
        <Box
          sx={{
            gap: 2,
            display: 'flex',
            lineHeight: '20px',
            wordBreak: 'break-all',
            alignItems: 'flex-start',
          }}
        >
          <Iconify icon="socials:instagram" />
          <Link color="inherit" href={profile.instagram_url || '#'} target="_blank" rel="noopener">
            {profile.instagram_url || 'Not set'}
          </Link>
        </Box>
        <Box
          sx={{
            gap: 2,
            display: 'flex',
            lineHeight: '20px',
            wordBreak: 'break-all',
            alignItems: 'flex-start',
          }}
        >
          <Iconify icon="socials:linkedin" />
          <Link color="inherit" href={profile.linkedin_url || '#'} target="_blank" rel="noopener">
            {profile.linkedin_url || 'Not set'}
          </Link>
        </Box>
      </Box>
    </Card>
  );

  return (
    <Grid container spacing={3}>
      <Grid xs={12} md={4} sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ p: 2, position: 'relative' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Your 3D Avatar
          </Typography>

          {/* Avatar Display for preview */}
          <AvatarDisplay
            // ✨ UPDATE THE KEY AND avatarUrl PROP HERE ✨
            key={`${cacheBustedAvatarUrl}`} // Using just the cacheBustedAvatarUrl as key is concise and effective
            avatarUrl={cacheBustedAvatarUrl} // Pass the cache-busted URL
            animationFileName={currentAnimation}
            customAnimationSettings={customAnimationSettings}
            height={400}
          />

          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2, width: '100%' }}
            onClick={() => router.push('/dashboard/user/account/3d-avatar')} // Navigate to the dedicated page
          >
            Edit Avatar
          </Button>

          {/* Animation Control Buttons */}
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              justifyContent: 'center',
            }}
          >
            <Button variant="outlined" onClick={handlePlayDance}>
              Play Dance
            </Button>
            <Button variant="outlined" onClick={handleSetIdle}>
              Set Idle
            </Button>
            <Button variant="outlined" onClick={handlePlayExpression}>
              Expression
            </Button>
            <Button variant="outlined" color="error" onClick={handleStopAnimation}>
              Stop
            </Button>
          </Box>
        </Card>

        {renderAbout()}
        {renderSocials()}
      </Grid>

      <Grid xs={12} md={8} sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
        {renderPostInput()}
        {renderCareerStats()}
        {renderAchievements()}
      </Grid>

      {/* The Dialog and its contents are entirely removed */}
      {/* <Dialog fullWidth maxWidth="md" open={openAvatarCreator} onClose={handleCloseAvatarCreator}>
        <DialogTitle>Edit your Ready Player Me avatar</DialogTitle>
        <DialogContent sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
          {openAvatarCreator && (loading || !profile) && (
            <Stack
              direction="column"
              justifyContent="center"
              alignItems="center"
              sx={{ height: '100%' }}
              spacing={2}
            >
              <CircularProgress />
              <Typography variant="body2">Loading user profile for avatar creator...</Typography>
            </Stack>
          )}

          {openAvatarCreator && profile && (
            <AvatarCreator
              subdomain={RPM_SUBDOMAIN_NAME}
              key={rpmLoginToken || 'new-avatar'}
              loginToken={rpmLoginToken || undefined}
              config={avatarCreatorConfig}
              onExported={handleAvatarExported}
              onError={(rpmError) => {
                console.error('ReadyPlayerMe AvatarCreator Error:', rpmError);
                toast.error(
                  `RPM Creator Error: ${rpmError.message || 'An unknown error occurred during avatar creation.'}`
                );
              }}
              style={{ flexGrow: 1, width: '100%', height: '100%', border: 'none' }}
            />
          )}
        </DialogContent>
      </Dialog> */}
    </Grid>
  );
}
