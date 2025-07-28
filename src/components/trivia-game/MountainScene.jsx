// src/components/trivia-game/MountainScene.jsx
import * as THREE from 'three'; // Keep THREE import for types or direct use (e.g., Vector3)
// REMOVE Canvas from here. It's provided by TriviaGame.jsx
import { useFrame } from '@react-three/fiber'; // Keep useFrame, it's a hook used inside the Canvas
import { OrbitControls, Environment, Html } from '@react-three/drei';
import React, { Suspense, useRef, useEffect, useState, useMemo } from 'react'; // ADD useMemo for RPMAvatar

import { CircularProgress } from '@mui/material';

// Corrected import path for RPMAvatar
import { RPMAvatar } from './RPMAvatar';

// Placeholder for a simple mountain or loaded model
function MountainModel() {
  return (
    <mesh position={[0, -2, -5]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#8B4513" />
      {/* If you add a proper mountain GLB later, this text can be removed */}
      <Html position={[0, 0, 0.1]} center>
        <div
          style={{ color: 'white', fontSize: '24px', fontFamily: 'Arial', whiteSpace: 'nowrap' }}
        >
          ⛰️ Placeholder Mountain ⛰️
        </div>
      </Html>
    </mesh>
  );
}

// Wrap with React.memo for performance, as discussed
export const MountainScene = React.memo(function MountainScene({
  avatarUrl,
  currentAnimation,
  onAnimationEnd,
  characterPosition,
}) {
  const cameraRef = useRef(); // This ref won't directly control the main Canvas camera unless you pass it

  useFrame((state) => {
    // Basic camera follow or animation could go here
    // For now, OrbitControls will handle it, but for a guided climb,
    // you'd animate the camera to follow the character's progress.
    // If you uncomment OrbitControls in TriviaGame, this useFrame might conflict or be redundant.
    // If you want a controlled camera in MountainScene, you'd need to access the main camera
    // via state.camera and manipulate it.
    if (characterPosition) {
      // Example: Simple camera follow with some offset
      // If you implement a fixed camera, remove OrbitControls from TriviaGame
      // state.camera.position.lerp(new THREE.Vector3(characterPosition[0], characterPosition[1] + 1.5, characterPosition[2] + 2), 0.05);
      // state.camera.lookAt(characterPosition[0], characterPosition[1] + 0.5, characterPosition[2]);
    }
  });

  // Since RPMAvatar takes avatarUrl, memoize it here as well if RPMAvatar itself
  // is not memoized or if you want to be extra careful with object references.
  // (Assuming RPMAvatar also handles its internal state and memoization if needed)
  const memoizedAvatarUrl = useMemo(() => avatarUrl, [avatarUrl]);

  return (
    // Directly return the group of 3D objects, NOT another <Canvas>
    <group>
      {/* Lights - these lights will now apply to the single Canvas in TriviaGame */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
      <directionalLight position={[-5, -10, -7]} intensity={0.5} />

      <Suspense
        fallback={
          <Html center>
            <CircularProgress color="primary" />
          </Html>
        }
      >
        <Environment preset="sunset" background />

        <MountainModel />

        <RPMAvatar
          avatarUrl={memoizedAvatarUrl} // Pass the memoized URL
          currentAnimation={currentAnimation}
          onAnimationEnd={onAnimationEnd}
          position={characterPosition} // R3F props are often named `position` directly for vectors
        />

        {/* This seems to be the ground plane */}
        <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, -1.01, 0]}>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#A0522D" />
        </mesh>

        {/* OrbitControls should be placed in the *outer* Canvas (TriviaGame.jsx) if needed globally */}
        {/* If you want to control the camera via code (e.g., follow character), remove OrbitControls */}
        {/* You had it commented out, which is good if you plan to programmatically control the camera */}
        {/* <OrbitControls enableZoom enablePan enableRotate /> */}
      </Suspense>
    </group>
  );
});

// useGLTF.preload('/models/your_mountain_model.glb');
