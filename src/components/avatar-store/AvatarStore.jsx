import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import React, { useState, Suspense, useRef, useEffect } from 'react';

import { Box, Button, Typography, Grid, Paper, CircularProgress } from '@mui/material';

import animationLibrary from 'src/lib/animationLibrary';

const GENDERS = ['masculine', 'feminine'];
const CATEGORIES = ['idle', 'dance', 'expression', 'locomotion'];

const SUPABASE_BASE_URL =
  'https://lnimaqgvxfrougxjlhgo.supabase.co/storage/v1/object/public/3d-animations/';

// MODIFIED AnimationPreview to accept isPlaying prop and control playback
function AnimationPreview({ gender, category, animFile, isPlaying }) {
  // Added isPlaying prop
  const gltf = useGLTF(`${SUPABASE_BASE_URL}${gender}/${category}/${animFile}`);

  const mixer = useRef();
  const actions = useRef();
  const scene = gltf.scene;

  useEffect(() => {
    if (gltf.animations.length > 0) {
      if (!mixer.current) {
        // Initialize mixer only once
        mixer.current = new THREE.AnimationMixer(scene);
        actions.current = mixer.current.clipAction(gltf.animations[0]);
      }

      if (isPlaying) {
        actions.current.reset().fadeIn(0.5).play(); // Play if isPlaying is true
      } else {
        actions.current.fadeOut(0.5).stop(); // Stop if isPlaying is false
      }
    }
    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
        mixer.current.uncacheRoot(scene);
        mixer.current = null; // Clear mixer on unmount
        actions.current = null; // Clear action on unmount
      }
    };
  }, [gltf, scene, isPlaying]); // Added isPlaying to dependencies

  useFrame((state, delta) => {
    mixer.current?.update(delta);
  });

  // Note: Scale and position here are for the animation GLB, not an avatar.
  // Adjust as needed for better visibility of the animation itself.
  return <primitive object={scene} scale={0.5} position={[0, -1, 0]} />;
}

export default function AvatarStore({ onSelectAnimation }) {
  const [gender, setGender] = useState('masculine');
  const [category, setCategory] = useState('idle');
  const [selectedAnimation, setSelectedAnimation] = useState(null); // This is likely for a visual selected state
  const [playingPreview, setPlayingPreview] = useState(null); // New state to control playback

  const animations = animationLibrary[gender]?.[category] || []; // Added optional chaining for safety

  function handleAnimationClick(anim, event) {
    // Added event parameter
    if (event) {
      event.preventDefault(); // Prevent default action (e.g., form submission)
      event.stopPropagation(); // Stop event bubbling up
    }

    // Toggle play/pause for the clicked animation
    if (playingPreview === anim) {
      setPlayingPreview(null); // Stop playing if it's already playing
    } else {
      setPlayingPreview(anim); // Start playing this animation
    }

    // This part is for external selection (e.g., saving to user profile)
    setSelectedAnimation(anim);
    if (onSelectAnimation) onSelectAnimation({ gender, category, animationFile: anim });
  }

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Select Animation
      </Typography>

      {/* Gender selector */}
      <Box mb={2}>
        {GENDERS.map((g) => (
          <Button
            key={g}
            variant={gender === g ? 'contained' : 'outlined'}
            onClick={(event) => {
              // Capture event here
              event.preventDefault(); // Prevent default button submission
              event.stopPropagation(); // Stop event bubbling
              setGender(g);
              setPlayingPreview(null); // Stop any playing preview when changing gender/category
            }}
            sx={{ mr: 1, mb: 1, textTransform: 'capitalize' }}
          >
            {g}
          </Button>
        ))}
      </Box>

      {/* Category selector */}
      <Box mb={3}>
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={category === cat ? 'contained' : 'outlined'}
            onClick={(event) => {
              // Capture event here
              event.preventDefault(); // Prevent default button submission
              event.stopPropagation(); // Stop event bubbling
              setCategory(cat);
              setPlayingPreview(null); // Stop any playing preview when changing gender/category
            }}
            sx={{ mr: 1, mb: 1, textTransform: 'capitalize' }}
          >
            {cat}
          </Button>
        ))}
      </Box>

      {/* Animation grid */}
      <Grid container spacing={2}>
        {animations.length === 0 && (
          <Typography>No animations available for this category.</Typography>
        )}
        {animations.map((anim) => {
          const isSelected = anim === selectedAnimation;
          const isPlayingThisPreview = playingPreview === anim; // Check if THIS preview should be playing

          return (
            <Grid item key={anim} xs={6} sm={4} md={3} lg={2}>
              <Paper
                onClick={(event) => handleAnimationClick(anim, event)} // Pass event to handler
                sx={{
                  p: 1,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #1976d2' : '1px solid #ccc',
                  borderRadius: 1,
                  textAlign: 'center',
                  userSelect: 'none',
                  height: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
                elevation={isSelected ? 8 : 1}
              >
                <Typography
                  noWrap
                  variant="body2"
                  title={anim}
                  sx={{ mb: 1, fontWeight: isSelected ? 'bold' : 'normal' }}
                >
                  {anim}
                </Typography>

                <Box sx={{ flexGrow: 1 }}>
                  <Canvas
                    shadows={false}
                    camera={{ position: [0, 1, 2], fov: 30 }}
                    style={{ width: '100%', height: 140, borderRadius: 4 }}
                  >
                    <ambientLight intensity={0.7} />
                    <directionalLight position={[0, 5, 5]} intensity={1} />
                    <Suspense
                      fallback={
                        <Box
                          sx={{
                            width: '100%',
                            height: 140,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: '#f0f0f0',
                          }}
                        >
                          <CircularProgress size={24} />
                        </Box>
                      }
                    >
                      {/* Pass isPlaying prop to AnimationPreview */}
                      <AnimationPreview
                        gender={gender}
                        category={category}
                        animFile={anim}
                        isPlaying={isPlayingThisPreview}
                      />
                    </Suspense>
                    <OrbitControls enableZoom={false} enablePan={false} />
                  </Canvas>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
