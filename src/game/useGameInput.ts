import React, { useEffect } from 'react';
import { initAudio } from './audio';
import * as engine from './engine';

interface MouseState {
  mx: number;
  my: number;
  clicked: boolean;
}

interface JoyState {
  on: boolean;
  bx: number;
  by: number;
  dx: number;
  dy: number;
  id: number;
}

export function useGameInput(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  keysRef: React.RefObject<Set<string>>,
  mouseRef: React.RefObject<MouseState>,
  joyRef: React.RefObject<JoyState>,
  rotatedRef: React.RefObject<boolean>,
  LW: number,
  LH: number,
  JR: number
) {
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      initAudio();
      keysRef.current?.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) || e.key === ' ') {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current?.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // DEBUG SHORTCUTS
    const handleDebugKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        engine.setDebug(!engine.debugInvincible, engine.debugSpeedMul);
        e.preventDefault();
      }
      if (e.key === 'F2') {
        engine.setDebug(engine.debugInvincible, engine.debugSpeedMul === 10 ? 1 : 10);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleDebugKey);

    // Mouse handlers
    const getCvCoords = (clientX: number, clientY: number) => {
      if (rotatedRef.current) {
        const screenW = Math.max(1, window.innerWidth);
        const screenH = Math.max(1, window.innerHeight);
        const fracX = Math.max(0, Math.min(1, clientY / screenH));
        const fracY = Math.max(0, Math.min(1, 1 - clientX / screenW));
        return { x: fracX * LW, y: fracY * LH };
      }
      const r = cv.getBoundingClientRect();
      const s = LW / r.width;
      return { x: (clientX - r.left) * s, y: (clientY - r.top) * s };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const coords = getCvCoords(e.clientX, e.clientY);
      if (mouseRef.current) {
        mouseRef.current.mx = coords.x;
        mouseRef.current.my = coords.y;
      }
    };

    const handleMouseClick = (e: MouseEvent) => {
      initAudio();
      const coords = getCvCoords(e.clientX, e.clientY);
      if (mouseRef.current) {
        mouseRef.current.mx = coords.x;
        mouseRef.current.my = coords.y;
        mouseRef.current.clicked = true;
      }
    };

    cv.addEventListener('mousemove', handleMouseMove);
    cv.addEventListener('click', handleMouseClick);

    // Touch joystick handlers
    const handleTouchStart = (e: TouchEvent) => {
      initAudio();
      e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const coords = getCvCoords(t.clientX, t.clientY);
        const tx = coords.x;
        const ty = coords.y;

        if (engine.phase !== 'playing' || tx >= LW * 0.55) {
          if (mouseRef.current) {
            mouseRef.current.mx = tx;
            mouseRef.current.my = ty;
            mouseRef.current.clicked = true;
          }
        } else if (joyRef.current && !joyRef.current.on) {
          joyRef.current.on = true;
          joyRef.current.id = t.identifier;
          joyRef.current.bx = tx;
          joyRef.current.by = ty;
          joyRef.current.dx = 0;
          joyRef.current.dy = 0;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (joyRef.current && t.identifier === joyRef.current.id) {
          const coords = getCvCoords(t.clientX, t.clientY);
          let dx = coords.x - joyRef.current.bx;
          let dy = coords.y - joyRef.current.by;
          const d = Math.hypot(dx, dy);
          if (d > JR) {
            dx = (dx / d) * JR;
            dy = (dy / d) * JR;
          }
          joyRef.current.dx = dx / JR;
          joyRef.current.dy = dy / JR;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (joyRef.current && t.identifier === joyRef.current.id) {
          joyRef.current.on = false;
          joyRef.current.dx = 0;
          joyRef.current.dy = 0;
        }
      }
    };

    cv.addEventListener('touchstart', handleTouchStart, { passive: false });
    cv.addEventListener('touchmove', handleTouchMove, { passive: false });
    cv.addEventListener('touchend', handleTouchEnd, { passive: false });

    // window blur handler to reset keys/joystick when focus is lost (e.g. alt-tab)
    const handleBlur = () => {
      keysRef.current?.clear();
      if (joyRef.current) {
        joyRef.current.on = false;
        joyRef.current.dx = 0;
        joyRef.current.dy = 0;
      }
    };
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleDebugKey);
      window.removeEventListener('blur', handleBlur);
      cv.removeEventListener('mousemove', handleMouseMove);
      cv.removeEventListener('click', handleMouseClick);
      cv.removeEventListener('touchstart', handleTouchStart);
      cv.removeEventListener('touchmove', handleTouchMove);
      cv.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canvasRef, keysRef, mouseRef, joyRef, rotatedRef, LW, LH, JR]);
}
