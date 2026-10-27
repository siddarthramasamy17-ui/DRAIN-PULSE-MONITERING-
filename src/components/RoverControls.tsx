/**
 * DRAIN PULSE - Rover Movement & Gimbal Control Center
 * Industrial D-pad, keyboard shortcuts, throttle control, and camera pan/tilt
 */

import React, { useEffect, useCallback } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Octagon,
  Gauge,
  Compass,
  SlidersHorizontal,
  Keyboard,
  Camera,
  CornerUpLeft,
  CornerUpRight
} from 'lucide-react';
import { Direction, RoverMotionState, CameraState } from '../types/rover';
import { soundManager } from '../utils/audioAlerts';

interface RoverControlsProps {
  motion: RoverMotionState;
  camera: CameraState;
  onDriveCommand: (dir: Direction, speed: number) => void;
  onEmergencyStop: () => void;
  onUpdateSpeed: (speed: number) => void;
  onUpdateDriveMode: (mode: RoverMotionState['driveMode']) => void;
  onGimbalCommand: (pan: number, tilt: number) => void;
}

export const RoverControls: React.FC<RoverControlsProps> = ({
  motion,
  camera,
  onDriveCommand,
  onEmergencyStop,
  onUpdateSpeed,
  onUpdateDriveMode,
  onGimbalCommand,
}) => {
  // Handle continuous keyboard driving
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if typing in an input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      if (e.code === 'Space') {
        e.preventDefault();
        soundManager.playClick(400);
        onEmergencyStop();
        return;
      }

      if (key === 'w' || key === 'arrowup') {
        e.preventDefault();
        onDriveCommand('FORWARD', motion.speed);
      } else if (key === 's' || key === 'arrowdown') {
        e.preventDefault();
        onDriveCommand('REVERSE', motion.speed);
      } else if (key === 'a' || key === 'arrowleft') {
        e.preventDefault();
        onDriveCommand('PIVOT_LEFT', motion.speed);
      } else if (key === 'd' || key === 'arrowright') {
        e.preventDefault();
        onDriveCommand('PIVOT_RIGHT', motion.speed);
      } else if (key === 'q') {
        e.preventDefault();
        onGimbalCommand(Math.max(-90, camera.pan - 15), camera.tilt);
      } else if (key === 'e') {
        e.preventDefault();
        onGimbalCommand(Math.min(90, camera.pan + 15), camera.tilt);
      } else if (key === 'r') {
        e.preventDefault();
        onGimbalCommand(camera.pan, Math.min(45, camera.tilt + 15));
      } else if (key === 'f') {
        e.preventDefault();
        onGimbalCommand(camera.pan, Math.max(-45, camera.tilt - 15));
      }
    },
    [motion.speed, camera.pan, camera.tilt, onDriveCommand, onEmergencyStop, onGimbalCommand]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      const key = e.key.toLowerCase();
      if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        onDriveCommand('STOP', 0);
      }
    },
    [onDriveCommand]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const handleBtnPress = (dir: Direction) => {
    soundManager.playClick(600);
    onDriveCommand(dir, motion.speed);
  };

  const handleBtnRelease = () => {
    onDriveCommand('STOP', 0);
  };

  return (
    <div className="flex flex-col bg-[#0b0f19] border border-cyan-500/20 rounded-xl p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 glow-cyan">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base tracking-wide text-slate-100 uppercase">
              Rover Drive & Gimbal
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              PWM Motor Driver (L298N / TB6612FNG) + SG90 Servos
            </p>
          </div>
        </div>

        {/* Keyboard hints tooltip indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
          <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
          <span>W/A/S/D or Arrows • Space=E-STOP</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center my-3">
        {/* Directional Pad / Joystick (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 bg-[#080d16] border border-slate-800 rounded-2xl p-2 shadow-inner flex items-center justify-center select-none">
            {/* Center Stop / Status */}
            <div className="w-14 h-14 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col items-center justify-center text-center shadow">
              <span className="text-[9px] font-mono text-slate-500">STATE</span>
              <span
                className={`font-mono text-[10px] font-bold ${
                  motion.direction === 'STOP' ? 'text-slate-400' : 'text-cyan-400 animate-pulse'
                }`}
              >
                {motion.direction === 'PIVOT_LEFT'
                  ? 'PVT-L'
                  : motion.direction === 'PIVOT_RIGHT'
                  ? 'PVT-R'
                  : motion.direction}
              </span>
            </div>

            {/* FORWARD (W) */}
            <button
              onMouseDown={() => handleBtnPress('FORWARD')}
              onMouseUp={handleBtnRelease}
              onTouchStart={() => handleBtnPress('FORWARD')}
              onTouchEnd={handleBtnRelease}
              title="Drive Forward (Hold W / Up)"
              className={`absolute top-2 w-12 h-11 rounded-lg border font-mono font-bold flex flex-col items-center justify-center transition-all ${
                motion.direction === 'FORWARD'
                  ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 glow-cyan scale-95'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200 active:scale-95'
              }`}
            >
              <ArrowUp className="w-5 h-5 text-cyan-400" />
              <span className="text-[8px] text-slate-400">W</span>
            </button>

            {/* REVERSE (S) */}
            <button
              onMouseDown={() => handleBtnPress('REVERSE')}
              onMouseUp={handleBtnRelease}
              onTouchStart={() => handleBtnPress('REVERSE')}
              onTouchEnd={handleBtnRelease}
              title="Drive Reverse (Hold S / Down)"
              className={`absolute bottom-2 w-12 h-11 rounded-lg border font-mono font-bold flex flex-col items-center justify-center transition-all ${
                motion.direction === 'REVERSE'
                  ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 glow-cyan scale-95'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200 active:scale-95'
              }`}
            >
              <ArrowDown className="w-5 h-5 text-cyan-400" />
              <span className="text-[8px] text-slate-400">S</span>
            </button>

            {/* PIVOT LEFT (A) */}
            <button
              onMouseDown={() => handleBtnPress('PIVOT_LEFT')}
              onMouseUp={handleBtnRelease}
              onTouchStart={() => handleBtnPress('PIVOT_LEFT')}
              onTouchEnd={handleBtnRelease}
              title="Pivot Spin Left (Hold A / Left)"
              className={`absolute left-2 w-11 h-12 rounded-lg border font-mono font-bold flex flex-col items-center justify-center transition-all ${
                motion.direction === 'PIVOT_LEFT'
                  ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 glow-cyan scale-95'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200 active:scale-95'
              }`}
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span className="text-[8px] text-slate-400">A</span>
            </button>

            {/* PIVOT RIGHT (D) */}
            <button
              onMouseDown={() => handleBtnPress('PIVOT_RIGHT')}
              onMouseUp={handleBtnRelease}
              onTouchStart={() => handleBtnPress('PIVOT_RIGHT')}
              onTouchEnd={handleBtnRelease}
              title="Pivot Spin Right (Hold D / Right)"
              className={`absolute right-2 w-11 h-12 rounded-lg border font-mono font-bold flex flex-col items-center justify-center transition-all ${
                motion.direction === 'PIVOT_RIGHT'
                  ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 glow-cyan scale-95'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200 active:scale-95'
              }`}
            >
              <RotateCw className="w-4 h-4 text-cyan-400" />
              <span className="text-[8px] text-slate-400">D</span>
            </button>
          </div>

          {/* Big Prominent Emergency Stop Button */}
          <div className="mt-3 w-full max-w-[200px]">
            <button
              onClick={() => {
                soundManager.playClick(300);
                onEmergencyStop();
              }}
              title="EMERGENCY STOP - Disables all motor drive outputs immediately"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-lg glow-red transition-all border border-red-400"
            >
              <Octagon className="w-4 h-4 fill-white" />
              <span>E-STOP (SPACE)</span>
            </button>
          </div>
        </div>

        {/* Throttle & Drive Modes (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
          {/* Drive Mode Selector */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 block mb-1.5">
              Drive Torque Profile
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'crawl', label: 'Crawl', speed: 30, desc: 'High Torque' },
                  { id: 'normal', label: 'Inspect', speed: 60, desc: 'Standard' },
                  { id: 'turbo', label: 'Transit', speed: 95, desc: 'Max Speed' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    onUpdateDriveMode(mode.id);
                    onUpdateSpeed(mode.speed);
                  }}
                  className={`p-1.5 rounded text-center border font-mono text-xs transition-colors ${
                    motion.driveMode === mode.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="block font-semibold">{mode.label}</span>
                  <span className="text-[9px] text-slate-500 block">{mode.speed}%</span>
                </button>
              ))}
            </div>
          </div>

          {/* Speed Throttle Slider */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="flex justify-between items-center text-xs font-mono mb-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>Motor Throttle:</span>
              </span>
              <span className="text-cyan-300 font-bold font-mono">
                {motion.speed}%{' '}
                <span className="text-slate-500 text-[10px]">
                  (PWM {Math.round((motion.speed / 100) * 255)})
                </span>
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={motion.speed}
              onChange={(e) => onUpdateSpeed(Number(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Incline / Slope Gradient HUD */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 font-mono text-xs text-slate-300">
            <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
              <span>Pipe Fall / Slope Angle:</span>
              <span
                className={`font-bold ${
                  motion.inclinePitch < -1 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {motion.inclinePitch > 0 ? `+${motion.inclinePitch}°` : `${motion.inclinePitch}°`}
                <span className="text-[10px] text-slate-500 ml-1">
                  ({(Math.tan((motion.inclinePitch * Math.PI) / 180) * 100).toFixed(1)}% Grade)
                </span>
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              Drainage gravity standard: -1.0% to -2.0% downward slope.
            </div>
          </div>
        </div>

        {/* Camera Pan / Tilt Gimbal Hat Controls (3 cols) */}
        <div className="lg:col-span-3 flex flex-col justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Camera Gimbal</span>
            </span>
            <button
              onClick={() => onGimbalCommand(0, 0)}
              title="Center camera position"
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono border border-slate-700"
            >
              Reset 0°
            </button>
          </div>

          {/* Pan Slider */}
          <div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>Pan (Yaw):</span>
              <span className="text-cyan-300 font-semibold">{camera.pan > 0 ? `+${camera.pan}°` : `${camera.pan}°`}</span>
            </div>
            <input
              type="range"
              min={-90}
              max={90}
              step={5}
              value={camera.pan}
              onChange={(e) => onGimbalCommand(Number(e.target.value), camera.tilt)}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>-90° (Left)</span>
              <span>0° (Center)</span>
              <span>+90° (Right)</span>
            </div>
          </div>

          {/* Tilt Slider */}
          <div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>Tilt (Pitch):</span>
              <span className="text-cyan-300 font-semibold">{camera.tilt > 0 ? `+${camera.tilt}°` : `${camera.tilt}°`}</span>
            </div>
            <input
              type="range"
              min={-45}
              max={45}
              step={5}
              value={camera.tilt}
              onChange={(e) => onGimbalCommand(camera.pan, Number(e.target.value))}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>-45° (Water Bed)</span>
              <span>+45° (Pipe Crown)</span>
            </div>
          </div>

          {/* Nudge Buttons */}
          <div className="grid grid-cols-4 gap-1 pt-1">
            <button
              onClick={() => onGimbalCommand(Math.max(-90, camera.pan - 15), camera.tilt)}
              className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
            >
              Pan L
            </button>
            <button
              onClick={() => onGimbalCommand(Math.min(90, camera.pan + 15), camera.tilt)}
              className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
            >
              Pan R
            </button>
            <button
              onClick={() => onGimbalCommand(camera.pan, Math.min(45, camera.tilt + 15))}
              className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
            >
              Tilt Up
            </button>
            <button
              onClick={() => onGimbalCommand(camera.pan, Math.max(-45, camera.tilt - 15))}
              className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
            >
              Tilt Dn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
