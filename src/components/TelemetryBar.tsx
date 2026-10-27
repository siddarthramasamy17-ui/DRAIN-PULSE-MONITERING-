/**
 * DRAIN PULSE - Telemetry Bar HUD
 * Real-time operational diagnostics and sensor telemetry
 */

import React from 'react';
import {
  Compass,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Wifi,
  Thermometer,
  Droplets,
  Route,
  ShieldAlert,
  Gauge
} from 'lucide-react';
import { TelemetryPoint, RoverMotionState, ObstacleData, WaterLevelData } from '../types/rover';

interface TelemetryBarProps {
  telemetry: TelemetryPoint;
  motion: RoverMotionState;
  obstacle: ObstacleData;
  waterData: WaterLevelData;
  rssi: number;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  telemetry,
  motion,
  obstacle,
  waterData,
  rssi,
}) => {
  // Battery calculation (3S LiPo: 10.5V empty, 12.6V 100%)
  const batVolts = telemetry.batteryVoltage;
  const batPercent = Math.min(100, Math.max(5, Math.round(((batVolts - 10.5) / (12.6 - 10.5)) * 100)));
  const isBatteryLow = batVolts < 11.1;

  // WiFi RSSI strength percentage (-90dBm to -40dBm)
  const wifiQuality = Math.min(100, Math.max(10, Math.round(((rssi + 90) / 50) * 100)));

  return (
    <div className="w-full bg-[#070a12] border-y border-slate-800/80 px-3 sm:px-6 py-2 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar font-mono text-xs">
        {/* Pipe Distance Odometer */}
        <div className="flex items-center gap-2 shrink-0">
          <Route className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase">Pipe Odometer</span>
            <span className="font-bold text-slate-200">
              {motion.distanceTraveled.toFixed(1)} <span className="text-slate-500 text-[10px]">m</span>
            </span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-slate-800 shrink-0" />

        {/* Water Level Telemetry */}
        <div className="flex items-center gap-2 shrink-0">
          <Droplets className={`w-4 h-4 ${waterData.status === 'critical' ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase">Water Depth</span>
            <span className={`font-bold ${waterData.status === 'critical' ? 'text-red-400' : 'text-cyan-300'}`}>
              {waterData.currentLevel.toFixed(1)} <span className="text-slate-500 text-[10px]">mm</span>
            </span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-slate-800 shrink-0" />

        {/* Ultrasonic Obstacle Distance */}
        <div className="flex items-center gap-2 shrink-0">
          <ShieldAlert className={`w-4 h-4 ${obstacle.distance < 25 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase">Obstacle Front</span>
            <span className={`font-bold ${obstacle.distance < 25 ? 'text-red-400' : obstacle.distance < 50 ? 'text-amber-400' : 'text-emerald-300'}`}>
              {obstacle.distance.toFixed(0)} <span className="text-slate-500 text-[10px]">cm</span>
            </span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-slate-800 shrink-0" />

        {/* Pipe Slope / Pitch Gradient */}
        <div className="flex items-center gap-2 shrink-0">
          <Compass className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase">Pipe Gradient</span>
            <span className="font-bold text-slate-200">
              {motion.inclinePitch > 0 ? `+${motion.inclinePitch.toFixed(1)}` : motion.inclinePitch.toFixed(1)}°
            </span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-slate-800 shrink-0" />

        {/* Rover Chassis Environment (Temp & Humidity) */}
        <div className="flex items-center gap-2 shrink-0">
          <Thermometer className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase">Chassis Temp/RH</span>
            <span className="font-bold text-slate-200">
              {telemetry.temp.toFixed(1)}°C <span className="text-slate-500 text-[10px]">/ {telemetry.humidity}%</span>
            </span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-slate-800 shrink-0" />

        {/* Battery 3S LiPo */}
        <div className="flex items-center gap-2 shrink-0">
          {isBatteryLow ? (
            <BatteryWarning className="w-4 h-4 text-red-400 animate-pulse" />
          ) : (
            <Battery className="w-4 h-4 text-emerald-400" />
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase">3S LiPo</span>
              <span className={`text-[10px] font-bold ${isBatteryLow ? 'text-red-400' : 'text-emerald-400'}`}>
                {batPercent}%
              </span>
            </div>
            <span className="font-bold text-slate-200">
              {batVolts.toFixed(2)} <span className="text-slate-500 text-[10px]">V</span>
            </span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-slate-800 shrink-0" />

        {/* WiFi Signal RSSI */}
        <div className="flex items-center gap-2 shrink-0">
          <Wifi className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase">WiFi RSSI</span>
            <span className="font-bold text-slate-200">
              {rssi} <span className="text-slate-500 text-[10px]">dBm</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
