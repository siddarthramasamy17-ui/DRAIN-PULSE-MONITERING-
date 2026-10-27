/**
 * DRAIN PULSE - Connection & Telemetry Settings Modal
 */

import React, { useState } from 'react';
import {
  Settings,
  Wifi,
  Cpu,
  Radio,
  Sliders,
  Bell,
  Volume2,
  Check,
  Save,
  Layers,
  Info
} from 'lucide-react';
import { ConnectionConfig, InspectionMetadata } from '../types/rover';
import { pushNotifier } from '../utils/notifications';

interface ConnectionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConnectionConfig;
  onSaveConfig: (updated: Partial<ConnectionConfig>) => void;
  metadata: InspectionMetadata;
  onSaveMetadata: (updated: Partial<InspectionMetadata>) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const ConnectionSettingsModal: React.FC<ConnectionSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  metadata,
  onSaveMetadata,
  soundEnabled,
  onToggleSound,
}) => {
  const [mode, setMode] = useState<ConnectionConfig['mode']>(config.mode);
  const [ip, setIp] = useState(config.esp32Ip);
  const [wsPort, setWsPort] = useState(config.webSocketPort);
  const [httpPort, setHttpPort] = useState(config.httpPort);
  const [streamPath, setStreamPath] = useState(config.streamPath);
  const [protocol, setProtocol] = useState<ConnectionConfig['commandProtocol']>(config.commandProtocol);

  // Metadata
  const [pipeId, setPipeId] = useState(metadata.pipeId);
  const [location, setLocation] = useState(metadata.location);
  const [pipeMaterial, setPipeMaterial] = useState(metadata.pipeMaterial);
  const [pipeDiameter, setPipeDiameter] = useState(metadata.pipeDiameterMm);
  const [operator, setOperator] = useState(metadata.operatorName);

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      mode,
      esp32Ip: ip.trim(),
      webSocketPort: Number(wsPort),
      httpPort: Number(httpPort),
      streamPath: streamPath.trim(),
      commandProtocol: protocol,
    });

    onSaveMetadata({
      pipeId: pipeId.trim() || 'PIPE-TR-01',
      location: location.trim() || 'City Storm Sewer',
      pipeMaterial,
      pipeDiameterMm: Number(pipeDiameter),
      operatorName: operator.trim(),
    });

    onClose();
  };

  const handleTestPush = async () => {
    try {
      const success = await pushNotifier.sendTestNotification();
      setNotificationMsg(
        success ? 'Test Push Notification dispatched!' : 'In-app alert verified (browser push not permitted in this frame).'
      );
    } catch {
      setNotificationMsg('In-app alert active.');
    }
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0b0f19] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#080d16]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-100 uppercase tracking-wide">
                System & Telemetry Settings
              </h2>
              <p className="text-xs font-mono text-slate-400">
                ESP32 Hardware link, stream endpoints, and pipe inspection session
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 font-mono text-xs text-slate-300">
          {/* Operation Mode Selector */}
          <div>
            <label className="block text-slate-400 mb-2 font-bold uppercase tracking-wider text-[11px]">
              Connection Mode:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('simulation')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  mode === 'simulation'
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 glow-cyan'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>Drainage Simulator</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Interactive physics sandbox with simulated water level, obstacle approach, and camera.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('hardware')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  mode === 'hardware'
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 glow-cyan'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Wifi className="w-4 h-4 text-cyan-400" />
                  <span>Live ESP32-CAM Rover</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Connects to physical ESP32 via WiFi AP (192.168.4.1) or local area network IP.
                </p>
              </button>
            </div>
          </div>

          {/* Hardware Network Details (only relevant if hardware or config) */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <span className="font-bold text-slate-200 block text-xs uppercase text-cyan-400">
              ESP32 Network Endpoints
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">ESP32 IP Address:</label>
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="192.168.4.1"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Camera Stream Path:</label>
                <input
                  type="text"
                  value={streamPath}
                  onChange={(e) => setStreamPath(e.target.value)}
                  placeholder=":81/stream"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">WebSocket Port:</label>
                <input
                  type="number"
                  value={wsPort}
                  onChange={(e) => setWsPort(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">HTTP REST Port:</label>
                <input
                  type="number"
                  value={httpPort}
                  onChange={(e) => setHttpPort(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Inspection Metadata */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <span className="font-bold text-slate-200 block text-xs uppercase text-cyan-400">
              Pipe Inspection Job Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Conduit ID:</label>
                <input
                  type="text"
                  value={pipeId}
                  onChange={(e) => setPipeId(e.target.value)}
                  placeholder="PIPE-TR-402"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Location / Street:</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Main St Storm Trunk"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Pipe Material:</label>
                <select
                  value={pipeMaterial}
                  onChange={(e) => setPipeMaterial(e.target.value as InspectionMetadata['pipeMaterial'])}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                >
                  <option value="Concrete">Reinforced Concrete</option>
                  <option value="PVC">Smooth PVC</option>
                  <option value="Corrugated Steel">Corrugated Galvanized Steel</option>
                  <option value="Clay">Vitrified Clay</option>
                  <option value="HDPE">Corrugated HDPE</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Diameter (mm):</label>
                <input
                  type="number"
                  value={pipeDiameter}
                  onChange={(e) => setPipeDiameter(Number(e.target.value))}
                  placeholder="300"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notifications & Audio Testing */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-200 block text-xs">Push Notifications & Alarms</span>
              <p className="text-[11px] text-slate-400">
                Dispatches high-priority alerts to desktop/mobile when water exceeds critical limit.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestPush}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Test Push Alert</span>
              </button>

              <button
                type="button"
                onClick={onToggleSound}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${
                  soundEnabled
                    ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {notificationMsg && (
            <div className="p-2 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-200 text-center text-xs animate-fade-in">
              {notificationMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-6 bg-[#080d16] border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold shadow-lg glow-cyan transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
