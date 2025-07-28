// src/components/trivia-game/RPMAvatar.jsx
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import React, { useRef, useEffect, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';

export function RPMAvatar({ avatarUrl, currentAnimation, onAnimationEnd, position = [0, -1, 0] }) {
  const group = useRef();
  const { scene, animations } = useGLTF(avatarUrl);
  const { actions, mixer } = useAnimations(animations, group);

  const [animationActions, setAnimationActions] = useState({});

  useEffect(() => {
    const actionsMap = {};
    animations.forEach((clip) => {
      actionsMap[clip.name] = actions[clip.name];
    });
    setAnimationActions(actionsMap);

    if (actions['Idle']) {
      actions['Idle'].play();
    }

    const onFinished = (e) => {
      if (onAnimationEnd) {
        onAnimationEnd(e.action.clip.name);
      }
      if (e.action.loop === THREE.LoopOnce && actions['Idle']) {
        e.action.fadeOut(0.5);
        actions['Idle'].reset().fadeIn(0.5).play();
      }
    };
    mixer.addEventListener('finished', onFinished);

    return () => mixer.removeEventListener('finished', onFinished);
  }, [actions, animations, mixer, onAnimationEnd]);

  useEffect(() => {
    if (currentAnimation && animationActions[currentAnimation]) {
      const activeAction = animationActions[currentAnimation];

      Object.values(animationActions).forEach((action) => {
        if (action !== activeAction && action.isRunning()) {
          action.fadeOut(0.2);
        }
      });

      activeAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.2).play();

      if (
        currentAnimation === 'ThumbsUp' ||
        currentAnimation === 'Victory' ||
        currentAnimation === 'Clap'
      ) {
        activeAction.setLoop(THREE.LoopOnce, 1);
        activeAction.clampWhenFinished = true;
      } else {
        activeAction.setLoop(THREE.LoopRepeat);
      }
    }
  }, [currentAnimation, animationActions, actions]);

  useEffect(() => {
    if (group.current) {
      group.current.position.set(position[0], position[1], position[2]);
    }
  }, [position]);

  return <primitive object={scene} ref={group} scale={1} />;
}

// useGLTF.preload('YOUR_RPM_AVATAR_URL.glb');
