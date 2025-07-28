import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber'; // Removed useFrame
import React, { Suspense, useEffect, useRef } from 'react';
import { OrbitControls, useGLTF, Html, Environment } from '@react-three/drei';

import { Box, CircularProgress, Typography } from '@mui/material';

function RpmAvatarModel({ url }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef(); // Ref to apply transformations directly to the primitive
  const { camera } = useThree(); // Access the camera instance

  useEffect(() => {
    if (scene) {
      // Clone the scene to prevent mutations across multiple instances if this component is re-used
      const clonedScene = scene.clone();

      // Ensure all meshes cast/receive shadows
      clonedScene.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      // Calculate the bounding box of the loaded model
      const box = new THREE.Box3().setFromObject(clonedScene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Adjust the model's position to place its base near y=0 (ground)
      const verticalOffset = -center.y + size.y / 2 + 0.1; // 0.1 is a small buffer
      clonedScene.position.set(-center.x, verticalOffset, -center.z);

      // Set scale relative to the model's height to ensure it fits well in the camera view.
      const idealHeightInScene = 1.8; // Target height in Three.js units
      const scaleFactor = idealHeightInScene / size.y;
      clonedScene.scale.set(scaleFactor, scaleFactor, scaleFactor);

      // Assign the transformed cloned scene to the ref
      if (modelRef.current) {
        // Clear existing children before adding the new scene
        while (modelRef.current.children.length > 0) {
          modelRef.current.remove(modelRef.current.children[0]);
        }
        modelRef.current.add(clonedScene);
      }
    }

    // Cleanup function: remove the scene from the ref when component unmounts or scene changes
    return () => {
      if (modelRef.current) {
        while (modelRef.current.children.length > 0) {
          modelRef.current.remove(modelRef.current.children[0]);
        }
      }
    };
  }, [scene, camera]);

  // Removed: useFrame(() => { if (modelRef.current) { modelRef.current.rotation.y += 0.005; } });
  // The avatar will no longer auto-rotate.

  // Render an empty group/object initially, and the cloned scene will be added via ref
  return <group ref={modelRef} />;
}

export function AvatarPreview({ avatarUrl, height = 300, width = '100%' }) {
  // Loader component for Suspense fallback
  const Loader = () => (
    <Html center>
      <CircularProgress />
      <Typography variant="body2" sx={{ mt: 1 }}>
        Loading Avatar...
      </Typography>
    </Html>
  );

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
          border: '1px dashed grey',
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
        border: '1px solid #ddd',
      }}
    >
      <Canvas
        flat
        shadows
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 1.4, 3.5], fov: 40 }}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Suspense fallback={<Loader />}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[0, 5, 5]} intensity={1} castShadow />
          <directionalLight position={[0, 5, -5]} intensity={0.5} />
          <pointLight position={[-5, 0, 5]} intensity={0.5} />

          <Environment preset="city" />

          <RpmAvatarModel url={avatarUrl} />

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            target={[0, 0.9, 0]}
            maxPolarAngle={Math.PI / 2 - 0.1}
            minPolarAngle={Math.PI / 3}
          />

          <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <shadowMaterial opacity={0.3} />
          </mesh>
        </Suspense>
      </Canvas>
    </Box>
  );
}
