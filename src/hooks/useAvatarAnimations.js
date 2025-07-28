// // src/hooks/useAvatarAnimations.js
// import * as THREE from 'three';
// import { useRef, useEffect, useState, useCallback } from 'react';

// // Define animation clip names and paths here or pass them as arguments
// const DANCE_CLIP_NAME = 'F_Dances_001';
// const IDLE_CLIP_NAME = 'F_Standing_Idle_001';
// const FEMININE_DANCE_GLB_PATH = '/assets/3d_animations/feminine/dance/F_Dances_001.glb';
// const FEMININE_IDLE_GLB_PATH = '/assets/3d_animations/feminine/idle/F_Standing_Idle_001.glb';

// export function useAvatarAnimations(scene, animationFileNameProp) {
//   const mixer = useRef(null);
//   const actions = useRef({}); // To store clip actions (idle, dance, current active)
//   const [desiredAnimationClip, setDesiredAnimationClip] = useState(null);

//   const [idleClipLoaded, setIdleClipLoaded] = useState(false);
//   const [danceClipLoaded, setDanceClipLoaded] = useState(false);
//   const allClipsLoaded = idleClipLoaded && danceClipLoaded;

//   // --- Debugging Logs for Initial Hook State ---
//   useEffect(() => {
//     console.log(
//       '[useAvatarAnimations] Hook initialized. Initial animationFileNameProp:',
//       animationFileNameProp
//     );
//   }, [animationFileNameProp]); // Log when the prop changes

//   // Effect 1: Initialize mixer when scene is available, and clean it up
//   useEffect(() => {
//     let cleanupFunction = () => {};
//     if (scene) {
//       mixer.current = new THREE.AnimationMixer(scene);
//       console.log('[useAvatarAnimations] AnimationMixer initialized:', mixer.current); // Added log
//       cleanupFunction = () => {
//         if (mixer.current) {
//           mixer.current.stopAllAction();
//           mixer.current.uncacheRoot(scene);
//           console.log('[useAvatarAnimations] AnimationMixer cleaned up.'); // Added log
//         }
//       };
//     }
//     return cleanupFunction;
//   }, [scene]); // Re-run if scene object itself changes

//   // Callback for when the idle animation GLB finishes loading
//   const handleIdleLoaded = useCallback(
//     (clip) => {
//       console.log(
//         '[useAvatarAnimations] handleIdleLoaded called. Clip received:',
//         clip ? clip.name : 'null'
//       ); // Added log
//       if (clip && mixer.current) {
//         actions.current.idle = mixer.current.clipAction(clip);
//         actions.current.idle.setLoop(THREE.LoopRepeat);
//         setIdleClipLoaded(true);
//         console.log(
//           '[useAvatarAnimations] Idle clipAction created and idleClipLoaded set to true.'
//         ); // Added log
//       } else if (!mixer.current) {
//         console.warn(
//           '[useAvatarAnimations] Mixer not ready when idle clip loaded. Skipping clipAction creation.'
//         );
//       } else {
//         console.error('[useAvatarAnimations] handleIdleLoaded received null clip.'); // Added error log
//       }
//     },
//     [] // CRITICAL: Empty dependency array to make this callback stable
//   );

//   // Callback for when the dance animation GLB finishes loading
//   const handleDanceLoaded = useCallback(
//     (clip) => {
//       console.log(
//         '[useAvatarAnimations] handleDanceLoaded called. Clip received:',
//         clip ? clip.name : 'null'
//       ); // Added log
//       if (clip && mixer.current) {
//         actions.current.dance = mixer.current.clipAction(clip);
//         actions.current.dance.setLoop(THREE.LoopRepeat);
//         setDanceClipLoaded(true);
//         console.log(
//           '[useAvatarAnimations] Dance clipAction created and danceClipLoaded set to true.'
//         ); // Added log
//       } else if (!mixer.current) {
//         console.warn(
//           '[useAvatarAnimations] Mixer not ready when dance clip loaded. Skipping clipAction creation.'
//         );
//       } else {
//         console.error('[useAvatarAnimations] handleDanceLoaded received null clip.'); // Added error log
//       }
//     },
//     [] // CRITICAL: Empty dependency array to make this callback stable
//   );

