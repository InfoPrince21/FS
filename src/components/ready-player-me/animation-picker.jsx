import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useGLTF, OrbitControls, useAnimations } from '@react-three/drei';

import {
  Box,
  Typography,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
} from '@mui/material';

import animationLibrary from 'src/lib/animationLibrary';

import { useProfile } from 'src/auth/hooks/use-profile';

const SUPABASE_BASE_URL =
  'https://lnimaqgvxfrougxjlhgo.supabase.co/storage/v1/object/public/3d-animations/';
const DEFAULT_RPM_AVATAR_URL = 'https://models.readyplayer.me/686f12b0f439768e54fa6bd6.glb';

function AnimationPreview({ gender, category, animFile, rpmAvatarUrl, isPlaying }) {
  // Construct animation URL with a cache buster, though for static files this might be less critical.
  // We'll add it for consistency, in case animFile content changes without filename changing.
  const animationUrl = `${SUPABASE_BASE_URL}${gender}/${category}/${animFile}`;

  // Ensure useGLTF for avatar re-fetches when URL changes by using the provided rpmAvatarUrl directly.
  // The rpmAvatarUrl passed from the parent (`Account3DAvatarPage`) is already cache-busted.
  const avatarGltf = useGLTF(rpmAvatarUrl);

  // Ensure useGLTF for animation re-fetches when URL changes by using a key for the animation component
  // This is good practice for the animation GLTF itself.
  const animationGltf = useGLTF(animationUrl);

  const group = useRef();
  const { actions } = useAnimations(animationGltf.animations, avatarGltf.scene);

  useEffect(() => {
    // Stop all previous actions when props change or component re-renders
    Object.values(actions).forEach((action) => action.stop());

    if (isPlaying && animationGltf.animations.length > 0) {
      const clipName = animationGltf.animations[0].name;
      const action = actions[clipName];
      if (action) {
        action.reset().fadeIn(0.5).play();
      }
    } else if (!isPlaying) {
      Object.values(actions).forEach((action) => action.fadeOut(0.5).stop());
    }

    // Cleanup function: stop actions when the component unmounts or dependencies change
    return () => {
      Object.values(actions).forEach((action) => action.fadeOut(0.5).stop());
    };
  }, [animationGltf, actions, isPlaying]);

  // Dynamic positioning for the avatar to ensure it's always visible
  useEffect(() => {
    if (avatarGltf.scene && group.current) {
      const box = new THREE.Box3().setFromObject(avatarGltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const verticalOffset = -center.y + size.y / 2 + 0.1; // Add a small buffer
      avatarGltf.scene.position.set(-center.x, verticalOffset, -center.z);

      const idealHeightInScene = 1.8; // e.g., 1.8 meters for RPM avatars
      const scaleFactor = idealHeightInScene / size.y;
      avatarGltf.scene.scale.set(scaleFactor, scaleFactor, scaleFactor);

      // Add the transformed scene to the group if not already added
      if (group.current.children[0] !== avatarGltf.scene) {
        while (group.current.children.length > 0) {
          group.current.remove(group.current.children[0]);
        }
        group.current.add(avatarGltf.scene);
      }
    }
  }, [avatarGltf.scene]);

  return (
    <group ref={group}>{/* The avatar GLTF scene is added to the group via useEffect */}</group>
  );
}

const GENDERS = ['masculine', 'feminine'];
const CATEGORIES = ['idle', 'dance', 'expression'];

// This component now accepts rpmAvatarUrl as a prop from its parent
export default function AnimationPicker({ rpmAvatarUrl: propRpmAvatarUrl }) {
  // Accept prop
  const { profile, loading, error, refetch, updateAnimationSettings } = useProfile();

  const [gender, setGender] = useState('masculine');
  const [selectedAnimations, setSelectedAnimations] = useState({});
  const [savedAnimations, setSavedAnimations] = useState({});
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState(null);
  // Remove local rpmAvatarUrl state; rely on prop primarily, with fallback to default if prop is null/undefined
  const [currentCategory, setCurrentCategory] = useState('idle');

  // Use a derived state for the effective rpmAvatarUrl
  const effectiveRpmAvatarUrl = propRpmAvatarUrl || DEFAULT_RPM_AVATAR_URL;

  useEffect(() => {
    if (profile) {
      if (profile.custom_animation_settings) {
        setSelectedAnimations(profile.custom_animation_settings);
        setSavedAnimations(profile.custom_animation_settings);
        setGender(profile.custom_animation_settings.gender || 'masculine');
      }
    }
  }, [profile]);

  useEffect(() => {
    // When gender changes, reset selected animations to current saved ones for the new gender
    const newSelected = {};
    if (profile?.custom_animation_settings?.gender === gender) {
      Object.keys(CATEGORIES).forEach((cat) => {
        if (profile.custom_animation_settings[cat]) {
          newSelected[cat] = profile.custom_animation_settings[cat];
        }
      });
    }
    setSelectedAnimations(newSelected);
  }, [gender, profile]);

  const animations = animationLibrary[gender]?.[currentCategory] || [];

  const handleAnimationSelect = (category, animationFile) => {
    setSelectedAnimations((prev) => ({
      ...prev,
      [category]: animationFile,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setLocalError(null);

    const newSettings = {
      gender,
      ...CATEGORIES.reduce((acc, cat) => {
        if (selectedAnimations[cat]) {
          acc[cat] = selectedAnimations[cat];
        }
        return acc;
      }, {}),
    };

    try {
      const success = await updateAnimationSettings(newSettings);
      if (!success) throw new Error('Failed to save animation selection');
      await refetch();
    } catch (err) {
      setLocalError(err.message || 'Error saving animation selection');
    } finally {
      setSaving(false);
    }
  };

  // Only check profileLoading and if effectiveRpmAvatarUrl is available
  if (loading || !effectiveRpmAvatarUrl) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography>Loading profile and avatar...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error loading profile: {error}</Typography>
      </Box>
    );
  }

  const selectedAnimation = selectedAnimations[currentCategory] || '';

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3}>
        Select Animations Per Category
      </Typography>

      <Box sx={{ width: '100%', height: 300, mb: 3 }}>
        <Suspense
          fallback={
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f0f0f0',
              }}
            >
              <CircularProgress />
            </Box>
          }
        >
          <Canvas
            shadows={false}
            camera={{ position: [0, 1.2, 4], fov: 50 }}
            style={{ width: '100%', height: '100%', borderRadius: 8 }}
          >
            <ambientLight intensity={0.7} />
            <directionalLight position={[0, 5, 5]} intensity={1} />
            {/* The key here is essential for forcing AnimationPreview to re-mount and re-fetch */}
            {effectiveRpmAvatarUrl && selectedAnimation && (
              <AnimationPreview
                key={`${effectiveRpmAvatarUrl}-${gender}-${currentCategory}-${selectedAnimation}`}
                gender={gender}
                category={currentCategory}
                animFile={selectedAnimation}
                rpmAvatarUrl={effectiveRpmAvatarUrl} // Pass the effective, cache-busted URL
                isPlaying
              />
            )}
            <OrbitControls enableZoom={false} enablePan={false} target={[0, 0.8, 0]} />
          </Canvas>
        </Suspense>
      </Box>

      {/* Gender Buttons */}
      <Box mb={2}>
        {GENDERS.map((g) => (
          <Button
            key={g}
            variant={gender === g ? 'contained' : 'outlined'}
            onClick={() => {
              setGender(g);
            }}
            sx={{ mr: 1, mb: 1, textTransform: 'capitalize' }}
            disabled={saving}
          >
            {g}
          </Button>
        ))}
      </Box>

      {/* Category Buttons */}
      <Box mb={2}>
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={currentCategory === cat ? 'contained' : 'outlined'}
            onClick={() => setCurrentCategory(cat)}
            sx={{ mr: 1, mb: 1, textTransform: 'capitalize' }}
            disabled={saving}
          >
            {cat}
          </Button>
        ))}
      </Box>

      {localError && (
        <Typography color="error" mb={2}>
          {localError}
        </Typography>
      )}

      {/* Dropdown */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="animation-select-label">Select Animation</InputLabel>
        <Select
          labelId="animation-select-label"
          value={selectedAnimation}
          onChange={(e) => handleAnimationSelect(currentCategory, e.target.value)}
          disabled={animations.length === 0 || saving}
          label="Select Animation"
        >
          {animations.map((anim) => (
            <MenuItem key={anim} value={anim}>
              {anim}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Display Saved Animations */}
      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <Typography variant="h6" gutterBottom>
            Currently Saved Animations ({savedAnimations.gender || 'N/A'})
          </Typography>
          {Object.keys(CATEGORIES).length > 0 ? (
            <Box>
              {CATEGORIES.map((cat) => (
                <Typography key={cat} variant="body2" sx={{ mb: 0.5 }}>
                  <Typography component="span" fontWeight="bold">
                    {cat}:
                  </Typography>{' '}
                  {savedAnimations[cat] || 'Not set'}
                </Typography>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No animations saved yet for any category.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Box textAlign="center" mt={3}>
        <Button variant="contained" color="primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save All Animations'}
        </Button>
      </Box>
    </Box>
  );
}
