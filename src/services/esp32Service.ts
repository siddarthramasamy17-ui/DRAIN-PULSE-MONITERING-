/**
 * DRAIN PULSE - ESP32 Communication & Simulation Service
 * Handles live hardware command transmission and high-fidelity drainage physics simulation
 */

import { Direction, ConnectionConfig, TelemetryPoint } from '../types/rover';

export type TelemetryCallback = (telemetry: {
  waterLevel: number;
  ultrasonicDistance: number;
  batteryVoltage: number;
  temperature: number;
  humidity: number;
  inclinePitch: number;
  inclineRoll: number;
  distanceTraveled: number;
  rssi: number;
}) => void;

class ESP32Service {
  private config: ConnectionConfig = {
    mode: 'simulation',
    esp32Ip: '192.168.4.1',
    webSocketPort: 81,
    httpPort: 80,
    streamPath: ':81/stream',
    commandProtocol: 'websocket',
    autoReconnect: true,
    status: 'simulated',
    latency: 18,
    rssi: -58,
  };

  private ws: WebSocket | null = null;
  private telemetryInterval: number | null = null;
  private onTelemetryCallback: TelemetryCallback | null = null;

  // Internal simulated rover state
  private simState = {
    distanceTraveled: 14.8, // meters
    currentSpeed: 0,
    direction: 'STOP' as Direction,
    baseWaterLevel: 38.5, // mm
    waterWavePhase: 0,
    nextObstacleDistance: 74, // cm
    batteryVoltage: 12.1, // 3S LiPo max 12.6V
    temp: 22.4, // deg C
    humidity: 86, // %
    pitch: -1.2, // slope gradient %
    roll: 0.5,
    autoBraked: false,
    panAngle: 0,
    tiltAngle: 0,
    torchLevel: 75,
  };

  constructor() {
    this.startSimulationEngine();
  }

