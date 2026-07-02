import type { Stats } from '../types';
import { ShieldAlert, AlertTriangle, Lightbulb, Clock, Coins, Layers } from 'lucide-react';

interface StatCardsProps {
  stats: Stats | null;
  loading: boolean;
}

export function StatCards({ stats, loading }: StatCardsProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
          <div className="h-32 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
        </div>
        <div className="h-16 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (!stats) return null;

  const hasCritical = stats.issues.criticalIssues > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Primary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Reviews Card */}
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Layers size={80} strokeWidth={1} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <span className="text-[10px] uppercase tracking-widest font-semibold">Total Processed</span>
            </div>
            <h3 className="text-zinc-500 text-sm font-medium">Pull Requests</h3>
          </div>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-5xl font-mono tracking-tight text-zinc-100">
              {stats.totalReviews.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Critical Issues Card (Changes style based on count) */}
        <div className={`p-6 rounded-xl border flex flex-col justify-between relative overflow-hidden transition-colors ${
          hasCritical 
            ? 'bg-red-950/20 border-red-900/40' 
            : 'bg-zinc-900 border-zinc-800'
        }`}>
          <div className={`absolute top-0 right-0 p-6 transition-opacity ${
            hasCritical ? 'opacity-20 text-red-500' : 'opacity-10 text-zinc-500'
          }`}>
            <ShieldAlert size={80} strokeWidth={1} />
          </div>
          <div>
            <div className={`flex items-center gap-2 mb-1 ${hasCritical ? 'text-red-400' : 'text-zinc-400'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${hasCritical ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-zinc-500'}`} />
              <span className="text-[10px] uppercase tracking-widest font-semibold">Security & Bugs</span>
            </div>
            <h3 className={`${hasCritical ? 'text-red-300/70' : 'text-zinc-500'} text-sm font-medium`}>
              Critical Issues Detected
            </h3>
          </div>
          <div className="mt-6 flex items-baseline gap-2">
            <span className={`text-5xl font-mono tracking-tight ${hasCritical ? 'text-red-400' : 'text-zinc-100'}`}>
              {stats.issues.criticalIssues.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Secondary Bento Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800 rounded-xl overflow-hidden border border-zinc-800">
        
        <div className="bg-zinc-900 p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-[10px] uppercase tracking-widest font-medium text-zinc-500">Warnings</span>
          </div>
          <span className="text-2xl font-mono text-zinc-100">{stats.issues.warningIssues.toLocaleString()}</span>
        </div>

        <div className="bg-zinc-900 p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={14} className="text-cyan-500" />
            <span className="text-[10px] uppercase tracking-widest font-medium text-zinc-500">Suggestions</span>
          </div>
          <span className="text-2xl font-mono text-zinc-100">{stats.issues.suggestionIssues.toLocaleString()}</span>
        </div>

        <div className="bg-zinc-900 p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-zinc-500" />
            <span className="text-[10px] uppercase tracking-widest font-medium text-zinc-500">Avg Time</span>
          </div>
          <span className="text-xl font-mono text-zinc-300">{(stats.tokens.avgProcessingMs / 1000).toFixed(1)}s</span>
        </div>

        <div className="bg-zinc-900 p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Coins size={14} className="text-zinc-500" />
            <span className="text-[10px] uppercase tracking-widest font-medium text-zinc-500">Tokens</span>
          </div>
          <span className="text-xl font-mono text-zinc-300">
            {((stats.tokens.totalInputTokens + stats.tokens.totalOutputTokens) / 1000).toFixed(0)}k
          </span>
        </div>

      </div>
    </div>
  );
}
