/**
 * DRAIN PULSE - Type Definitions
 * Storm Water Drainage Inspection Rover
 */

export type Direction = 'FORWARD' | 'REVERSE' | 'LEFT' | 'RIGHT' | 'PIVOT_LEFT' | 'PIVOT_RIGHT' | 'STOP';

export interface TelemetryPoint {
  timestamp: number;
  waterLevel: number; // in mm
  distanceTraveled: number; // in meters (odometer)
  ultrasonicDistance: number; // in cm
  temp: number; // Celsius
  humidity: number; // %
  batteryVoltage: number; // Volts
}

export interface ObstacleData {
  distance: number; // cm
  status: 'safe' | 'caution' | 'danger';
  autoBraked: boolean;
  angle?: number;
}

export interface WaterLevelData {
  currentLevel: number; // mm
  warningThreshold: number; // mm
  criticalThreshold: number; // mm
  pipeDiameter: number; // mm
  percentFull: number; // %
  trend: 'rising' | 'falling' | 'stable';
  rateOfChange: number; // mm/min
  status: 'normal' | 'warning' | 'critical';
}

export interface CameraState {
  pan: number; // -90 to +90 degrees
  tilt: number; // -45 to +45 degrees
  torchBrightness: number; // 0 to 100%
  nightVision: boolean;
  aiDefectDetection: boolean;
  streamUrl: string;
  isStreaming: boolean;
  fps: number;
  resolution: 'QQVGA' | 'QVGA' | 'VGA' | 'SVGA' | 'XGA';
}

export interface RoverMotionState {
  direction: Direction;
  speed: number; // 0 - 100%
  maxPwm: number; // 0 - 255
  emergencyStop: boolean;
  driveMode: 'crawl' | 'normal' | 'turbo';
  inclinePitch: number; // degrees (slope gradient)
  inclineRoll: number; // degrees
  distanceTraveled: number; // meters
}

export interface ConnectionConfig {
  mode: 'simulation' | 'hardware';
  esp32Ip: string;
  webSocketPort: number;
  httpPort: number;
  streamPath: string;
  commandProtocol: 'websocket' | 'http';
  autoReconnect: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'simulated';
  latency: number; // ms
  rssi: number; // -dBm signal strength
}

export interface DefectItem {
  id: string;
  timestamp: number;
  distance: number; // meter mark in pipe
  type: 'CRACK' | 'OBSTACLE' | 'HIGH_WATER' | 'SEDIMENT' | 'JOINT_OFFSET';
  severity: 'low' | 'medium' | 'critical';
  notes: string;
  waterDepthMm: number;
  snapshotUrl?: string;
}

export interface InspectionMetadata {
  pipeId: string;
  location: string;
  pipeMaterial: 'Concrete' | 'PVC' | 'Corrugated Steel' | 'Clay' | 'HDPE';
  pipeDiameterMm: number;
  operatorName: string;
  sessionStartTime: number;
}
