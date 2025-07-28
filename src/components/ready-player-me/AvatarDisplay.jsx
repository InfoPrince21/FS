import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Html } from '@react-three/drei';
import React, { Suspense, useRef, useEffect, useState, useCallback, useMemo } from 'react';

import { Box, CircularProgress } from '@mui/material';

// --- Constants (if they were not already defined elsewhere and imported) ---
const SUPABASE_BASE_URL =
  'https://lnimaqgvxfrougxjlhgo.supabase.co/storage/v1/object/public/3d-animations/';

// AnimationLoader now accepts a cacheBuster prop
function AnimationLoader({ animationPath, clipName, onAnimationLoaded, cacheBuster }) {
  // Append cacheBuster to the animationPath
  const fullAnimationPath = cacheBuster ? `${animationPath}?v=${cacheBuster}` : animationPath;
  const { animations: loadedAnimations } = useGLTF(fullAnimationPath); // Use the cache-busted path

  useEffect(() => {
    if (loadedAnimations.length === 0) return;

    const foundClip = loadedAnimations.find((clip) => clip.name === clipName);

    if (foundClip) {
      console.log(`[AnimationLoader] Found clip "${clipName}" in ${fullAnimationPath}`);
      onAnimationLoaded(foundClip);
    } else {
      console.warn(
        `[AnimationLoader] Clip "${clipName}" not found. Available:`,
        loadedAnimations.map((a) => a.name)
      );
      onAnimationLoaded(null);
    }
  }, [loadedAnimations, fullAnimationPath, clipName, onAnimationLoaded]); // Depend on fullAnimationPath

  return null;
}

function AvatarModel({ url, animationFileName, customAnimationSettings }) {
  // The 'url' prop itself should already be cache-busted from AvatarDisplay's parent.
  // We still use useGLTF(url) directly, as the URL changes when the avatar updates.
  const { scene } = useGLTF(url);
  const mixer = useRef();
  const actions = useRef({});
  const animationClips = useRef({});
  const [desiredAnimationName, setDesiredAnimationName] = useState(null);

  // Parse clip names from URLs
  const idlePath = customAnimationSettings?.idle;
  const idleClipName = idlePath ? idlePath.split('/').pop().replace('.glb', '') : null;
  const dancePath = customAnimationSettings?.dance;
  const danceClipName = dancePath ? dancePath.split('/').pop().replace('.glb', '') : null;
  const expressionPath = customAnimationSettings?.expression;
  const expressionClipName = expressionPath
    ? expressionPath.split('/').pop().replace('.glb', '')
    : null;

  // Generate a cache buster for animations. This can be based on the avatar URL itself,
  // or a more specific timestamp if animation files are updated independently.
  // Using a hash of `customAnimationSettings` or a simple timestamp when settings change is effective.
  // A simple timestamp is sufficient if any of the animation settings *might* have changed.
  // Or, you could stringify customAnimationSettings and hash it, but a timestamp is simpler.
  const animationCacheBuster = useMemo(() => Date.now(), [customAnimationSettings]); // Regenerate when customAnimationSettings object changes

  // Setup mixer and clean on unmount
  useEffect(() => {
    if (scene) {
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      mixer.current = new THREE.AnimationMixer(scene);
    }
    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
        mixer.current.uncacheRoot(scene);
      }
    };
  }, [scene]);

  // Called by AnimationLoader when a clip loads
  const handleAnimationLoaded = useCallback(
    (clip, type) => {
      if (clip && mixer.current) {
        animationClips.current[type] = clip;
        // If no animationFileName is set, default to idle animation
        if (!animationFileName && type === 'idle') {
          setDesiredAnimationName('idle');
        }
      }
    },
    [animationFileName]
  );

  // When desiredAnimationName changes, crossfade to new animation
  useEffect(() => {
    if (!mixer.current || !desiredAnimationName) return;

    const clip = animationClips.current[desiredAnimationName];
    if (!clip) {
      console.warn(`[AvatarModel] No clip found for desired animation: ${desiredAnimationName}`);
      return;
    }

    const newAction = mixer.current.clipAction(clip);
    const currentAction = actions.current.active;

    if (currentAction && currentAction !== newAction) {
      currentAction.fadeOut(0.3);
      newAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.3).play();
    } else if (!currentAction || currentAction.paused) {
      newAction.play();
    }

    actions.current.active = newAction;
  }, [desiredAnimationName]);

  // When animationFileName changes, parse key and switch animation accordingly
  useEffect(() => {
    if (!animationFileName) {
      setDesiredAnimationName('idle');
      return;
    }
    const lowerName = animationFileName.toLowerCase();
    if (lowerName.includes('dance')) {
      setDesiredAnimationName('dance');
    } else if (lowerName.includes('expression')) {
      setDesiredAnimationName('expression');
    } else if (lowerName.includes('idle')) {
      setDesiredAnimationName('idle');
    } else {
      setDesiredAnimationName('idle'); // Default fallback
    }
  }, [animationFileName]);

  // Update mixer each frame
  useFrame((_, delta) => {
    mixer.current?.update(delta);
  });

  return (
    <>
      <primitive object={scene} scale={1.0} />
      <Suspense fallback={null}>
        {/* Pass the generated animationCacheBuster to AnimationLoader */}
        {idlePath && (
          <AnimationLoader
            animationPath={idlePath}
            clipName={idleClipName}
            onAnimationLoaded={(clip) => handleAnimationLoaded(clip, 'idle')}
            cacheBuster={animationCacheBuster}
          />
        )}
        {dancePath && (
          <AnimationLoader
            animationPath={dancePath}
            clipName={danceClipName}
            onAnimationLoaded={(clip) => handleAnimationLoaded(clip, 'dance')}
            cacheBuster={animationCacheBuster}
          />
        )}
        {expressionPath && (
          <AnimationLoader
            animationPath={expressionPath}
            clipName={expressionClipName}
            onAnimationLoaded={(clip) => handleAnimationLoaded(clip, 'expression')}
            cacheBuster={animationCacheBuster}
          />
        )}
      </Suspense>
    </>
  );
}

export function AvatarDisplay({
  avatarUrl, // This `avatarUrl` is expected to be cache-busted from its source
  animationFileName,
  customAnimationSettings,
  height = 400,
  width = '100%',
}) {
  if (!avatarUrl) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'transparent',
          borderRadius: 1,
          overflow: 'hidden',
          typography: 'body2',
          color: 'text.secondary',
        }}
      >
        No 3D avatar available.
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width,
        height,
        position: 'relative',
        bgcolor: 'transparent',
        borderRadius: 1,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Canvas
        flat
        shadows
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 1.6, 2.5], fov: 50 }}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Suspense
          fallback={
            <Html center>
              <CircularProgress />
            </Html>
          }
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[0, 5, 5]} intensity={1} castShadow />
          <pointLight position={[-5, 0, 5]} intensity={0.5} />

          {/* Key on AvatarModel to force re-mount and re-fetch if avatarUrl changes. */}
          {/* customAnimationSettings is also a dependency to ensure new animations are loaded */}
          <AvatarModel
            key={`${avatarUrl}-${JSON.stringify(customAnimationSettings)}`}
            url={avatarUrl}
            animationFileName={animationFileName}
            customAnimationSettings={customAnimationSettings}
          />
          <OrbitControls target={[0, 0.8, 0]} />
        </Suspense>
      </Canvas>
    </Box>
  );
}
