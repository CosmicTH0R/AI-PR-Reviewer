import { useEffect, useState } from 'react';
import type { Stats, PaginatedReviews } from './types';
import { fetchStats, fetchReviews } from './api';
import { StatCards } from './components/StatCards';
import { ReviewsTable } from './components/ReviewsTable';
import { GitPullRequest, LayoutDashboard, Settings, Activity, Server, FileText } from 'lucide-react';

// --- Mock Data ---
const MOCK_STATS: Stats = {
  totalReviews: 1284,
  issues: {
    totalIssues: 412,
    criticalIssues: 3,
    warningIssues: 45,
    suggestionIssues: 364,
  },
  tokens: {
    totalInputTokens: 12500000,
    totalOutputTokens: 840000,
    avgProcessingMs: 4200,
  }
};

const MOCK_REVIEWS: PaginatedReviews = {
  pagination: { page: 1, limit: 10, total: 1284, pages: 129 },
  reviews: [
    {
      _id: 'mock1',
      prUrl: '#',
      repoFullName: 'CosmicTH0R/AI-PR-Reviewer',
      prNumber: 42,
      prTitle: 'feat: rebuild dashboard with tailwind',
      headSha: 'a1b2c3d',
      reviewedAt: new Date().toISOString(),
      issues: [
        { file: 'src/App.tsx', line: 45, severity: 'critical', category: 'security', comment: 'Hardcoded secret found in component state.' }
      ],
      summary: 'Added new UI components. One critical security issue identified.',
      estimatedRisk: 'high',
      positives: ['Clean component structure'],
      inputTokens: 14500,
      outputTokens: 850,
      processingMs: 3400,
      truncated: false,
      truncatedFileCount: 0,
      status: 'success'
    },
    {
      _id: 'mock2',
      prUrl: '#',
      repoFullName: 'CosmicTH0R/AI-PR-Reviewer',
      prNumber: 41,
      prTitle: 'fix: resolving github api rate limits',
      headSha: 'f8e9d0c',
      reviewedAt: new Date(Date.now() - 3600000).toISOString(),
      issues: [
        { file: 'src/services/github.ts', line: null, severity: 'warning', category: 'logic', comment: 'Consider adding exponential backoff.' }
      ],
      summary: 'Rate limit handling improved. Minor warnings on retry logic.',
      estimatedRisk: 'medium',
      positives: ['Good use of Octokit built-in plugins'],
      inputTokens: 8200,
      outputTokens: 420,
      processingMs: 2100,
      truncated: false,
      truncatedFileCount: 0,
      status: 'success'
    },
    {
      _id: 'mock3',
      prUrl: '#',
      repoFullName: 'CosmicTH0R/AI-PR-Reviewer',
      prNumber: 40,
      prTitle: 'docs: update README deployment guide',
      headSha: '9a8b7c6',
      reviewedAt: new Date(Date.now() - 86400000).toISOString(),
      issues: [],
      summary: 'Documentation updates only. No code changes detected.',
      estimatedRisk: 'low',
      positives: ['Clear instructions', 'Good markdown formatting'],
      inputTokens: 2100,
      outputTokens: 150,
      processingMs: 950,
      truncated: false,
      truncatedFileCount: 0,
      status: 'success'
    }
  ]
};

export default function App() {
  const [useMock, setUseMock] = useState(false);
  
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviewsData, setReviewsData] = useState<PaginatedReviews | null>(null);
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    if (useMock) {
      setStats(MOCK_STATS);
      setReviewsData(MOCK_REVIEWS);
      setLoadingStats(false);
      setLoadingReviews(false);
      return;
    }

    setLoadingStats(true);
    setLoadingReviews(true);

    fetchStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoadingStats(false));

    fetchReviews(1, 10)
      .then(setReviewsData)
      .catch(console.error)
      .finally(() => setLoadingReviews(false));
  }, [useMock]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex font-sans selection:bg-amber-500/30">
      
      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-900/50 flex flex-col sticky top-0 h-screen">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-500 shadow-sm">
              <GitPullRequest size={18} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-zinc-100">Reviewer</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Platform</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md bg-amber-500/10 text-amber-500 relative transition-colors">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full" />
            <LayoutDashboard size={16} />
            Dashboard
          </button>
          
          <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors">
            <FileText size={16} />
            All Reviews
          </button>
          
          <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors">
            <Activity size={16} />
            Metrics
          </button>
          
          <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors">
            <Settings size={16} />
            Settings
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-medium text-zinc-400">System Live</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-600">v1.2.0</span>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Topbar */}
        <header className="h-16 px-8 flex items-center justify-between border-b border-transparent">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-full px-1 py-1">
              <button 
                onClick={() => setUseMock(false)}
                className={`text-xs font-medium px-3 py-1 rounded-full transition-all ${!useMock ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Live Data
              </button>
              <button 
                onClick={() => setUseMock(true)}
                className={`text-xs font-medium px-3 py-1 rounded-full transition-all ${useMock ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Mock Data
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <a 
              href="https://github.com/CosmicTH0R/AI-PR-Reviewer" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <Server size={14} />
              GitHub
            </a>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 pt-4 flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            <StatCards stats={stats} loading={loadingStats} />
            <ReviewsTable data={reviewsData} loading={loadingReviews} onRefresh={() => setUseMock(useMock)} />
          </div>
        </div>

      </main>
    </div>
  );
}
