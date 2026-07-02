import { useState } from 'react';
import type { PaginatedReviews, Review } from '../types';
import { ReviewModal } from './ReviewModal';
import { GitPullRequest, RefreshCw, ChevronRight, Terminal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReviewsTableProps {
  data: PaginatedReviews | null;
  loading: boolean;
  onRefresh: () => void;
}

export function ReviewsTable({ data, loading, onRefresh }: ReviewsTableProps) {
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="h-14 border-b border-zinc-800 px-4 flex items-center bg-zinc-900/50">
          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-zinc-800/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // --- Empty State ---
  if (!data || data.reviews.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 mb-6 shadow-sm">
          <GitPullRequest size={24} />
        </div>
        <h3 className="text-zinc-100 font-medium mb-2">No reviews yet</h3>
        <p className="text-zinc-400 text-sm max-w-sm mb-8">
          The AI reviewer is active but hasn't received any webhook events. Follow these steps to trigger your first review:
        </p>
        
        <div className="text-left w-full max-w-md space-y-4">
          <div className="flex gap-4 relative">
            <div className="absolute left-[11px] top-7 bottom-[-20px] w-px bg-zinc-800" />
            <div className="w-6 h-6 rounded-full bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center justify-center shrink-0 z-10">1</div>
            <div className="pt-0.5">
              <div className="text-sm font-medium text-zinc-200">Open a Pull Request</div>
              <div className="text-xs text-zinc-500 mt-1">Create or update a PR in your configured GitHub repository.</div>
            </div>
          </div>
          
          <div className="flex gap-4 relative">
            <div className="absolute left-[11px] top-7 bottom-[-20px] w-px bg-zinc-800" />
            <div className="w-6 h-6 rounded-full bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center justify-center shrink-0 z-10">2</div>
            <div className="pt-0.5">
              <div className="text-sm font-medium text-zinc-200">Check Webhook Delivery</div>
              <div className="text-xs text-zinc-500 mt-1 font-mono">Settings &gt; GitHub Apps &gt; Advanced</div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-6 h-6 rounded-full bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-amber-500 border-amber-500/30 bg-amber-500/10 flex items-center justify-center shrink-0 z-10">3</div>
            <div className="pt-0.5">
              <div className="text-sm font-medium text-zinc-200">Review Appears Here</div>
              <div className="text-xs text-zinc-500 mt-1">Metrics and code suggestions will populate automatically.</div>
            </div>
          </div>
        </div>

        <button 
          onClick={onRefresh}
          className="mt-10 flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 transition-colors font-medium"
        >
          <RefreshCw size={14} />
          Refresh Dashboard
        </button>
      </div>
    );
  }

  // --- Populated State ---
  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
        {/* Table Header / Toolbar */}
        <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
            <Terminal size={14} className="text-zinc-500" />
            Recent Reviews
          </h2>
          <button 
            onClick={onRefresh}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/50 bg-zinc-900/50">
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-semibold text-zinc-500 w-24">PR</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Repository & Title</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-semibold text-zinc-500 w-32">Status</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-semibold text-zinc-500 w-32">Risk</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-semibold text-zinc-500 text-right w-40">Time</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {data.reviews.map((review) => {
                const isCritical = review.estimatedRisk === 'high';
                return (
                  <tr 
                    key={review._id} 
                    onClick={() => setSelectedReview(review)}
                    className="group hover:bg-zinc-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 align-top">
                      <a 
                        href={review.prUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-mono text-sm text-amber-500 hover:text-amber-400 transition-colors"
                      >
                        #{review.prNumber}
                      </a>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-xs text-zinc-500 mb-1">{review.repoFullName}</div>
                      <div className="text-sm font-medium text-zinc-200 group-hover:text-amber-400 transition-colors truncate max-w-md">
                        {review.prTitle}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800/50 text-xs font-medium text-zinc-300">
                        {review.status === 'success' && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                        {review.status === 'failed' && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                        {review.status === 'no_changes' && <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />}
                        <span className="capitalize">{review.status.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                        isCritical 
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                          : review.estimatedRisk === 'medium'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {review.estimatedRisk || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="text-sm font-mono text-zinc-400">
                        {formatDistanceToNow(new Date(review.reviewedAt), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <ChevronRight size={16} className="text-zinc-600 group-hover:text-amber-500 transition-colors" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="h-12 border-t border-zinc-800 px-4 flex items-center justify-between bg-zinc-900/50 text-xs font-mono text-zinc-500">
          <div>
            Showing <span className="text-zinc-300">{data.reviews.length}</span> of <span className="text-zinc-300">{data.pagination.total}</span> reviews
          </div>
          <div>
            Page <span className="text-zinc-300">{data.pagination.page}</span> / {data.pagination.pages}
          </div>
        </div>
      </div>

      {selectedReview && (
        <ReviewModal review={selectedReview} onClose={() => setSelectedReview(null)} />
      )}
    </>
  );
}
