/**
 * DRAIN PULSE - Main Header Navigation & Status Bar
 */

import React from 'react';
import {
  Cpu,
  FileSpreadsheet,
  Settings,
  Wifi,
  WifiOff,
  Droplets,
} from 'lucide-react';
import { ConnectionConfig, InspectionMetadata } from '../types/rover';

interface HeaderProps {
  connectionConfig: ConnectionConfig;
  inspectionMeta: InspectionMetadata;
  defectCount: number;
  onOpenSettings: () => void;
  onOpenDefectLog: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionConfig,
  inspectionMeta,
  defectCount,
  onOpenSettings,
  onOpenDefectLog,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#070b13]/95 backdrop-blur-md border-b border-cyan-500/20 px-3.5 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Project Name */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-900 to-slate-900 border border-cyan-400/40 shadow-lg glow-cyan">
            <Droplets className="w-5 h-5 text-cyan-300" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#070b13] animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-lg sm:text-xl tracking-wider text-white flex items-baseline gap-1.5">
                <span>DRAIN <span className="text-cyan-400">PULSE</span></span>
                <span className="text-[11px] font-mono font-medium text-slate-400 tracking-normal hidden sm:inline">MONITORING SYSTEM</span>
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                v2.4 ESP32
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
              <span>Storm Water Drainage Inspection Rover</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-semibold">{inspectionMeta.pipeId}</span>
            </p>
          </div>
        </div>

        {/* Middle Quick Telemetry Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">PIPE:</span>
            <span className="text-slate-200 font-medium">
              {inspectionMeta.pipeMaterial} Ø{inspectionMeta.pipeDiameterMm}mm
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">LOC:</span>
            <span className="text-slate-300 truncate max-w-[140px]">{inspectionMeta.location}</span>
          </div>
        </div>

        {/* Actions & Connection Status */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Connection state pill */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
              connectionConfig.mode === 'hardware'
                ? connectionConfig.status === 'connected'
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500/60 text-amber-300 animate-pulse'
                : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
            }`}
          >
            {connectionConfig.mode === 'hardware' ? (
              connectionConfig.status === 'connected' ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              )
            ) : (
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="font-semibold uppercase">
              {connectionConfig.mode === 'hardware'
                ? connectionConfig.status === 'connected'
                  ? 'ESP32 LIVE'
                  : 'CONNECTING'
                : 'SIMULATION'}
            </span>
            <span className="text-[10px] opacity-75">({connectionConfig.latency}ms)</span>
          </button>

          {/* Inspection Defect Log */}
          <button
            onClick={onOpenDefectLog}
            title="View Recorded Pipe Defects & Export Inspection Report"
            className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-mono transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Defect Log</span>
            {defectCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                {defectCount}
              </span>
            )}
          </button>

          {/* Connection Settings */}
          <button
            onClick={onOpenSettings}
            title="Open Connection & Rover Settings"
            className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
