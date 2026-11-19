'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Search, ExternalLink, CheckCircle2, Clock, Circle,
  Building2, Flame, ArrowUpDown, BookOpen, ChevronDown,
  X, Shuffle, LogOut, User, Zap, Target, Hash, Percent,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
interface QuestionItem {
  id: number;
  title: string;
  url: string | null;
  difficulty: string;
  acceptance: number;
  frequency: number;
  status: 'SOLVED' | 'ATTEMPTED' | 'TODO';
  notes?: string;
}

interface CompanyItem {
  id: number;
  name: string;
  questionCount: number;
}

// ── Constants ──────────────────────────────────────────────────
const TOP_COMPANIES = [
  'google', 'meta', 'amazon', 'apple', 'microsoft',
  'uber', 'netflix', 'bloomberg', 'bytedance', 'nvidia',
  'adobe', 'goldman-sachs', 'stripe', 'tiktok',
];

const TIMEFRAMES = [
  { key: 'thirty-days',           label: '30d',      long: 'Last 30 days' },
  { key: 'three-months',          label: '3mo',      long: 'Last 3 months' },
  { key: 'six-months',            label: '6mo',      long: 'Last 6 months' },
  { key: 'more-than-six-months',  label: '1y+',      long: 'Over 6 months' },
  { key: 'all',                   label: 'All',      long: 'All time' },
];

