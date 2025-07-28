import { useEffect, useState, useCallback } from 'react';
import { AvatarCreator } from '@readyplayerme/react-avatar-creator';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { supabase } from 'src/lib/supabase';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { AvatarPreview } from 'src/components/ready-player-me/AvatarPreview';
import AnimationPicker from 'src/components/ready-player-me/animation-picker';

import { useProfile } from 'src/auth/hooks/use-profile';

const RPM_SUBDOMAIN_NAME = 'fantasy-staff';
const DEFAULT_RPM_AVATAR_URL = 'https://models.readyplayer.me/686f12b0f439768e54fa6bd6.glb';

const CATEGORIES = ['idle', 'dance', 'expression'];
const dummyAnimationLibrary = {
  masculine: {
    idle: ['M_Standing_Idle_001.glb', 'M_Standing_Idle_002.glb'],
    dance: ['M_Dances_001.glb', 'M_Dances_002.glb'],
    expression: ['M_Expressions_001.glb'],
  },
  feminine: {
    idle: ['F_Standing_Idle_001.glb', 'F_Standing_Idle_002.glb'],
    dance: ['F_Dances_001.glb', 'F_Dances_002.glb'],
    expression: ['F_Expressions_001.glb'],
  },
};

export default function Account3DAvatarPage() {
  const { profile, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const [localIframeLoading, setLocalIframeLoading] = useState(true);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [showAnimationPicker, setShowAnimationPicker] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_RPM_AVATAR_URL);
  const [cacheBuster, setCacheBuster] = useState(Date.now()); // NEW STATE for cache busting
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [error, setError] = useState('');

  const [rpmLoginToken, setRpmLoginToken] = useState(null);

  const [previewAnimationFileName, setPreviewAnimationFileName] = useState(null);
  const [previewCustomAnimationSettings, setPreviewCustomAnimationSettings] = useState({});

  const avatarId =
    avatarUrl !== DEFAULT_RPM_AVATAR_URL ? avatarUrl.split('/').pop().split('.')[0] : undefined;

  const getDefaultAnimation = useCallback(
    (genderKey, categoryKey) => dummyAnimationLibrary[genderKey]?.[categoryKey]?.[0] || '',
    []
  );

  // Effect to sync component state with profile data
  useEffect(() => {
    if (profile) {
      const newAvatarUrl = profile['3d_avatar_url'] || DEFAULT_RPM_AVATAR_URL;
      // Only update avatarUrl if it's genuinely different to avoid unnecessary re-renders
      if (newAvatarUrl !== avatarUrl) {
        setAvatarUrl(newAvatarUrl);
        // CRITICAL: Update cache buster when avatar URL changes to force a re-fetch
        setCacheBuster(Date.now());
      }

      const newRpmLoginToken = profile.rpm_login_token || null;
      if (newRpmLoginToken !== rpmLoginToken) {
        setRpmLoginToken(newRpmLoginToken);
      }

      const currentSettings = profile.custom_animation_settings || {};
      setPreviewCustomAnimationSettings(currentSettings);

      let defaultAnimToShow = null;
      if (currentSettings.idle) {
        defaultAnimToShow = currentSettings.idle;
      } else if (currentSettings.dance) {
        defaultAnimToShow = currentSettings.dance;
      } else if (currentSettings.expression) {
        defaultAnimToShow = currentSettings.expression;
      } else {
        const profileGender = currentSettings.gender || 'masculine';
        defaultAnimToShow = getDefaultAnimation(profileGender, 'idle');
      }
      setPreviewAnimationFileName(defaultAnimToShow);
    } else {
      setAvatarUrl(DEFAULT_RPM_AVATAR_URL);
      setRpmLoginToken(null);
      setPreviewCustomAnimationSettings({});
      setPreviewAnimationFileName(getDefaultAnimation('masculine', 'idle'));
      setCacheBuster(Date.now()); // Also reset cache buster if profile clears
    }
  }, [profile, avatarUrl, rpmLoginToken, getDefaultAnimation]);

  const saveAvatarUrlAndTokenToProfile = useCallback(
    async (url, token) => {
      if (!profile || !profile.id) {
        setError('User profile not found. Cannot save avatar URL/token.');
        toast.error('User profile not available. Please log in or wait for profile to load.');
        return;
      }
      setSavingAvatar(true);
      setError('');
      try {
        const updateData = { '3d_avatar_url': url };
        if (typeof token === 'string' && token.length > 0) {
          updateData.rpm_login_token = token;
        } else {
          updateData.rpm_login_token = null;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id);

        if (updateError) {
          throw updateError;
        }

        toast.success('3D Avatar saved successfully!');
        refetchProfile(); // This will trigger the useEffect above, which updates avatarUrl and cacheBuster
      } catch (err) {
        console.error('Error saving avatar URL/token:', err.message);
        setError(`Failed to save avatar: ${err.message}`);
        toast.error('Failed to save 3D Avatar.');
      } finally {
        setSavingAvatar(false);
      }
    },
    [profile, refetchProfile]
  );

  const handleOnAvatarExported = useCallback(
    (event) => {
      const exportedAvatarUrl = event.data.url;
      const exportedLoginToken =
        event.data.loginToken ||
        (exportedAvatarUrl ? exportedAvatarUrl.split('/').pop().split('.')[0] : null);

      if (exportedAvatarUrl) {
        // Here, RPM usually gives a new URL for a new avatar version,
        // but adding a cache buster explicitly on save ensures it.
        saveAvatarUrlAndTokenToProfile(exportedAvatarUrl, exportedLoginToken);
        setShowAvatarCreator(false);
      } else {
        console.warn('No avatar URL received from RPM export event.');
      }
    },
    [saveAvatarUrlAndTokenToProfile]
  );

  const avatarCreatorConfig = {
    clearCache: false, // This `clearCache` is for the RPM iFrame's internal cache, not our GLTF loader.
    bodyType: 'fullbody',
    quickStart: false,
    language: 'en',
    selectBodyType: true,
    portal: 'v1',
    login: 'guest',
    hideFaceTracking: true,
    hideDownloadReady: true,
  };

  useEffect(() => {
    let timer;
    if (showAvatarCreator) {
      setLocalIframeLoading(true);
      timer = setTimeout(() => {
        setLocalIframeLoading(false);
      }, 1000);
    } else {
      setLocalIframeLoading(false);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [showAvatarCreator]);

  const handleClearAvatar = async () => {
    if (!profile || !profile.id) {
      toast.error('User profile not found. Cannot clear avatar.');
      return;
    }
    setSavingAvatar(true);
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ '3d_avatar_url': null, rpm_login_token: null, custom_animation_settings: null })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(DEFAULT_RPM_AVATAR_URL);
      setRpmLoginToken(null);
      setPreviewCustomAnimationSettings({});
      setPreviewAnimationFileName(getDefaultAnimation('masculine', 'idle'));
      setCacheBuster(Date.now()); // Update cache buster on clear as well

      toast.success('3D Avatar cleared successfully!');
      refetchProfile();
      setShowAvatarCreator(false);
      setShowAnimationPicker(false);
    } catch (err) {
      console.error('Error clearing avatar:', err.message);
      setError(`Failed to clear avatar: ${err.message}`);
      toast.error('Failed to clear 3D Avatar.');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleOpenAvatarCreator = () => {
    setShowAvatarCreator(true);
    setShowAnimationPicker(false); // Ensure animation picker is closed
  };

  const handleBackToAvatarView = () => {
    setShowAvatarCreator(false);
  };

  const handleOpenAnimationPicker = () => {
    setShowAnimationPicker(true);
    setShowAvatarCreator(false); // Ensure avatar creator is closed
  };

  const handleCloseAnimationPicker = () => {
    setShowAnimationPicker(false);
  };

  const hasCustomAvatar = avatarUrl !== DEFAULT_RPM_AVATAR_URL;

  const hasCustomAnimationSettings =
    previewCustomAnimationSettings &&
    Object.keys(previewCustomAnimationSettings).some(
      (key) =>
        CATEGORIES.includes(key) &&
        previewCustomAnimationSettings[key] !== null &&
        previewCustomAnimationSettings[key] !== ''
    );

  // Construct the cache-busted URL to pass to AvatarPreview
  const cacheBustedAvatarUrl = avatarUrl ? `${avatarUrl}?v=${cacheBuster}` : null;

  return (
    <Box>
      {/* Conditional rendering for Avatar Display */}
      {!showAvatarCreator && !showAnimationPicker && (
        <Box sx={{ width: '100%', height: 300, mb: 3 }}>
          {profileLoading || !cacheBustedAvatarUrl ? ( // Use cacheBustedAvatarUrl here
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f0f0f0',
                borderRadius: 2,
              }}
            >
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 1 }}>
                Loading Avatar...
              </Typography>
            </Box>
          ) : (
            <AvatarPreview
              // Pass a unique key that changes whenever the avatar *might* have changed
              key={`${avatarUrl}-${cacheBuster}`} // Use both for a robust key
              avatarUrl={cacheBustedAvatarUrl} // Pass the cache-busted URL
              height={300}
            />
          )}
        </Box>
      )}

      <Card sx={{ p: 3, mb: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          {showAvatarCreator ? (
            <>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '600px',
                  border: '1px solid #ddd',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <IconButton
                  onClick={handleBackToAvatarView}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 2,
                    backgroundColor: 'background.paper',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  disabled={savingAvatar}
                >
                  <Iconify icon="mingcute:close-fill" />
                </IconButton>

                {(profileLoading || !profile || localIframeLoading) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      zIndex: 1,
                    }}
                  >
                    <CircularProgress />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {profileLoading || !profile
                        ? 'Loading user profile...'
                        : 'Loading avatar creator...'}
                    </Typography>
                  </Box>
                )}

                {profile && (
                  <AvatarCreator
                    key={rpmLoginToken || 'new-avatar-creator'} // This key handles RPM session changes
                    subdomain={RPM_SUBDOMAIN_NAME}
                    config={avatarCreatorConfig}
                    loginToken={rpmLoginToken || undefined}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    onAvatarExported={handleOnAvatarExported}
                    onLoaded={() => {
                      setLocalIframeLoading(false);
                      console.log('DEBUG: RPM AvatarCreator iframe reports loaded.');
                    }}
                  />
                )}
              </Box>
              <Alert severity="info">
                Your avatar will automatically save after you customize it in the Ready Player Me
                creator.
              </Alert>
            </>
          ) : (
            <>
              <Typography variant="body1">
                Manage your 3D avatar and select animations for preview below.
              </Typography>

              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleOpenAvatarCreator}
                  disabled={profileLoading || !profile || savingAvatar}
                >
                  {profileLoading ? 'Loading...' : 'Open Avatar Creator'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleClearAvatar}
                  disabled={savingAvatar || avatarUrl === DEFAULT_RPM_AVATAR_URL}
                >
                  {savingAvatar ? <CircularProgress size={20} /> : 'Clear Avatar'}
                </Button>

                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleOpenAnimationPicker}
                  disabled={profileLoading || !profile || savingAvatar || !hasCustomAvatar}
                >
                  Customize Animations
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </Card>

      {/* Conditional rendering for AnimationPicker */}
      {showAnimationPicker && (
        <Card sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Customize Avatar Animations</Typography>
            <IconButton onClick={handleCloseAnimationPicker} disabled={savingAvatar}>
              <Iconify icon="mingcute:close-fill" />
            </IconButton>
          </Stack>
          {/* Ensure AnimationPicker also receives the cache-busted URL for consistency */}
          <AnimationPicker rpmAvatarUrl={cacheBustedAvatarUrl} />
        </Card>
      )}
    </Box>
  );
}