  public getConfig(): ConnectionConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<ConnectionConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (this.config.mode === 'hardware') {
      this.connectHardware();
    } else {
      this.disconnectHardware();
      this.config.status = 'simulated';
    }
  }

  public subscribeTelemetry(callback: TelemetryCallback) {
    this.onTelemetryCallback = callback;
  }

  // Send movement command to rover
  public sendDriveCommand(direction: Direction, speed: number) {
    this.simState.direction = direction;
    this.simState.currentSpeed = direction === 'STOP' ? 0 : speed;

    if (this.config.mode === 'hardware') {
      this.dispatchHardwareCommand('drive', { dir: direction, speed });
    }
  }

  // Emergency stop
  public sendEmergencyStop() {
    this.simState.direction = 'STOP';
    this.simState.currentSpeed = 0;
    if (this.config.mode === 'hardware') {
      this.dispatchHardwareCommand('estop', { val: 1 });
    }
  }

  // Camera Pan / Tilt Gimbal
  public sendGimbalCommand(pan: number, tilt: number) {
    this.simState.panAngle = pan;
    this.simState.tiltAngle = tilt;
    if (this.config.mode === 'hardware') {
      this.dispatchHardwareCommand('gimbal', { pan, tilt });
    }
  }

  // Flashlight / Torch LED
  public sendTorchCommand(level: number) {
    this.simState.torchLevel = level;
    if (this.config.mode === 'hardware') {
      this.dispatchHardwareCommand('torch', { val: level });
    }
  }

  // Hardware dispatch via WebSocket or REST HTTP
  private dispatchHardwareCommand(action: string, payload: Record<string, unknown>) {
    if (this.config.commandProtocol === 'websocket' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, ...payload }));
    } else {
      // Fallback to HTTP GET
      const query = new URLSearchParams(payload as Record<string, string>).toString();
      const url = `http://${this.config.esp32Ip}:${this.config.httpPort}/api/${action}?${query}`;
      fetch(url, { mode: 'no-cors' }).catch(() => {
        // silent catch
      });
    }
  }

  private connectHardware() {
    this.config.status = 'connecting';
    const wsUrl = `ws://${this.config.esp32Ip}:${this.config.webSocketPort}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.config.status = 'connected';
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onTelemetryCallback) {
            this.onTelemetryCallback({
              waterLevel: data.waterLevel ?? data.water ?? 0,
              ultrasonicDistance: data.ultrasonicDistance ?? data.dist ?? 100,
              batteryVoltage: data.battery ?? 12.0,
              temperature: data.temp ?? 23,
              humidity: data.humidity ?? 85,
              inclinePitch: data.pitch ?? 0,
              inclineRoll: data.roll ?? 0,
              distanceTraveled: data.distanceTraveled ?? 0,
              rssi: data.rssi ?? -60,
            });
          }
        } catch {
          // ignore
        }
      };

      this.ws.onerror = () => {
        // If cannot connect to physical ESP32, notify & fallback gracefully
        this.config.status = 'disconnected';
      };

      this.ws.onclose = () => {
        this.config.status = 'disconnected';
      };
    } catch {
      this.config.status = 'disconnected';
    }
  }

  private disconnectHardware() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  // Interactive high-detail drainage physics simulation
  private startSimulationEngine() {
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);

    this.telemetryInterval = window.setInterval(() => {
      // If hardware is actively connected, don't generate synthetic data
      if (this.config.mode === 'hardware' && this.config.status === 'connected') {
        return;
      }

      // Physics integration step
      const dt = 0.25; // seconds
      const speedFactor = (this.simState.currentSpeed / 100) * 0.45; // m/s at full throttle

      if (this.simState.direction === 'FORWARD') {
        this.simState.distanceTraveled += speedFactor * dt;
        // Obstacle gets closer
        this.simState.nextObstacleDistance = Math.max(12, this.simState.nextObstacleDistance - (speedFactor * dt * 100));
        
        // If reached obstacle and passed or moved away
        if (this.simState.nextObstacleDistance <= 14) {
          this.simState.autoBraked = true;
          this.simState.direction = 'STOP';
          this.simState.currentSpeed = 0;
        }
      } else if (this.simState.direction === 'REVERSE') {
        this.simState.distanceTraveled = Math.max(0, this.simState.distanceTraveled - (speedFactor * dt * 0.7));
        this.simState.nextObstacleDistance = Math.min(240, this.simState.nextObstacleDistance + (speedFactor * dt * 80));
      } else {
        // When idling, small natural drift or resetting obstacle if far
        if (this.simState.nextObstacleDistance <= 15) {
          // Can spawn new obstacle further down pipe if user chooses to reset or clear
        }
      }

      // Dynamic water level based on distance along drain pipe
      // Drain pipes have natural dips, puddles, junctions, and flow gradient
      this.simState.waterWavePhase += 0.08;
      const ripple = Math.sin(this.simState.waterWavePhase) * 1.5 + Math.cos(this.simState.waterWavePhase * 2.3) * 0.6;
      
      // Simulate realistic pipe section features:
      // At 18m to 24m there is a low basin with standing water!
      const dist = this.simState.distanceTraveled;
      let depthProfile = 32; // baseline depth in mm
      if (dist >= 16 && dist <= 28) {
        // Basin pool
        const bell = Math.sin(((dist - 16) / 12) * Math.PI);
        depthProfile += bell * 54; // can reach 86mm (Critical threshold territory!)
      } else if (dist >= 35 && dist <= 42) {
        depthProfile += 25;
      }

      const calculatedWaterLevel = Math.max(5, depthProfile + ripple + (Math.random() * 0.8 - 0.4));

      // Battery slow discharge
      this.simState.batteryVoltage = Math.max(10.2, this.simState.batteryVoltage - 0.00005 * (this.simState.currentSpeed > 0 ? 3 : 1));

      // Pitch gradient changes slightly with pipe slope
      this.simState.pitch = -1.5 + Math.sin(dist * 0.3) * 1.2;
      this.simState.roll = Math.cos(dist * 0.4) * 0.7;

      // Latency & RSSI jitter
      this.config.latency = Math.round(18 + Math.random() * 8);
      this.config.rssi = Math.round(-55 - (dist * 0.8) + (Math.random() * 4 - 2));

      // Ultrasonic sensor noise
      const sensorNoise = (Math.random() * 1.2 - 0.6);
      const measuredUltrasonic = Math.max(10, Math.round((this.simState.nextObstacleDistance + sensorNoise) * 10) / 10);

      if (this.onTelemetryCallback) {
        this.onTelemetryCallback({
          waterLevel: Math.round(calculatedWaterLevel * 10) / 10,
          ultrasonicDistance: measuredUltrasonic,
          batteryVoltage: Math.round(this.simState.batteryVoltage * 100) / 100,
          temperature: Math.round(this.simState.temp * 10) / 10,
          humidity: Math.round(this.simState.humidity),
          inclinePitch: Math.round(this.simState.pitch * 10) / 10,
          inclineRoll: Math.round(this.simState.roll * 10) / 10,
          distanceTraveled: Math.round(this.simState.distanceTraveled * 10) / 10,
          rssi: this.config.rssi,
        });
      }
    }, 250);
  }

  // Reset simulated obstacle to clear the path
  public resetSimulatedObstacle(distanceCm = 95) {
    this.simState.nextObstacleDistance = distanceCm;
    this.simState.autoBraked = false;
  }

  // Adjust simulated water level baseline for testing thresholds
  public injectWaterLevelAnomaly(targetMm: number) {
    this.simState.baseWaterLevel = targetMm;
    // Shift distance to a basin area
    this.simState.distanceTraveled = 22.0;
  }
}

export const esp32Service = new ESP32Service();
