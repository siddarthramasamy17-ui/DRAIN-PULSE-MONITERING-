/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { TelemetryBar } from './components/TelemetryBar';
import { CameraFeed } from './components/CameraFeed';
import { WaterLevelMonitor } from './components/WaterLevelMonitor';
import { ObstacleRadar } from './components/ObstacleRadar';
import { RoverControls } from './components/RoverControls';
import { InspectionLogModal } from './components/InspectionLogModal';
import { ConnectionSettingsModal } from './components/ConnectionSettingsModal';
import {
  CameraState,
  ConnectionConfig,
  DefectItem,
  Direction,
  InspectionMetadata,
  ObstacleData,
  RoverMotionState,
  TelemetryPoint,
  WaterLevelData,
} from './types/rover';
import { esp32Service } from './services/esp32Service';
import { soundManager } from './utils/audioAlerts';
import { pushNotifier } from './utils/notifications';

export default function App() {
  // Connection & System Config
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>(esp32Service.getConfig());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoBrakeEnabled, setAutoBrakeEnabled] = useState(true);

  // Inspection Metadata
  const [inspectionMeta, setInspectionMeta] = useState<InspectionMetadata>({
    pipeId: 'PIPE-TR-402',
    location: 'North Conduit - Outfall Sector 4B',
    pipeMaterial: 'Concrete',
    pipeDiameterMm: 300,
    operatorName: 'S. Ramasamy',
    sessionStartTime: Date.now(),
  });

  // Camera State
  const [cameraState, setCameraState] = useState<CameraState>({
    pan: 0,
    tilt: -10,
    torchBrightness: 80,
    nightVision: false,
    aiDefectDetection: true,
    streamUrl: 'http://192.168.4.1:81/stream',
    isStreaming: true,
    fps: 28,
    resolution: 'VGA',
  });

  // Rover Motion State
  const [roverMotion, setRoverMotion] = useState<RoverMotionState>({
    direction: 'STOP',
    speed: 50,
    maxPwm: 255,
    emergencyStop: false,
    driveMode: 'normal',
    inclinePitch: -1.4,
    inclineRoll: 0.5,
    distanceTraveled: 14.8,
  });

  // Obstacle Data
  const [obstacle, setObstacle] = useState<ObstacleData>({
    distance: 74,
    status: 'safe',
    autoBraked: false,
    angle: 90,
  });

  // Water Level Data
  const [waterData, setWaterData] = useState<WaterLevelData>({
    currentLevel: 38.5,
    warningThreshold: 50,
    criticalThreshold: 80,
    pipeDiameter: 300,
    percentFull: (38.5 / 300) * 100,
    trend: 'stable',
    rateOfChange: 0.2,
    status: 'normal',
  });

  // Telemetry History Buffer
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const lastLevelRef = useRef(38.5);
  const lastLevelTimeRef = useRef(Date.now());

  // Logged Inspection Defects
  const [defects, setDefects] = useState<DefectItem[]>([
    {
      id: 'def-1',
      timestamp: Date.now() - 1000 * 60 * 12,
      distance: 6.2,
      type: 'SEDIMENT',
      severity: 'low',
      notes: 'Fine silt accumulation ~15mm depth along pipe invert',
      waterDepthMm: 22.0,
    },
    {
      id: 'def-2',
      timestamp: Date.now() - 1000 * 60 * 5,
      distance: 14.8,
      type: 'CRACK',
      severity: 'medium',
      notes: 'Longitudinal hairline crack along pipe crown, minor calcite seepage',
      waterDepthMm: 38.2,
    },
  ]);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDefectLogOpen, setIsDefectLogOpen] = useState(false);

  // Subscribe to real-time ESP32 & simulated telemetry
  useEffect(() => {
    esp32Service.subscribeTelemetry((telemetry) => {
      const now = Date.now();

      // Water Level calculation
      const lvl = telemetry.waterLevel;
      const isCritical = lvl >= waterData.criticalThreshold;
      const isWarning = lvl >= waterData.warningThreshold && !isCritical;
      const status: WaterLevelData['status'] = isCritical ? 'critical' : isWarning ? 'warning' : 'normal';

      // Rate of change calculation
      const dtMin = Math.max(0.01, (now - lastLevelTimeRef.current) / 60000);
      const rate = (lvl - lastLevelRef.current) / dtMin;
      lastLevelRef.current = lvl;
      lastLevelTimeRef.current = now;

      const trend: WaterLevelData['trend'] = rate > 0.8 ? 'rising' : rate < -0.8 ? 'falling' : 'stable';

      setWaterData((prev) => ({
        ...prev,
        currentLevel: lvl,
        percentFull: (lvl / prev.pipeDiameter) * 100,
        trend,
        rateOfChange: rate,
        status,
      }));

      // Obstacle state
      const dist = telemetry.ultrasonicDistance;
      const obsStatus: ObstacleData['status'] = dist < 25 ? 'danger' : dist < 60 ? 'caution' : 'safe';

      // Auto-brake logic if obstacle is dangerously close while driving forward
      let autoBrakedTriggered = false;
      if (dist < 18 && autoBrakeEnabled && roverMotion.direction === 'FORWARD') {
        autoBrakedTriggered = true;
        esp32Service.sendEmergencyStop();
        setRoverMotion((m) => ({ ...m, direction: 'STOP', speed: 0 }));
        soundManager.playWarningBeep();
      }

      setObstacle({
        distance: dist,
        status: obsStatus,
        autoBraked: autoBrakedTriggered,
        angle: 90,
      });

      // Rover Motion updates
      setRoverMotion((m) => ({
        ...m,
        distanceTraveled: telemetry.distanceTraveled,
        inclinePitch: telemetry.inclinePitch,
        inclineRoll: telemetry.inclineRoll,
      }));

      // Push history point
      const newPoint: TelemetryPoint = {
        timestamp: now,
        waterLevel: lvl,
        distanceTraveled: telemetry.distanceTraveled,
        ultrasonicDistance: dist,
        temp: telemetry.temperature,
        humidity: telemetry.humidity,
        batteryVoltage: telemetry.batteryVoltage,
      };

      setTelemetryHistory((prev) => {
        const next = [...prev, newPoint];
        // Keep last 150 points for memory efficiency
        return next.length > 150 ? next.slice(-150) : next;
      });

      // Critical Water Notification & Alarm Dispatch
      if (isCritical) {
        soundManager.startCriticalAlarm();
        pushNotifier.triggerWaterCriticalAlert(
          lvl,
          waterData.criticalThreshold,
          inspectionMeta.pipeId,
          telemetry.distanceTraveled
        );
      } else {
        soundManager.stopCriticalAlarm();
      }
    });
  }, [
    waterData.criticalThreshold,
    waterData.warningThreshold,
    autoBrakeEnabled,
    roverMotion.direction,
    inspectionMeta.pipeId,
  ]);

  // Handle Mute / Unmute
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    soundManager.isMuted = !nextState;
    if (!nextState) {
      soundManager.stopCriticalAlarm();
    }
  };

  // Drive Commands
  const handleDriveCommand = useCallback((dir: Direction, speed: number) => {
    setRoverMotion((m) => ({ ...m, direction: dir }));
    esp32Service.sendDriveCommand(dir, speed);
  }, []);

  const handleEmergencyStop = useCallback(() => {
    setRoverMotion((m) => ({ ...m, direction: 'STOP', speed: 0, emergencyStop: true }));
    esp32Service.sendEmergencyStop();
    setTimeout(() => {
      setRoverMotion((m) => ({ ...m, emergencyStop: false }));
    }, 600);
  }, []);

  const handleUpdateSpeed = useCallback((speed: number) => {
    setRoverMotion((m) => ({ ...m, speed }));
  }, []);

  const handleUpdateDriveMode = useCallback((driveMode: RoverMotionState['driveMode']) => {
    setRoverMotion((m) => ({ ...m, driveMode }));
  }, []);

  // Gimbal Commands
  const handleGimbalCommand = useCallback((pan: number, tilt: number) => {
    setCameraState((c) => ({ ...c, pan, tilt }));
    esp32Service.sendGimbalCommand(pan, tilt);
  }, []);

  // Torch LED
  const handleUpdateCamera = useCallback((updates: Partial<CameraState>) => {
    setCameraState((c) => {
      const next = { ...c, ...updates };
      if (updates.torchBrightness !== undefined) {
        esp32Service.sendTorchCommand(updates.torchBrightness);
      }
      return next;
    });
  }, []);

  // Defect Management
  const handleAddDefect = (newDefect: Omit<DefectItem, 'id' | 'timestamp'>) => {
    const item: DefectItem = {
      ...newDefect,
      id: `def-${Date.now()}`,
      timestamp: Date.now(),
    };
    setDefects((prev) => [item, ...prev]);
  };

  const handleDeleteDefect = (id: string) => {
    setDefects((prev) => prev.filter((d) => d.id !== id));
  };

  const handleClearDefects = () => {
    setDefects([]);
  };

  // Threshold update
  const handleUpdateThresholds = (warning: number, critical: number) => {
    setWaterData((prev) => ({
      ...prev,
      warningThreshold: warning,
      criticalThreshold: critical,
    }));
  };

  // Connection config update
  const handleSaveConnectionConfig = (updated: Partial<ConnectionConfig>) => {
    setConnectionConfig((prev) => {
      const next = { ...prev, ...updated };
      esp32Service.updateConfig(next);
      return next;
    });
  };

  const latestTelemetry: TelemetryPoint = telemetryHistory.length > 0
    ? telemetryHistory[telemetryHistory.length - 1]
    : {
        timestamp: Date.now(),
        waterLevel: waterData.currentLevel,
        distanceTraveled: roverMotion.distanceTraveled,
        ultrasonicDistance: obstacle.distance,
        temp: 22.4,
        humidity: 86,
        batteryVoltage: 12.1,
      };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Top Main Navigation Header */}
      <Header
        connectionConfig={connectionConfig}
        inspectionMeta={inspectionMeta}
        defectCount={defects.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDefectLog={() => setIsDefectLogOpen(true)}
      />

      {/* Real-time Telemetry Ribbon HUD */}
      <TelemetryBar
        telemetry={latestTelemetry}
        motion={roverMotion}
        obstacle={obstacle}
        waterData={waterData}
        rssi={connectionConfig.rssi}
      />

      {/* Main Dual-Column Operator Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Visual Feed & Sonar Radar (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* ESP32-CAM Visual Feed */}
            <CameraFeed
              cameraState={cameraState}
              onUpdateCamera={handleUpdateCamera}
              connectionConfig={connectionConfig}
              waterLevel={waterData.currentLevel}
              ultrasonicDistance={obstacle.distance}
              distanceTraveled={roverMotion.distanceTraveled}
              inclinePitch={roverMotion.inclinePitch}
              direction={roverMotion.direction}
              speed={roverMotion.speed}
              onAddDefect={handleAddDefect}
            />

            {/* Ultrasonic Obstacle Radar */}
            <ObstacleRadar
              obstacle={obstacle}
              autoBrakeEnabled={autoBrakeEnabled}
              onToggleAutoBrake={setAutoBrakeEnabled}
              soundEnabled={soundEnabled}
              onToggleSound={handleToggleSound}
            />
          </div>

          {/* RIGHT COLUMN: Water Level Graph & Rover Motion Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Water Level Continuous Graph & Critical Push Alert Station */}
            <WaterLevelMonitor
              telemetryHistory={telemetryHistory}
              waterData={waterData}
              onUpdateThresholds={handleUpdateThresholds}
              pipeId={inspectionMeta.pipeId}
              distanceTraveled={roverMotion.distanceTraveled}
            />

            {/* Rover Movement & Gimbal Controls */}
            <RoverControls
              motion={roverMotion}
              camera={cameraState}
              onDriveCommand={handleDriveCommand}
              onEmergencyStop={handleEmergencyStop}
              onUpdateSpeed={handleUpdateSpeed}
              onUpdateDriveMode={handleUpdateDriveMode}
              onGimbalCommand={handleGimbalCommand}
            />
          </div>
        </div>
      </main>

      {/* Operator Footer Status */}
      <footer className="w-full bg-[#06080e] border-t border-slate-900 py-2.5 px-4 sm:px-6 text-slate-500 font-mono text-[11px] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>DRAIN PULSE Rover Telemetry Active</span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="hidden sm:inline">ESP32-CAM (AI-Thinker) • HC-SR04 • Hydrostatic Level Probe</span>
        </div>

        <div className="flex items-center gap-3">
          <span>Drive: W/A/S/D</span>
          <span className="text-slate-700">•</span>
          <span>E-STOP: Space</span>
          <span className="text-slate-700">•</span>
          <span>Gimbal: Q/E & R/F</span>
        </div>
      </footer>

      {/* Modals */}
      <InspectionLogModal
        isOpen={isDefectLogOpen}
        onClose={() => setIsDefectLogOpen(false)}
        defects={defects}
        metadata={inspectionMeta}
        onDeleteDefect={handleDeleteDefect}
        onClearDefects={handleClearDefects}
      />

      <ConnectionSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={connectionConfig}
        onSaveConfig={handleSaveConnectionConfig}
        metadata={inspectionMeta}
        onSaveMetadata={(updated) => setInspectionMeta((prev) => ({ ...prev, ...updated }))}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />
    </div>
  );
}