//   // Effect 2: Determine which animation should be "desired" based on the prop
//   useEffect(() => {
//     console.log(
//       '[useAvatarAnimations] Effect [animationFileNameProp, allClipsLoaded] triggered.', // Added log
//       'animationFileNameProp:',
//       animationFileNameProp,
//       'idleClipLoaded:',
//       idleClipLoaded,
//       'danceClipLoaded:',
//       danceClipLoaded,
//       'allClipsLoaded:',
//       allClipsLoaded
//     );

//     if (!mixer.current) {
//       console.log(
//         '[useAvatarAnimations] Mixer not initialized yet. Cannot set desiredAnimationClip.'
//       );
//       return;
//     }

//     if (!allClipsLoaded) {
//       console.log('[useAvatarAnimations] Waiting for all clips to load before setting animation.'); // Added log
//       return;
//     }

//     // --- CRITICAL CHANGE: Adjust comparison for animationFileNameProp ---
//     const currentRequestedClipName = animationFileNameProp
//       ? animationFileNameProp.replace('.glb', '')
//       : '';

//     if (currentRequestedClipName === DANCE_CLIP_NAME) {
//       if (actions.current.dance) {
//         console.log('[useAvatarAnimations] Setting desiredAnimationClip to DANCE clip.'); // Added log
//         setDesiredAnimationClip(actions.current.dance.clip);
//       } else {
//         console.warn(
//           '[useAvatarAnimations] Dance requested, but dance clip not in actions.current. Defaulting to idle (should not happen if allClipsLoaded is true).'
//         );
//         if (actions.current.idle) {
//           setDesiredAnimationClip(actions.current.idle.clip);
//         }
//       }
//     } else {
//       // Covers "" or null, or any other value -> default to idle
//       if (actions.current.idle) {
//         console.log('[useAvatarAnimations] Setting desiredAnimationClip to IDLE clip.'); // Added log
//         setDesiredAnimationClip(actions.current.idle.clip);
//       } else {
//         console.warn(
//           '[useAvatarAnimations] No specific animation requested, but idle clip not in actions.current (should not happen if allClipsLoaded is true).'
//         );
//       }
//     }
//   }, [animationFileNameProp, idleClipLoaded, danceClipLoaded, mixer]); // Depend on individual states for clearer dependency tracking

//   // Effect 3: Play the desired animation (crossfading logic)
//   useEffect(() => {
//     console.log(
//       '[useAvatarAnimations] Effect [desiredAnimationClip] triggered.', // Added log
//       'desiredAnimationClip:',
//       desiredAnimationClip ? desiredAnimationClip.name : 'null/undefined'
//     );
//     if (!mixer.current || !desiredAnimationClip) {
//       console.log('[useAvatarAnimations] Mixer or desiredAnimationClip not ready for playback.'); // Added log
//       return;
//     }

//     const currentAction = actions.current.active;
//     let newAction;

//     try {
//       newAction = mixer.current.clipAction(desiredAnimationClip);
//     } catch (error) {
//       console.error(
//         '[useAvatarAnimations] Error creating clipAction for desiredAnimationClip:',
//         desiredAnimationClip,
//         error
//       );
//       return;
//     }

//     if (!newAction.clip) {
//       console.error('[useAvatarAnimations] newAction.clip is undefined after creating clipAction.'); // Added error log
//       return;
//     }

//     if (currentAction && currentAction.clip && currentAction.clip.name !== newAction.clip.name) {
//       console.log(
//         `[useAvatarAnimations] Crossfading from "${currentAction.clip.name}" to "${newAction.clip.name}"`
//       ); // Added log
//       currentAction.fadeOut(0.3);
//       newAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.3).play();
//     } else if (!currentAction || currentAction.paused) {
//       console.log(`[useAvatarAnimations] Playing animation "${newAction.clip.name}".`); // Added log
//       newAction.play();
//     }
//     actions.current.active = newAction;
//   }, [mixer, desiredAnimationClip]); // Re-run when desired clip changes (mixer is stable here)

//   // Return necessary values and callbacks for the component to use
//   return {
//     mixer: mixer.current, // Expose the mixer for useFrame in AvatarModel
//     handleIdleLoaded,
//     handleDanceLoaded,
//     FEMININE_IDLE_GLB_PATH, // Expose paths/names for AnimationLoader
//     FEMININE_DANCE_GLB_PATH,
//     IDLE_CLIP_NAME,
//     DANCE_CLIP_NAME,
//   };
// }
