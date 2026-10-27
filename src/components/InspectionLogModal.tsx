/**
 * DRAIN PULSE - Inspection Defect Log & Report Modal
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Trash2,
  AlertTriangle,
  FileText,
  Filter,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';
import { DefectItem, InspectionMetadata } from '../types/rover';

interface InspectionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  defects: DefectItem[];
  metadata: InspectionMetadata;
  onDeleteDefect: (id: string) => void;
  onClearDefects: () => void;
}

export const InspectionLogModal: React.FC<InspectionLogModalProps> = ({
  isOpen,
  onClose,
  defects,
  metadata,
  onDeleteDefect,
  onClearDefects,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  if (!isOpen) return null;

  const filteredDefects = defects.filter((d) => {
    if (filterType === 'ALL') return true;
    return d.severity === filterType.toLowerCase() || d.type === filterType;
  });

  // Export CSV Report
  const exportCsv = () => {
    const headers = ['Defect_ID', 'Timestamp_ISO', 'Distance_Meters', 'Defect_Type', 'Severity', 'Water_Depth_mm', 'Inspector_Notes'];
    const rows = defects.map((d) => [
      d.id,
      new Date(d.timestamp).toISOString(),
      d.distance.toFixed(2),
      d.type,
      d.severity.toUpperCase(),
      d.waterDepthMm.toFixed(1),
      `"${d.notes.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DRAIN_PULSE_Inspection_${metadata.pipeId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#0b0f19] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#080d16]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-100 uppercase tracking-wide">
                Drain Inspection Defect Log
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Pipe: [{metadata.pipeId}] • {metadata.pipeMaterial} Ø{metadata.pipeDiameterMm}mm • {metadata.location}
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

        {/* Action Toolbar */}
        <div className="p-3 sm:px-5 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-mono text-slate-400">Filter:</span>
            <div className="flex gap-1 text-xs font-mono">
              {['ALL', 'CRITICAL', 'MEDIUM', 'CRACK', 'OBSTACLE', 'HIGH_WATER'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                    filterType === f
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={defects.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-mono text-xs font-semibold shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {defects.length > 0 && (
              <button
                onClick={onClearDefects}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 font-mono text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Defects Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredDefects.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-mono text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              No defects recorded matching current filters.
              <p className="mt-1 text-slate-600">
                Use the "Tag Defect" button on the visual feed to log pipe cracks, root intrusions, or debris.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDefects.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Snapshot thumbnail */}
                    {d.snapshotUrl ? (
                      <img
                        src={d.snapshotUrl}
                        alt="Defect Snapshot"
                        className="w-16 h-12 object-cover rounded border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-12 rounded bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{d.type}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase border ${
                            d.severity === 'critical'
                              ? 'bg-red-500/20 border-red-500 text-red-300'
                              : d.severity === 'medium'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-blue-500/20 border-blue-500 text-blue-300'
                          }`}
                        >
                          {d.severity}
                        </span>
                        <span className="text-cyan-400 font-semibold">@ {d.distance.toFixed(1)}m</span>
                      </div>
                      <p className="text-slate-300 mt-1">{d.notes}</p>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex gap-3">
                        <span>Water Level: {d.waterDepthMm.toFixed(1)}mm</span>
                        <span>Time: {new Date(d.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteDefect(d.id)}
                    title="Delete entry"
                    className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors self-end sm:self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Summary */}
        <div className="p-3 sm:px-5 bg-[#080d16] border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div>
            Total Logged Defects: <strong className="text-slate-200">{defects.length}</strong> (
            <span className="text-red-400 font-semibold">{defects.filter((d) => d.severity === 'critical').length} Critical</span>)
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
