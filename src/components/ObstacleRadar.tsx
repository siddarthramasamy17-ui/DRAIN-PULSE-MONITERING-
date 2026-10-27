/**
 * DRAIN PULSE - Ultrasonic Obstacle Detection & Proximity Radar
 * Visualizes front collision radar, proximity hazard zones, and automated collision avoidance
 */

import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Radio,
  Volume2,
  VolumeX,
  AlertOctagon,
  RefreshCw,
  Gauge
} from 'lucide-react';
import { ObstacleData } from '../types/rover';
import { soundManager } from '../utils/audioAlerts';
import { esp32Service } from '../services/esp32Service';

interface ObstacleRadarProps {
  obstacle: ObstacleData;
  autoBrakeEnabled: boolean;
  onToggleAutoBrake: (enabled: boolean) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const ObstacleRadar: React.FC<ObstacleRadarProps> = ({
  obstacle,
  autoBrakeEnabled,
  onToggleAutoBrake,
  soundEnabled,
  onToggleSound,
}) => {
  const [selectedPresetDist, setSelectedPresetDist] = useState<number | null>(null);

  // Status badge styling
  const isDanger = obstacle.distance < 25;
  const isCaution = obstacle.distance >= 25 && obstacle.distance < 60;
  const isSafe = obstacle.distance >= 60;

  const statusColor = isDanger
    ? 'text-red-400 bg-red-950/80 border-red-500/80'
    : isCaution
    ? 'text-amber-400 bg-amber-950/80 border-amber-500/80'
    : 'text-emerald-400 bg-emerald-950/80 border-emerald-500/80';

  const statusLabel = isDanger
    ? 'COLLISION HAZARD'
    : isCaution
    ? 'APPROACHING OBSTACLE'
    : 'PATH CLEAR';

  const handlePresetObstacle = (cm: number) => {
    setSelectedPresetDist(cm);
    esp32Service.resetSimulatedObstacle(cm);
    setTimeout(() => setSelectedPresetDist(null), 1000);
  };

  // Radar geometry calculations
  // Radar is 180 degree semi-circle facing forward
  const maxRadarCm = 150;
  const clampedDist = Math.min(maxRadarCm, Math.max(10, obstacle.distance));
  const normalizedDistance = clampedDist / maxRadarCm; // 0 to 1
  
  // Angle roughly forward with slight jitter or center 90 deg
  const obstacleAngleDeg = obstacle.angle ?? 90; // 90 is straight ahead
  const rad = (obstacleAngleDeg * Math.PI) / 180;
  const radarRadius = 75; // px in visualizer
  const obstaclePlotX = 90 + Math.cos(rad) * (normalizedDistance * radarRadius);
  const obstaclePlotY = 85 - Math.sin(rad) * (normalizedDistance * radarRadius);

  return (
    <div className="flex flex-col bg-[#0b0f19] border border-cyan-500/20 rounded-xl p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-lg border ${
              isDanger
                ? 'bg-red-950/80 border-red-500/80 text-red-400 glow-red animate-pulse'
                : isCaution
                ? 'bg-amber-950/80 border-amber-500/80 text-amber-400 glow-amber'
                : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400 glow-emerald'
            }`}
          >
            {isDanger ? (
              <ShieldAlert className="w-5 h-5" />
            ) : isCaution ? (
              <Shield className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="font-display font-bold text-base tracking-wide text-slate-100 uppercase">
              Obstacle Sonar Radar
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Ultrasonic Transducer (HC-SR04 / JSN-SR04T)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Sonar Pings & Alarms' : 'Enable Sonar Pings & Alarms'}
            className={`p-1.5 rounded transition-colors ${
              soundEnabled
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800/80 text-slate-500 border border-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Auto Brake Toggle */}
          <button
            onClick={() => onToggleAutoBrake(!autoBrakeEnabled)}
            title="Toggle Automatic Emergency Brake Assist"
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors border ${
              autoBrakeEnabled
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Auto-Brake: {autoBrakeEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Main Radar View & Readings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center my-3">
        {/* Semi-circular Radar Visualizer (5 cols) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-[180px] h-[95px] overflow-hidden select-none">
            {/* Radar Background arcs */}
            <svg viewBox="0 0 180 90" className="w-full h-full">
              {/* Outer boundary arc */}
              <path
                d="M 10 85 A 75 75 0 0 1 170 85"
                fill="none"
                stroke="#1e293b"
                strokeWidth="1.5"
              />
              {/* 100cm arc */}
              <path
                d="M 35 85 A 50 50 0 0 1 145 85"
                fill="none"
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* 50cm caution arc */}
              <path
                d="M 60 85 A 25 25 0 0 1 120 85"
                fill="none"
                stroke="#d97706"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                opacity="0.6"
              />
              {/* 20cm danger arc */}
              <path
                d="M 75 85 A 10 10 0 0 1 105 85"
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.4"
                opacity="0.8"
              />

              {/* Radial bearing lines */}
              <line x1="90" y1="85" x2="90" y2="10" stroke="#334155" strokeWidth="1" />
              <line x1="90" y1="85" x2="35" y2="30" stroke="#1e293b" strokeWidth="0.8" />
              <line x1="90" y1="85" x2="145" y2="30" stroke="#1e293b" strokeWidth="0.8" />

              {/* Sweeping Radar Scanner Line */}
              <g className="origin-[90px_85px] radar-sweep-anim">
                <line x1="90" y1="85" x2="90" y2="10" stroke="#06b6d4" strokeWidth="2" strokeOpacity="0.8" />
                <path d="M 90 85 L 60 15 A 75 75 0 0 1 90 10 Z" fill="rgba(6, 182, 212, 0.15)" />
              </g>

              {/* Rover Origin Marker */}
              <circle cx="90" cy="85" r="4" fill="#06b6d4" />
              <polygon points="90,77 86,84 94,84" fill="#38bdf8" />

              {/* Detected Obstacle Blip */}
              <g transform={`translate(${obstaclePlotX}, ${obstaclePlotY})`}>
                <circle
                  r={isDanger ? 6 : 4.5}
                  fill={isDanger ? '#ef4444' : isCaution ? '#f59e0b' : '#10b981'}
                  className={isDanger ? 'animate-ping' : ''}
                />
                <circle
                  r={isDanger ? 4 : 3}
                  fill={isDanger ? '#ef4444' : isCaution ? '#f59e0b' : '#10b981'}
                />
              </g>
            </svg>

            {/* Radar arc legend labels */}
            <span className="absolute bottom-0 left-2 text-[9px] font-mono text-slate-500">150cm</span>
            <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-cyan-400">FRONT</span>
            <span className="absolute bottom-0 right-2 text-[9px] font-mono text-slate-500">150cm</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-1">180° Forward Beam</span>
        </div>

        {/* Distance Metrics & Hazard State (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-3">
          {/* Large Distance Readout */}
          <div className="flex items-baseline justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div>
              <span className="text-[11px] font-mono text-slate-400 block">Distance to Obstacle</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className={`font-mono font-bold text-3xl tracking-tight ${
                    isDanger
                      ? 'text-red-400 glow-red'
                      : isCaution
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {obstacle.distance.toFixed(1)}
                </span>
                <span className="text-sm font-mono text-slate-400">cm</span>
                <span className="text-xs font-mono text-slate-500 ml-2">
                  ({(obstacle.distance / 100).toFixed(2)}m)
                </span>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-block px-2.5 py-1 rounded text-[11px] font-mono font-bold border tracking-wider ${statusColor}`}
              >
                {statusLabel}
              </span>
              {obstacle.autoBraked && (
                <span className="block mt-1 text-[10px] font-mono text-red-400 font-bold animate-pulse">
                  ⚠ AUTO-BRAKE ENGAGED
                </span>
              )}
            </div>
          </div>

          {/* Proximity Distance Bar */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>0 cm</span>
              <span className="text-red-400">20cm Danger</span>
              <span className="text-amber-400">50cm Caution</span>
              <span className="text-emerald-400">&gt;150cm Clear</span>
            </div>
            <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex">
              <div className="w-[15%] h-full bg-red-950/70 border-r border-red-500/40" />
              <div className="w-[25%] h-full bg-amber-950/50 border-r border-amber-500/40" />
              <div className="flex-1 h-full bg-emerald-950/40" />

              {/* Marker pin */}
              <div
                className={`absolute top-0 bottom-0 w-2 -ml-1 rounded transition-all duration-200 ${
                  isDanger
                    ? 'bg-red-400 shadow-[0_0_10px_#ef4444]'
                    : isCaution
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{
                  left: `${Math.min(100, Math.max(3, (obstacle.distance / maxRadarCm) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* Quick Obstacle Test Presets (Allows user to immediately test auto-brake and radar) */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
            <span className="text-[11px] text-slate-500">Test Obstacle Distance:</span>
            <div className="flex items-center gap-1.5">
              {[15, 35, 75, 120].map((dist) => (
                <button
                  key={dist}
                  onClick={() => handlePresetObstacle(dist)}
                  className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                    dist <= 20
                      ? 'bg-red-950/50 hover:bg-red-900/60 border-red-500/40 text-red-300'
                      : dist <= 50
                      ? 'bg-amber-950/50 hover:bg-amber-900/60 border-amber-500/40 text-amber-300'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {dist}cm
                </button>
              ))}
              <button
                onClick={() => esp32Service.resetSimulatedObstacle(140)}
                title="Reset obstacle path to clear"
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
