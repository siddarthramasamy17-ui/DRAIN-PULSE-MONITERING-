/**
 * DRAIN PULSE - ESP32-CAM Visual Feed Component
 * Displays live MJPEG stream from hardware ESP32-CAM or interactive simulated storm drain interior
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  Flashlight,
  Eye,
  Maximize2,
  Minimize2,
  Crosshair,
  CircleDot,
  Radio,
  Sliders,
  AlertTriangle,
  Download,
  BookmarkPlus,
  RefreshCw,
  Sun,
  Layers
} from 'lucide-react';
import { CameraState, ConnectionConfig, DefectItem, Direction } from '../types/rover';

interface CameraFeedProps {
  cameraState: CameraState;
  onUpdateCamera: (updates: Partial<CameraState>) => void;
  connectionConfig: ConnectionConfig;
  waterLevel: number;
  ultrasonicDistance: number;
  distanceTraveled: number;
  inclinePitch: number;
  direction: Direction;
  speed: number;
  onAddDefect: (defect: Omit<DefectItem, 'id' | 'timestamp'>) => void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  cameraState,
  onUpdateCamera,
  connectionConfig,
  waterLevel,
  ultrasonicDistance,
  distanceTraveled,
  inclinePitch,
  direction,
  speed,
  onAddDefect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [recordSeconds, setRecordSeconds] = useState(148);
  const [hudVisible, setHudVisible] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [defectModalOpen, setDefectModalOpen] = useState(false);
  const [selectedDefectType, setSelectedDefectType] = useState<DefectItem['type']>('CRACK');
  const [defectNotes, setDefectNotes] = useState('');
  const [defectSeverity, setDefectSeverity] = useState<DefectItem['severity']>('medium');

  // Pipe visual simulation animation state
  const animFrameRef = useRef<number | null>(null);
  const pipeTextureOffset = useRef(0);
  const waterWavePhase = useRef(0);

  // Recording timer
  useEffect(() => {
    let timer: number | null = null;
    if (isRecording) {
      timer = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Snapshot capture
  const captureSnapshot = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Auto download
    const link = document.createElement('a');
    link.download = `drainpulse-snap-${Date.now()}-${distanceTraveled.toFixed(1)}m.jpg`;
    link.href = dataUrl;
    link.click();
    showToast(`Snapshot captured at ${distanceTraveled.toFixed(1)}m!`);
  }, [distanceTraveled]);

  // Open defect tagger
  const handleOpenDefectDialog = () => {
    setDefectModalOpen(true);
  };

  const handleSaveDefect = () => {
    let snapshotUrl: string | undefined = undefined;
    if (canvasRef.current) {
      snapshotUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
    }
    onAddDefect({
      distance: distanceTraveled,
      type: selectedDefectType,
      severity: defectSeverity,
      notes: defectNotes || `${selectedDefectType} noted during visual pass`,
      waterDepthMm: waterLevel,
      snapshotUrl,
    });
    setDefectModalOpen(false);
    setDefectNotes('');
    showToast(`Tagged ${selectedDefectType} in Inspection Log!`);
  };

  // Canvas pipe simulator render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;

      // Update movement offset based on rover speed & direction
      const moveDelta = direction === 'FORWARD' ? (speed / 100) * 2.2 : direction === 'REVERSE' ? -(speed / 100) * 1.5 : 0;
      pipeTextureOffset.current = (pipeTextureOffset.current + moveDelta) % 80;
      waterWavePhase.current += 0.05;

      // Gimbal offsets
      const panOffset = (cameraState.pan / 90) * (width * 0.28);
      const tiltOffset = (cameraState.tilt / 45) * (height * 0.25);
      const centerX = width / 2 + panOffset;
      const centerY = height / 2 + tiltOffset;

      // Background - Dark tunnel void
      ctx.fillStyle = '#05070c';
      ctx.fillRect(0, 0, width, height);

      // Light beam cone based on torch brightness
      const torchIntensity = cameraState.torchBrightness / 100;
      const lightGrad = ctx.createRadialGradient(
        centerX, centerY, 10,
        centerX, centerY, Math.max(width, height) * 0.8
      );
      
      if (cameraState.nightVision) {
        // Night vision phosphor green or monochrome
        lightGrad.addColorStop(0, `rgba(40, 220, 90, ${0.45 + torchIntensity * 0.45})`);
        lightGrad.addColorStop(0.5, `rgba(15, 90, 40, ${0.25 + torchIntensity * 0.3})`);
        lightGrad.addColorStop(1, 'rgba(3, 15, 6, 0.95)');
      } else {
        // High CRI Inspection Torch Light
        lightGrad.addColorStop(0, `rgba(240, 245, 255, ${0.35 + torchIntensity * 0.55})`);
        lightGrad.addColorStop(0.4, `rgba(180, 195, 215, ${0.15 + torchIntensity * 0.35})`);
        lightGrad.addColorStop(0.8, `rgba(30, 40, 55, ${0.1 + torchIntensity * 0.2})`);
        lightGrad.addColorStop(1, 'rgba(5, 7, 12, 0.98)');
      }

      // Draw perspective pipe rings (corrugated stormwater pipe geometry)
      const numRings = 14;
      for (let i = numRings; i >= 1; i--) {
        const ringZ = i * 40 - pipeTextureOffset.current;
        if (ringZ <= 10) continue;
        const scale = 260 / ringZ;
        const rx = (width * 0.46) * scale;
        const ry = (height * 0.44) * scale;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, rx, ry, 0, 0, Math.PI * 2);

        // Ring coloration with depth shading
        const depthAlpha = Math.min(1, Math.max(0.1, 1 - (ringZ / 500)));
        if (cameraState.nightVision) {
          ctx.strokeStyle = `rgba(34, 197, 94, ${depthAlpha * 0.7})`;
        } else {
          ctx.strokeStyle = `rgba(100, 116, 139, ${depthAlpha * (0.35 + torchIntensity * 0.4)})`;
        }
        ctx.lineWidth = Math.max(1.2, 3.5 * scale);
        ctx.stroke();

        // Pipe concrete seams & texture bands
        if (i % 3 === 0) {
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, rx * 1.02, ry * 1.02, 0, 0, Math.PI * 2);
          ctx.strokeStyle = cameraState.nightVision ? 'rgba(74, 222, 128, 0.3)' : 'rgba(71, 85, 105, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Pipe longitudinal ribs / seam lines
      const angles = [0, 30, 60, 120, 150, 180, 210, 240, 300, 330];
      angles.forEach((ang) => {
        const rad = (ang * Math.PI) / 180;
        const outerX = centerX + Math.cos(rad) * width * 0.75;
        const outerY = centerY + Math.sin(rad) * height * 0.7;
        const innerX = centerX + Math.cos(rad) * 20;
        const innerY = centerY + Math.sin(rad) * 20;

        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX, outerY);
        ctx.strokeStyle = cameraState.nightVision ? 'rgba(34, 197, 94, 0.18)' : 'rgba(100, 116, 139, 0.2)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      // Lighting layer
      ctx.fillStyle = lightGrad;
      ctx.fillRect(0, 0, width, height);

      // Water Layer at pipe floor (dynamic based on waterLevel sensor!)
      // Water level is in mm (e.g. 10mm to 100mm)
      const waterHeightPercent = Math.min(0.55, Math.max(0.06, waterLevel / 180));
      const waterSurfaceY = centerY + (height * 0.42 * (1 - waterHeightPercent * 1.6));

      // Draw water body in pipe base
      ctx.beginPath();
      // Pipe arc bottom
      const waterRadiusX = width * 0.44;
      const waterRadiusY = height * 0.42;

      ctx.moveTo(centerX - waterRadiusX, waterSurfaceY);
      
      // Animated water surface ripple
      const segments = 16;
      for (let s = 0; s <= segments; s++) {
        const px = (centerX - waterRadiusX) + (s / segments) * (waterRadiusX * 2);
        const wave = Math.sin(waterWavePhase.current + s * 0.7) * 2.5;
        ctx.lineTo(px, waterSurfaceY + wave);
      }

      // Complete path along bottom ellipse arc
      ctx.arc(centerX, centerY, waterRadiusX, 0.15 * Math.PI, 0.85 * Math.PI, false);
      ctx.closePath();

      // Water shading
      const waterGrad = ctx.createLinearGradient(0, waterSurfaceY, 0, height);
      if (cameraState.nightVision) {
        waterGrad.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
        waterGrad.addColorStop(0.4, 'rgba(6, 78, 59, 0.75)');
        waterGrad.addColorStop(1, 'rgba(2, 44, 34, 0.95)');
      } else {
        // Turbid storm water with sediment reflection
        waterGrad.addColorStop(0, 'rgba(14, 116, 144, 0.45)');
        waterGrad.addColorStop(0.3, 'rgba(15, 45, 65, 0.75)');
        waterGrad.addColorStop(1, 'rgba(8, 22, 34, 0.95)');
      }
      ctx.fillStyle = waterGrad;
      ctx.fill();

      // Water surface shine line
      ctx.beginPath();
      for (let s = 0; s <= segments; s++) {
        const px = (centerX - waterRadiusX * 0.9) + (s / segments) * (waterRadiusX * 1.8);
        const wave = Math.sin(waterWavePhase.current + s * 0.7) * 2.5;
        if (s === 0) ctx.moveTo(px, waterSurfaceY + wave);
        else ctx.lineTo(px, waterSurfaceY + wave);
      }
      ctx.strokeStyle = cameraState.nightVision ? 'rgba(110, 231, 183, 0.6)' : 'rgba(103, 232, 249, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Obstacle ahead! (Approaches based on ultrasonic distance)
      if (ultrasonicDistance < 180) {
        // Distance from 180 down to 10cm
        const obsScale = Math.min(2.2, Math.max(0.15, (190 - ultrasonicDistance) / 120));
        const obsW = 75 * obsScale;
        const obsH = 45 * obsScale;
        const obsX = centerX + 15 - obsW / 2;
        const obsY = waterSurfaceY - (obsH * 0.65);

        // Draw debris obstacle (sediment mound / rubble / obstruction)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(obsX, obsY + obsH);
        ctx.quadraticCurveTo(obsX + obsW * 0.2, obsY, obsX + obsW * 0.5, obsY + obsH * 0.2);
        ctx.quadraticCurveTo(obsX + obsW * 0.8, obsY - obsH * 0.2, obsX + obsW, obsY + obsH);
        ctx.closePath();

        const obsGrad = ctx.createLinearGradient(obsX, obsY, obsX + obsW, obsY + obsH);
        if (cameraState.nightVision) {
          obsGrad.addColorStop(0, 'rgba(52, 211, 153, 0.9)');
          obsGrad.addColorStop(1, 'rgba(6, 78, 59, 0.9)');
        } else {
          obsGrad.addColorStop(0, 'rgba(120, 85, 60, 0.95)');
          obsGrad.addColorStop(1, 'rgba(65, 45, 30, 0.98)');
        }
        ctx.fillStyle = obsGrad;
        ctx.fill();
        ctx.strokeStyle = cameraState.nightVision ? '#4ade80' : '#d97706';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // AI Bounding box if enabled
        if (cameraState.aiDefectDetection) {
          ctx.strokeStyle = ultrasonicDistance < 30 ? '#ef4444' : '#f59e0b';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(obsX - 10, obsY - 15, obsW + 20, obsH + 25);
          ctx.setLineDash([]);

          ctx.fillStyle = ultrasonicDistance < 30 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(245, 158, 11, 0.85)';
          ctx.fillRect(obsX - 10, obsY - 32, 130, 16);
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText(`OBSTACLE: ${ultrasonicDistance.toFixed(0)}cm`, obsX - 6, obsY - 20);
        }
        ctx.restore();
      }

      // Simulated Pipe Crack at specific distance (e.g. at 14.8m)
      if (Math.abs(distanceTraveled - 14.8) < 4.0) {
        const crackScale = Math.max(0.4, 1.2 - Math.abs(distanceTraveled - 14.8) * 0.25);
        const crackX = centerX - 140 * crackScale;
        const crackY = centerY - 50 * crackScale;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(crackX, crackY);
        ctx.lineTo(crackX + 12 * crackScale, crackY - 18 * crackScale);
        ctx.lineTo(crackX + 8 * crackScale, crackY - 35 * crackScale);
        ctx.lineTo(crackX + 22 * crackScale, crackY - 48 * crackScale);
        ctx.lineTo(crackX + 16 * crackScale, crackY - 65 * crackScale);
        ctx.strokeStyle = cameraState.nightVision ? '#22c55e' : '#f43f5e';
        ctx.lineWidth = 2.5 * crackScale;
        ctx.stroke();

        if (cameraState.aiDefectDetection) {
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(crackX - 10, crackY - 75 * crackScale, 45 * crackScale + 15, 85 * crackScale);
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(244, 63, 94, 0.85)';
          ctx.fillRect(crackX - 10, crackY - 75 * crackScale - 16, 120, 15);
          ctx.fillStyle = '#ffffff';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText('CRACK (Class 2) 88%', crackX - 6, crackY - 75 * crackScale - 4);
        }
        ctx.restore();
      }

      // Night vision noise grain overlay
      if (cameraState.nightVision) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.05)';
        for (let g = 0; g < 40; g++) {
          const gx = Math.random() * width;
          const gy = Math.random() * height;
          ctx.fillRect(gx, gy, 2, 2);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    cameraState.nightVision,
    cameraState.torchBrightness,
    cameraState.pan,
    cameraState.tilt,
    cameraState.aiDefectDetection,
    waterLevel,
    ultrasonicDistance,
    distanceTraveled,
    direction,
    speed,
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-[#0b0f19] border border-cyan-500/20 rounded-xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'h-full min-h-[440px]'
      }`}
    >
      {/* Top Stream Header HUD */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-b from-[#080c14]/90 to-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>ESP32-CAM</span>
            <span className="text-cyan-500/60">|</span>
            <span className="text-slate-300">
              {connectionConfig.mode === 'hardware' ? connectionConfig.esp32Ip : 'SIMULATOR'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 text-[11px] font-mono text-slate-300">
            <span className="text-slate-400">FPS:</span>
            <span className="text-emerald-400 font-semibold">{cameraState.fps}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 text-[11px] font-mono text-slate-300">
            <span className="text-slate-400">RES:</span>
            <span>{cameraState.resolution}</span>
          </div>
        </div>

        {/* Recording status & Controls */}
        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-500/50 text-[11px] font-mono text-red-300">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>REC {formatTimer(recordSeconds)}</span>
            </div>
          )}

          <button
            onClick={() => onUpdateCamera({ nightVision: !cameraState.nightVision })}
            title={cameraState.nightVision ? 'Disable IR Night Vision' : 'Enable IR Night Vision'}
            className={`p-1.5 rounded transition-colors ${
              cameraState.nightVision
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 glow-emerald'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => onUpdateCamera({ aiDefectDetection: !cameraState.aiDefectDetection })}
            title={cameraState.aiDefectDetection ? 'AI Defect Detection Overlay ON' : 'AI Defect Detection Overlay OFF'}
            className={`p-1.5 rounded transition-colors ${
              cameraState.aiDefectDetection
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 glow-cyan'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Stream'}
            className="p-1.5 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Stream Canvas / Image view */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
        {connectionConfig.mode === 'hardware' && connectionConfig.status === 'connected' ? (
          // Physical ESP32-CAM MJPEG Stream
          <img
            src={`http://${connectionConfig.esp32Ip}${connectionConfig.streamPath}`}
            alt="ESP32-CAM Live Stream"
            className="w-full h-full object-contain pointer-events-none"
            onError={() => {
              // fallback gracefully
            }}
          />
        ) : (
          // High fidelity simulated pipe camera
          <canvas
            ref={canvasRef}
            width={640}
            height={440}
            className="w-full h-full object-contain cursor-crosshair"
          />
        )}

        {/* Scanlines & Vignette CRT Effect */}
        <div className="absolute inset-0 scanlines-fx pointer-events-none" />
        <div className="absolute inset-0 pipe-vignette pointer-events-none" />

        {/* HUD Crosshairs & Inspection Reticle */}
        {hudVisible && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Center target circle */}
            <div className="relative w-28 h-28 border border-cyan-500/30 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
              <div className="absolute top-0 w-full h-[1px] bg-cyan-500/15" />
              <div className="absolute left-0 h-full w-[1px] bg-cyan-500/15" />
              {/* Pitch horizon ticks */}
              <div
                className="absolute inset-x-4 h-[1px] bg-cyan-400/50 transition-transform duration-200"
                style={{ transform: `translateY(${-inclinePitch * 3}px)` }}
              />
            </div>

            {/* Inclinometer readout */}
            <div className="absolute bottom-16 left-4 font-mono text-[11px] text-cyan-400/80 bg-slate-950/70 border border-cyan-900/60 px-2 py-1 rounded backdrop-blur-sm">
              <div>SLOPE: {inclinePitch > 0 ? `+${inclinePitch}°` : `${inclinePitch}°`}</div>
              <div>GIMBAL: P{cameraState.pan}° T{cameraState.tilt}°</div>
            </div>

            {/* Ultrasonic HUD Warning in Video Feed */}
            {ultrasonicDistance < 40 && (
              <div className="absolute top-16 inset-x-0 flex justify-center">
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded border font-mono text-xs font-bold animate-pulse ${
                    ultrasonicDistance < 20
                      ? 'bg-red-950/90 border-red-500 text-red-300 glow-red'
                      : 'bg-amber-950/90 border-amber-500 text-amber-300 glow-amber'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    OBSTACLE WARNING: {ultrasonicDistance.toFixed(0)} CM
                    {ultrasonicDistance < 15 ? ' (AUTO-BRAKED)' : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Quick Action Overlay Buttons */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-slate-950/80 border border-slate-800/80 p-1 rounded-lg backdrop-blur-md">
          <button
            onClick={captureSnapshot}
            title="Take Photo Snapshot"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Snapshot</span>
          </button>

          <button
            onClick={handleOpenDefectDialog}
            title="Tag Defect at Current Distance"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 text-xs font-mono font-medium transition-colors"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tag Defect</span>
          </button>

          <button
            onClick={() => setHudVisible(!hudVisible)}
            title="Toggle Inspection Reticle HUD"
            className={`p-1.5 rounded text-xs transition-colors ${
              hudVisible
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Camera LED Torch & Gimbal Quick Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#090d16] border-t border-slate-800 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Flashlight className={`w-3.5 h-3.5 ${cameraState.torchBrightness > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
            <span className="text-[11px] text-slate-400">LED Torch:</span>
            <input
              type="range"
              min={0}
              max={100}
              value={cameraState.torchBrightness}
              onChange={(e) => onUpdateCamera({ torchBrightness: Number(e.target.value) })}
              className="w-20 sm:w-28 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[11px] text-cyan-400 w-8">{cameraState.torchBrightness}%</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-slate-400">
            Water: <strong className="text-cyan-300">{waterLevel.toFixed(1)}mm</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Obstacle: <strong className={ultrasonicDistance < 30 ? 'text-red-400' : 'text-emerald-400'}>{ultrasonicDistance.toFixed(0)}cm</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Odo: <strong className="text-slate-200">{distanceTraveled.toFixed(1)}m</strong>
          </span>
        </div>
      </div>

      {/* Defect Tagger Modal */}
      {defectModalOpen && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0c121e] border border-cyan-500/30 rounded-xl p-4 shadow-2xl text-slate-200 font-sans">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <h3 className="font-display font-bold text-sm tracking-wide text-cyan-300 flex items-center gap-1.5">
                <BookmarkPlus className="w-4 h-4 text-cyan-400" />
                LOG DEFECT @ {distanceTraveled.toFixed(1)}M
              </h3>
              <button
                onClick={() => setDefectModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Defect Category:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['CRACK', 'OBSTACLE', 'HIGH_WATER', 'SEDIMENT', 'JOINT_OFFSET'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedDefectType(type)}
                      className={`px-2 py-1.5 rounded font-mono text-[11px] border transition-colors ${
                        selectedDefectType === type
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Severity Level:</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'critical'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setDefectSeverity(sev)}
                      className={`flex-1 py-1 rounded text-center uppercase font-mono text-[10px] font-semibold border ${
                        defectSeverity === sev
                          ? sev === 'critical'
                            ? 'bg-red-500/20 border-red-500 text-red-300'
                            : sev === 'medium'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-blue-500/20 border-blue-500 text-blue-300'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Inspector Observations:</label>
                <input
                  type="text"
                  value={defectNotes}
                  onChange={(e) => setDefectNotes(e.target.value)}
                  placeholder="e.g. Longitudinal crack along pipe crown, minor seepage"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDefectModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDefect}
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold shadow-md glow-cyan"
                >
                  Save Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Brief Toast notification */}
      {toastMessage && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-md bg-cyan-950/90 border border-cyan-400/80 text-cyan-200 text-xs font-mono shadow-xl animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