function formatCompanyName(slug: string) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Main Component ─────────────────────────────────────────────
export default function Dashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // Redirect to login if not authed
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  // ─ State ──────────────────────────────────────────
  const [company, setCompany] = useState('google');
  const [timeframe, setTimeframe] = useState('thirty-days');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [allCompanies, setAllCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'frequency' | 'difficulty' | 'acceptance' | 'id'>('frequency');

  const [companyModal, setCompanyModal] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [notesModal, setNotesModal] = useState<QuestionItem | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // ─ Data Loading ───────────────────────────────────
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    fetch('/api/companies')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setAllCompanies(d); })
      .catch(console.error);
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    setLoading(true);
    fetch(`/api/questions?company=${encodeURIComponent(company)}&timeframe=${encodeURIComponent(timeframe)}`)
      .then((r) => r.json())
      .then((d) => setQuestions(d.questions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [company, timeframe, sessionStatus]);

  // ─ Handlers ───────────────────────────────────────
  const toggleStatus = async (qId: number) => {
    const q = questions.find((x) => x.id === qId);
    if (!q) return;
    const next = q.status === 'TODO' ? 'ATTEMPTED' : q.status === 'ATTEMPTED' ? 'SOLVED' : 'TODO';
    setQuestions((prev) => prev.map((x) => (x.id === qId ? { ...x, status: next } : x)));
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: qId, status: next }),
    }).catch(console.error);
  };

  const saveNote = async () => {
    if (!notesModal) return;
    setSavingNote(true);
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: notesModal.id, notes: noteText }),
    }).catch(console.error);
    setQuestions((prev) =>
      prev.map((x) => (x.id === notesModal.id ? { ...x, notes: noteText } : x))
    );
    setNotesModal(null);
    setSavingNote(false);
  };

  const pickRandom = () => {
    const pool = filtered.filter((q) => q.status !== 'SOLVED');
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick.url) window.open(pick.url, '_blank');
  };

  // ─ Filtering & Sorting ───────────────────────────
  const filtered = useMemo(() => {
    return questions
      .filter((q) => {
        if (search.trim()) {
          const s = search.toLowerCase().trim();
          if (!q.title.toLowerCase().includes(s) && q.id.toString() !== s) return false;
        }
        if (diffFilter !== 'All' && q.difficulty !== diffFilter) return false;
        if (statusFilter !== 'All' && q.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'difficulty') {
          const w: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
          return (w[b.difficulty] || 0) - (w[a.difficulty] || 0);
        }
        return ((b as any)[sortBy] ?? 0) - ((a as any)[sortBy] ?? 0);
      });
  }, [questions, search, diffFilter, statusFilter, sortBy]);

  // ─ Stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    const t = questions.length;
    const s = questions.filter((q) => q.status === 'SOLVED').length;
    const a = questions.filter((q) => q.status === 'ATTEMPTED').length;
    return {
      total: t, solved: s, attempted: a,
      pct: t > 0 ? Math.round((s / t) * 100) : 0,
      easy:   { total: questions.filter((q) => q.difficulty === 'Easy').length,   solved: questions.filter((q) => q.difficulty === 'Easy'   && q.status === 'SOLVED').length },
      medium: { total: questions.filter((q) => q.difficulty === 'Medium').length, solved: questions.filter((q) => q.difficulty === 'Medium' && q.status === 'SOLVED').length },
      hard:   { total: questions.filter((q) => q.difficulty === 'Hard').length,   solved: questions.filter((q) => q.difficulty === 'Hard'   && q.status === 'SOLVED').length },
    };
  }, [questions]);

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return allCompanies;
    return allCompanies.filter((c) => c.name.includes(companySearch.toLowerCase()));
  }, [allCompanies, companySearch]);

  // ─ Loading / Auth Gate ────────────────────────────
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionStatus !== 'authenticated') return null;

  // ─ Render ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24 relative">
      {/* Dot grid background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-muted) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* ═══ Navbar ═══ */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-white font-bold text-xs">
                R
              </div>
              <span className="font-bold text-sm tracking-tight text-foreground">
                RIPLeet
              </span>
            </div>

            {/* Company selector */}
            <button
              onClick={() => setCompanyModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:border-accent/40 hover:bg-accent-muted text-xs font-medium transition-all group"
            >
              <Building2 className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors" />
              <span className="text-foreground">{formatCompanyName(company)}</span>
              <ChevronDown className="w-3 h-3 text-muted" />
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              onClick={pickRandom}
              title="Open a random unsolved problem"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium border border-accent/20 transition-all"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Random</span>
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-border">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-surface-raised border border-border flex items-center justify-center">
                  <User className="w-3 h-3 text-muted" />
                </div>
                <span className="text-xs text-muted hidden sm:inline">
                  {session.user.name || session.user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                title="Sign out"
                className="p-1.5 rounded-md hover:bg-surface-raised text-muted hover:text-hard transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══ Main Content ═══ */}
      <main className="max-w-6xl mx-auto px-5 pt-6 space-y-5">

        {/* ── Company pills ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TOP_COMPANIES.map((c) => (
            <button
              key={c}
              onClick={() => setCompany(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                company === c
                  ? 'bg-accent text-white border-accent shadow-sm shadow-accent/20'
                  : 'bg-transparent text-muted border-border hover:text-foreground hover:border-accent/30'
              }`}
            >
              {formatCompanyName(c)}
            </button>
          ))}
          <button
            onClick={() => setCompanyModal(true)}
            className="px-3 py-1 rounded-full text-xs text-accent border border-accent/20 hover:bg-accent-muted whitespace-nowrap transition-all"
          >
            + All {allCompanies.length}
          </button>
        </div>

        {/* ── Header Row: Title + Timeframe + Stats ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">

          {/* Left: Title + Timeframe */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono text-accent/70 uppercase tracking-widest mb-1">
                  Interview Frequency Data
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-none">
                  {formatCompanyName(company)}
                </h1>
              </div>

              {/* Timeframe switcher */}
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface self-start sm:self-end">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.key}
                    onClick={() => setTimeframe(tf.key)}
                    title={tf.long}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      timeframe === tf.key
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div className="bg-surface border border-border rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted">
                    <span className="text-foreground font-semibold">{stats.solved}</span> solved
                  </span>
                  <span className="text-muted">
                    <span className="text-foreground font-semibold">{stats.attempted}</span> attempted
                  </span>
                  <span className="text-muted">
                    of <span className="text-foreground font-semibold">{stats.total}</span> total
                  </span>
                </div>
                <span className="text-xs font-mono text-accent font-semibold">{stats.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent via-solved to-easy transition-all duration-500"
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: Difficulty breakdown */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3 self-end">
            <p className="text-[11px] font-mono text-muted uppercase tracking-widest">
              By Difficulty
            </p>
            <div className="space-y-2.5">
              {[
                { label: 'Easy',   color: 'bg-easy',   textColor: 'text-easy',   data: stats.easy },
                { label: 'Medium', color: 'bg-medium',  textColor: 'text-medium', data: stats.medium },
                { label: 'Hard',   color: 'bg-hard',    textColor: 'text-hard',   data: stats.hard },
              ].map((d) => (
                <div key={d.label} className="flex items-center gap-3">
                  <span className={`text-xs font-medium w-14 ${d.textColor}`}>{d.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full ${d.color} transition-all duration-500`}
                      style={{ width: `${d.data.total > 0 ? (d.data.solved / d.data.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted font-mono w-12 text-right">
                    {d.data.solved}/{d.data.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or #id…"
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-8 py-2 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Difficulty pills */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface text-xs">
            {['All', 'Easy', 'Medium', 'Hard'].map((d) => (
              <button
                key={d}
                onClick={() => setDiffFilter(d)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  diffFilter === d
                    ? d === 'Easy' ? 'bg-easy/15 text-easy'
                    : d === 'Medium' ? 'bg-medium/15 text-medium'
                    : d === 'Hard' ? 'bg-hard/15 text-hard'
                    : 'bg-accent text-white'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Status pills */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface text-xs">
            {['All', 'SOLVED', 'ATTEMPTED', 'TODO'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-surface-raised text-foreground'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {s === 'All' ? 'All' : s === 'SOLVED' ? '✓ Solved' : s === 'ATTEMPTED' ? '◷ Tried' : '○ Todo'}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 bg-surface text-xs text-muted">
            <ArrowUpDown className="w-3 h-3 text-accent" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-foreground focus:outline-none cursor-pointer text-xs"
            >
              <option value="frequency">Frequency</option>
              <option value="difficulty">Difficulty</option>
              <option value="acceptance">Acceptance</option>
              <option value="id">LeetCode #</option>
            </select>
          </div>
        </div>

        {/* ── Questions Table ── */}
        <div className="border border-border rounded-xl overflow-hidden bg-surface">
          {loading ? (
            <div className="p-20 text-center space-y-3">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted">Loading questions…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-20 text-center space-y-1">
              <p className="text-sm text-foreground">Nothing here.</p>
              <p className="text-xs text-muted">Try a different timeframe or clear your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] font-mono text-muted uppercase tracking-widest">
                    <th className="py-3 pl-4 pr-2 w-12"></th>
                    <th className="py-3 px-2 w-16"><Hash className="w-3 h-3 inline" /></th>
                    <th className="py-3 px-2">Problem</th>
                    <th className="py-3 px-2 w-24">Level</th>
                    <th className="py-3 px-2 w-24"><Percent className="w-3 h-3 inline mr-0.5" />Acc</th>
                    <th className="py-3 px-2 w-36"><Zap className="w-3 h-3 inline mr-0.5" />Freq</th>
                    <th className="py-3 pr-4 pl-2 w-20 text-right">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q, i) => (
                    <tr
                      key={q.id}
                      className="border-b border-border-subtle hover:bg-surface-raised/60 transition-colors group"
                    >
                      {/* Status */}
                      <td className="py-2.5 pl-4 pr-2">
                        <button
                          onClick={() => toggleStatus(q.id)}
                          className="p-0.5 rounded transition-transform active:scale-90"
                          title={q.status}
                        >
                          {q.status === 'SOLVED' ? (
                            <CheckCircle2 className="w-[18px] h-[18px] text-solved" />
                          ) : q.status === 'ATTEMPTED' ? (
                            <Clock className="w-[18px] h-[18px] text-attempted" />
                          ) : (
                            <Circle className="w-[18px] h-[18px] text-border group-hover:text-muted transition-colors" />
                          )}
                        </button>
                      </td>

                      {/* ID */}
                      <td className="py-2.5 px-2 text-xs font-mono text-muted">{q.id}</td>

                      {/* Title */}
                      <td className="py-2.5 px-2">
                        <a
                          href={q.url || `https://leetcode.com/problems/${q.title.toLowerCase().replace(/\s+/g, '-')}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-accent transition-colors"
                        >
                          <span>{q.title}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity text-muted flex-shrink-0" />
                        </a>
                      </td>

                      {/* Difficulty */}
                      <td className="py-2.5 px-2">
                        <span className={`text-xs font-medium ${
                          q.difficulty === 'Easy' ? 'text-easy' :
                          q.difficulty === 'Medium' ? 'text-medium' : 'text-hard'
                        }`}>
                          {q.difficulty}
                        </span>
                      </td>

                      {/* Acceptance */}
                      <td className="py-2.5 px-2 text-xs font-mono text-muted">
                        {q.acceptance ? `${q.acceptance.toFixed(1)}%` : '—'}
                      </td>

                      {/* Frequency */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 rounded-full bg-border overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                q.frequency > 70 ? 'bg-gradient-to-r from-medium to-hard' :
                                q.frequency > 35 ? 'bg-accent' : 'bg-muted/30'
                              }`}
                              style={{ width: `${Math.min(q.frequency, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-foreground w-10">
                            {q.frequency.toFixed(0)}%
                          </span>
                          {q.frequency >= 75 && (
                            <Flame className="w-3 h-3 text-hard" />
                          )}
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-2.5 pr-4 pl-2 text-right">
                        <button
                          onClick={() => { setNotesModal(q); setNoteText(q.notes || ''); }}
                          className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                            q.notes
                              ? 'text-accent border-accent/20 bg-accent-muted hover:bg-accent/20'
                              : 'text-muted border-border hover:text-foreground hover:bg-surface-raised'
                          }`}
                        >
                          {q.notes ? '📝' : '+'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Count footer */}
        {!loading && filtered.length > 0 && (
          <p className="text-[11px] text-muted text-center pt-1">
            Showing {filtered.length} of {questions.length} questions for{' '}
            <span className="text-foreground">{formatCompanyName(company)}</span> ·{' '}
            {TIMEFRAMES.find((t) => t.key === timeframe)?.long}
          </p>
        )}
      </main>

      {/* ═══ Company Modal ═══ */}
      {companyModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm" onClick={() => setCompanyModal(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-up max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Companies ({allCompanies.length})
              </h2>
              <button onClick={() => setCompanyModal(false)} className="p-1 rounded-md hover:bg-surface-raised text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  autoFocus
                  placeholder="Search companies…"
                  className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
              {filteredCompanies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCompany(c.name); setCompanyModal(false); setCompanySearch(''); }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                    company === c.name
                      ? 'bg-accent text-white font-medium'
                      : 'hover:bg-surface-raised text-foreground'
                  }`}
                >
                  <span className="capitalize">{c.name.replace(/-/g, ' ')}</span>
                  <span className={`font-mono ${company === c.name ? 'text-white/70' : 'text-muted'}`}>
                    {c.questionCount}
                  </span>
                </button>
              ))}
              {filteredCompanies.length === 0 && (
                <p className="text-xs text-muted text-center py-8">No companies match "{companySearch}"</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Notes Modal ═══ */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={() => setNotesModal(null)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  #{notesModal.id} {notesModal.title}
                </h3>
                <button onClick={() => setNotesModal(null)} className="p-1 rounded-md hover:bg-surface-raised text-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Jot down edge cases, patterns, or time/space complexity.
              </p>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                rows={5}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g. Two pointers — O(N) time, O(1) space. Watch out for empty arrays."
                className="w-full bg-background border border-border rounded-lg p-3 text-xs text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent/50 font-mono leading-relaxed resize-none"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setNotesModal(null)} className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button
                  onClick={saveNote}
                  disabled={savingNote}
                  className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-all disabled:opacity-50"
                >
                  {savingNote ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
