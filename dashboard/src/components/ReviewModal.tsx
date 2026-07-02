import { useEffect } from 'react';
import type { Review } from '../types';
import { X, ShieldAlert, AlertTriangle, Lightbulb, CheckCircle2, Terminal } from 'lucide-react';
import { format } from 'date-fns';

interface ReviewModalProps {
  review: Review;
  onClose: () => void;
}

export function ReviewModal({ review, onClose }: ReviewModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isCritical = review.estimatedRisk === 'high';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center ${
              isCritical ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'
            }`}>
              <Terminal size={16} />
            </div>
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">
                {review.repoFullName} • {format(new Date(review.reviewedAt), 'MMM d, yyyy HH:mm')}
              </div>
              <h2 className="text-base font-medium text-zinc-100 flex items-center gap-2">
                {review.prTitle}
                <a 
                  href={review.prUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-amber-500 hover:text-amber-400 font-mono text-sm"
                >
                  #{review.prNumber}
                </a>
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Summary Section */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-3">AI Summary</h3>
            <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800 text-sm text-zinc-300 leading-relaxed">
              {review.summary}
            </div>
          </section>

          {/* Metrics Strip */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Risk Level</span>
              <span className={`text-sm font-bold uppercase tracking-wider ${
                isCritical ? 'text-red-400' : review.estimatedRisk === 'medium' ? 'text-amber-500' : 'text-zinc-300'
              }`}>
                {review.estimatedRisk || 'Unknown'}
              </span>
            </div>
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Input Tokens</span>
              <span className="text-sm font-mono text-zinc-300">{review.inputTokens?.toLocaleString() || 0}</span>
            </div>
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Output Tokens</span>
              <span className="text-sm font-mono text-zinc-300">{review.outputTokens?.toLocaleString() || 0}</span>
            </div>
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Processing Time</span>
              <span className="text-sm font-mono text-zinc-300">{((review.processingMs || 0) / 1000).toFixed(2)}s</span>
            </div>
          </section>

          {/* Issues */}
          {review.issues && review.issues.length > 0 && (
            <section>
              <h3 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-3">Identified Issues</h3>
              <div className="space-y-3">
                {review.issues.map((issue, idx) => {
                  const Icon = issue.severity === 'critical' ? ShieldAlert 
                    : issue.severity === 'warning' ? AlertTriangle 
                    : Lightbulb;
                  
                  const iconColor = issue.severity === 'critical' ? 'text-red-400' 
                    : issue.severity === 'warning' ? 'text-amber-500' 
                    : 'text-cyan-400';
                  
                  const bgColor = issue.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' 
                    : issue.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20' 
                    : 'bg-cyan-500/10 border-cyan-500/20';

                  return (
                    <div key={idx} className={`p-4 rounded-lg border ${bgColor} flex gap-4 items-start`}>
                      <div className={`mt-0.5 ${iconColor}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`text-[10px] uppercase tracking-widest font-bold ${iconColor}`}>
                            {issue.severity}
                          </span>
                          <span className="text-zinc-600 font-medium text-[10px] uppercase tracking-widest">•</span>
                          <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400">
                            {issue.category}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-200 leading-relaxed mb-3">
                          {issue.comment}
                        </p>
                        <div className="inline-flex px-2 py-1 bg-zinc-950/50 rounded font-mono text-xs text-zinc-400 border border-zinc-800/50">
                          {issue.file}{issue.line ? `:${issue.line}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Positives */}
          {review.positives && review.positives.length > 0 && (
            <section>
              <h3 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-3">Highlights</h3>
              <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800 space-y-2">
                {review.positives.map((positive, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-zinc-300">{positive}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
