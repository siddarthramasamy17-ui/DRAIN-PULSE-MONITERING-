/**
 * DRAIN PULSE - Water Level Sensor Feed & Live Graph
 * Real-time continuous time-series chart with configurable thresholds, push notifications, and flood indicators
 */

import React, { useState, useMemo } from 'react';
import {
  Droplets,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Bell,
  BellRing,
  Sliders,
  Sparkles,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { TelemetryPoint, WaterLevelData } from '../types/rover';
import { pushNotifier } from '../utils/notifications';
import { esp32Service } from '../services/esp32Service';

interface WaterLevelMonitorProps {
  telemetryHistory: TelemetryPoint[];
  waterData: WaterLevelData;
  onUpdateThresholds: (warning: number, critical: number) => void;
  pipeId: string;
  distanceTraveled: number;
}

export const WaterLevelMonitor: React.FC<WaterLevelMonitorProps> = ({
  telemetryHistory,
  waterData,
  onUpdateThresholds,
  pipeId,
  distanceTraveled,
}) => {
  const [timeWindowSeconds, setTimeWindowSeconds] = useState<30 | 60 | 180>(60);
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>(pushNotifier.getPermission());
  const [tempWarning, setTempWarning] = useState(waterData.warningThreshold);
  const [tempCritical, setTempCritical] = useState(waterData.criticalThreshold);
  const [testNotificationResult, setTestNotificationResult] = useState<string | null>(null);

  // Filter telemetry for selected time window
  const windowHistory = useMemo(() => {
    const cutoff = Date.now() - timeWindowSeconds * 1000;
    const filtered = telemetryHistory.filter((pt) => pt.timestamp >= cutoff);
    return filtered.length > 0 ? filtered : telemetryHistory.slice(-25);
  }, [telemetryHistory, timeWindowSeconds]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (windowHistory.length === 0) {
      return { min: waterData.currentLevel, max: waterData.currentLevel, avg: waterData.currentLevel };
    }
    const levels = windowHistory.map((p) => p.waterLevel);
    const min = Math.min(...levels);
    const max = Math.max(...levels);
    const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
    return { min, max, avg };
  }, [windowHistory, waterData.currentLevel]);

  // Handle push notification permission request
  const handleRequestPush = async () => {
    const perm = await pushNotifier.requestPermission();
    setPushStatus(perm);
    if (perm === 'granted') {
      const sent = await pushNotifier.sendTestNotification();
      setTestNotificationResult(sent ? 'Push alerts enabled and verified!' : 'Push permission granted.');
    } else {
      setTestNotificationResult('Notifications were declined or not permitted in browser.');
    }
    setTimeout(() => setTestNotificationResult(null), 4000);
  };

  const handleTestAlert = async () => {
    const sent = await pushNotifier.sendTestNotification();
    if (sent) {
      setTestNotificationResult('Test alert sent to your device!');
    } else {
      setTestNotificationResult('Please enable notification permissions first.');
    }
    setTimeout(() => setTestNotificationResult(null), 4000);
  };

  const handleSaveThresholds = () => {
    onUpdateThresholds(tempWarning, tempCritical);
    setShowThresholdSettings(false);
  };

  // Trigger simulated surge to test alarms
  const handleSimulateSurge = () => {
    esp32Service.injectWaterLevelAnomaly(waterData.criticalThreshold + 12);
  };

  // SVG Chart Dimensions & Scale
  const chartHeight = 170;
  const chartWidth = 520;
  const padding = { top: 20, right: 35, bottom: 25, left: 45 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Maximum scale: at least critical threshold + 25mm, or highest reading
  const maxScaleMm = Math.max(waterData.criticalThreshold + 25, stats.max + 10, 100);

  // Generate SVG Path for the continuous water level line
  const { pathD, areaD, points } = useMemo(() => {
    if (windowHistory.length === 0) {
      return { pathD: '', areaD: '', points: [] };
    }

    const firstTime = windowHistory[0].timestamp;
    const lastTime = windowHistory[windowHistory.length - 1].timestamp;
    const timeSpan = Math.max(1000, lastTime - firstTime);

    const pts = windowHistory.map((item) => {
      const xPercent = windowHistory.length === 1 ? 1 : (item.timestamp - firstTime) / timeSpan;
      const x = padding.left + xPercent * innerWidth;
      const yNorm = Math.min(1, Math.max(0, item.waterLevel / maxScaleMm));
      const y = padding.top + (1 - yNorm) * innerHeight;
      return { x, y, level: item.waterLevel, time: item.timestamp };
    });

    let p = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cx = (prev.x + curr.x) / 2;
      p += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const lastPt = pts[pts.length - 1];
    const firstPt = pts[0];
    const zeroY = padding.top + innerHeight;
    const a = `${p} L ${lastPt.x} ${zeroY} L ${firstPt.x} ${zeroY} Z`;

    return { pathD: p, areaD: a, points: pts };
  }, [windowHistory, maxScaleMm, innerWidth, innerHeight]);

  // Critical & Warning Line Y coords
  const criticalY = padding.top + (1 - Math.min(1, waterData.criticalThreshold / maxScaleMm)) * innerHeight;
  const warningY = padding.top + (1 - Math.min(1, waterData.warningThreshold / maxScaleMm)) * innerHeight;

  return (
    <div className="flex flex-col bg-[#0b0f19] border border-cyan-500/20 rounded-xl p-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-lg border ${
              waterData.status === 'critical'
                ? 'bg-red-950/80 border-red-500/80 text-red-400 glow-red animate-pulse'
                : waterData.status === 'warning'
                ? 'bg-amber-950/80 border-amber-500/80 text-amber-400 glow-amber'
                : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400 glow-cyan'
            }`}
          >
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-base tracking-wide text-slate-100 uppercase">
                Drain Water Level Feed
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
                  waterData.status === 'critical'
                    ? 'bg-red-500/20 border-red-500 text-red-300 animate-pulse'
                    : waterData.status === 'warning'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                }`}
              >
                {waterData.status === 'critical' ? 'CRITICAL EXCEEDED' : waterData.status === 'warning' ? 'HIGH WARNING' : 'NORMAL LEVEL'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Hydrostatic Sensor (Pin A0 / ADC1) • Pipe: [{pipeId}]
            </p>
          </div>
        </div>

        {/* Controls & Push Notification Status */}
        <div className="flex items-center gap-2">
          {pushStatus !== 'granted' ? (
            <button
              onClick={handleRequestPush}
              title="Enable Web Push Notifications for Critical Alerts"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-300 text-xs font-mono font-semibold transition-all shadow-md animate-pulse"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Push Alerts</span>
            </button>
          ) : (
            <button
              onClick={handleTestAlert}
              title="Push Notifications Active - Click to Test Alert"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs font-mono transition-colors"
            >
              <BellRing className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Push Active</span>
            </button>
          )}

          <button
            onClick={() => setShowThresholdSettings(!showThresholdSettings)}
            title="Configure Warning & Critical Water Thresholds"
            className="p-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Critical Alert Warning Banner if exceeded */}
      {waterData.status === 'critical' && (
        <div className="my-2 p-2.5 rounded-lg bg-red-950/80 border border-red-500/80 text-red-200 flex items-center justify-between gap-3 animate-pulse glow-red">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <div className="text-xs font-mono">
              <strong className="text-red-300 uppercase">Emergency Flood Warning:</strong> Water level of{' '}
              <span className="underline font-bold text-white">{waterData.currentLevel.toFixed(1)}mm</span> exceeds safety limit (
              {waterData.criticalThreshold}mm). Stop rover advance or reverse to higher gradient!
            </div>
          </div>
          <button
            onClick={() => esp32Service.resetSimulatedObstacle()}
            className="px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-[11px] font-mono text-white whitespace-nowrap"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Threshold Configuration Drawer */}
      {showThresholdSettings && (
        <div className="my-2 p-3 rounded-lg bg-[#080d16] border border-cyan-500/30 text-xs font-mono space-y-3">
          <div className="flex items-center justify-between text-cyan-300 font-bold">
            <span>THRESHOLD PARAMETERS & FLOOD SAFETY</span>
            <button
              onClick={() => setShowThresholdSettings(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-amber-300 mb-1">
                <span>Warning Limit:</span>
                <span className="font-bold">{tempWarning} mm</span>
              </div>
              <input
                type="range"
                min={20}
                max={150}
                value={tempWarning}
                onChange={(e) => setTempWarning(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-red-400 mb-1">
                <span>Critical Push Alert Limit:</span>
                <span className="font-bold">{tempCritical} mm</span>
              </div>
              <input
                type="range"
                min={40}
                max={200}
                value={tempCritical}
                onChange={(e) => setTempCritical(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleSimulateSurge}
              className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-[11px]"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simulate High Water Anomaly</span>
            </button>

            <button
              onClick={handleSaveThresholds}
              className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
            >
              Save Thresholds
            </button>
          </div>
        </div>
      )}

      {/* Quick Status / Meter Readout Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3">
        {/* Current Depth */}
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400">Current Depth</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`font-mono font-bold text-2xl ${
                waterData.status === 'critical'
                  ? 'text-red-400'
                  : waterData.status === 'warning'
                  ? 'text-amber-400'
                  : 'text-cyan-400'
              }`}
            >
              {waterData.currentLevel.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400">mm</span>
            <span className="text-[11px] text-slate-500 ml-1">
              ({(waterData.currentLevel / 10).toFixed(1)}cm)
            </span>
          </div>
        </div>

        {/* Capacity / Drain Fill % */}
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
            <span>Pipe Capacity</span>
            <span>{waterData.percentFull.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full transition-all duration-300 ${
                waterData.percentFull > 65
                  ? 'bg-red-500'
                  : waterData.percentFull > 40
                  ? 'bg-amber-400'
                  : 'bg-cyan-400'
              }`}
              style={{ width: `${Math.min(100, waterData.percentFull)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-1">
            Ø {waterData.pipeDiameter}mm Storm Conduit
          </span>
        </div>

        {/* Flow Trend */}
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400">Hydraulic Trend</span>
          <div className="flex items-center gap-1.5 mt-1">
            {waterData.trend === 'rising' ? (
              <TrendingUp className="w-5 h-5 text-amber-400" />
            ) : waterData.trend === 'falling' ? (
              <TrendingDown className="w-5 h-5 text-emerald-400" />
            ) : (
              <Minus className="w-5 h-5 text-cyan-400" />
            )}
            <span
              className={`font-mono text-sm font-semibold capitalize ${
                waterData.trend === 'rising'
                  ? 'text-amber-400'
                  : waterData.trend === 'falling'
                  ? 'text-emerald-400'
                  : 'text-slate-300'
              }`}
            >
              {waterData.trend}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {waterData.rateOfChange > 0 ? `+${waterData.rateOfChange.toFixed(1)}` : waterData.rateOfChange.toFixed(1)} mm/min
          </span>
        </div>

        {/* Window Stats (Min / Max / Avg) */}
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between font-mono text-[11px]">
          <span className="text-slate-400">Window Extents</span>
          <div className="grid grid-cols-3 gap-1 mt-1 text-center">
            <div>
              <span className="text-slate-500 block text-[9px]">MIN</span>
              <span className="text-slate-200 font-semibold">{stats.min.toFixed(0)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">AVG</span>
              <span className="text-cyan-300 font-semibold">{stats.avg.toFixed(0)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">MAX</span>
              <span className="text-amber-400 font-semibold">{stats.max.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Time-Series Chart */}
      <div className="relative w-full overflow-hidden rounded-lg bg-[#070a12] border border-slate-800/80 p-2">
        {/* Time window selector overlay */}
        <div className="absolute top-2.5 right-3 z-10 flex items-center gap-1 bg-slate-900/80 border border-slate-700/80 rounded p-0.5 text-[10px] font-mono">
          {([30, 60, 180] as const).map((secs) => (
            <button
              key={secs}
              onClick={() => setTimeWindowSeconds(secs)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                timeWindowSeconds === secs
                  ? 'bg-cyan-500/30 text-cyan-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {secs >= 60 ? `${secs / 60}m` : `${secs}s`}
            </button>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-44 select-none"
        >
          <defs>
            {/* Gradient for water depth fill */}
            <linearGradient id="waterChartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
              <stop offset="40%" stopColor="#0284c7" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id="glowLine" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + ratio * innerHeight;
            const levelVal = Math.round(maxScaleMm * (1 - ratio));
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="'JetBrains Mono', monospace"
                  textAnchor="end"
                >
                  {levelVal}
                </text>
              </g>
            );
          })}

          {/* Warning Threshold Line */}
          <line
            x1={padding.left}
            y1={warningY}
            x2={chartWidth - padding.right}
            y2={warningY}
            stroke="#f59e0b"
            strokeWidth="1.2"
            strokeDasharray="4 3"
            opacity="0.85"
          />
          <text
            x={chartWidth - padding.right + 4}
            y={warningY + 3}
            fill="#f59e0b"
            fontSize="8"
            fontFamily="'JetBrains Mono', monospace"
          >
            WARN {waterData.warningThreshold}
          </text>

          {/* Critical Threshold Line */}
          <line
            x1={padding.left}
            y1={criticalY}
            x2={chartWidth - padding.right}
            y2={criticalY}
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="6 3"
            opacity="0.95"
          />
          <text
            x={chartWidth - padding.right + 4}
            y={criticalY + 3}
            fill="#ef4444"
            fontSize="8"
            fontWeight="bold"
            fontFamily="'JetBrains Mono', monospace"
          >
            CRIT {waterData.criticalThreshold}
          </text>

          {/* Area Fill under curve */}
          {areaD && <path d={areaD} fill="url(#waterChartGrad)" />}

          {/* Continuous Water Level Curve */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2.4"
              strokeLinecap="round"
              filter="url(#glowLine)"
            />
          )}

          {/* Current Latest Point Indicator */}
          {points.length > 0 && (
            <g transform={`translate(${points[points.length - 1].x}, ${points[points.length - 1].y})`}>
              <circle r="4" fill="#06b6d4" />
              <circle r="7" fill="none" stroke="#67e8f9" strokeWidth="1.5" className="animate-ping" />
            </g>
          )}

          {/* X Axis Time Labels */}
          <text
            x={padding.left}
            y={chartHeight - 6}
            fill="#64748b"
            fontSize="8"
            fontFamily="'JetBrains Mono', monospace"
          >
            -{timeWindowSeconds}s
          </text>
          <text
            x={chartWidth / 2}
            y={chartHeight - 6}
            fill="#64748b"
            fontSize="8"
            fontFamily="'JetBrains Mono', monospace"
            textAnchor="middle"
          >
            Telemetry Timeline
          </text>
          <text
            x={chartWidth - padding.right}
            y={chartHeight - 6}
            fill="#38bdf8"
            fontSize="8"
            fontWeight="bold"
            fontFamily="'JetBrains Mono', monospace"
            textAnchor="end"
          >
            NOW (LIVE)
          </text>
        </svg>
      </div>

      {testNotificationResult && (
        <div className="mt-2 text-center text-xs font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 p-1.5 rounded animate-fade-in">
          {testNotificationResult}
        </div>
      )}
    </div>
  );
};
