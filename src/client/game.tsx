import './index.css';

import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useGame } from './hooks/useGame';
import type { AnswerForResults, AnswerForVote, ScoreBreakdownEntry } from '../shared/api';

// ── Brand ─────────────────────────────────────────────────────────────────────

const BrandMark = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const cls =
    size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-2xl';
  return (
    <div className={`flex items-center gap-1.5 font-black ${cls}`}>
      <span className="text-[#d93900]">Crowd</span>
      <span className="text-gray-300 dark:text-gray-600">vs</span>
      <span className="text-purple-600">Cloud</span>
    </div>
  );
};

// ── Submit Phase ─────────────────────────────────────────────────────────────

type SubmitViewProps = {
  prompt: string;
  answerCount: number;
  userHasSubmitted: boolean;
  userAnswerText?: string | undefined;
  submitting: boolean;
  onSubmit: (text: string) => Promise<string | null>;
};

const SubmitView = ({
  prompt,
  answerCount,
  userHasSubmitted,
  userAnswerText,
  submitting,
  onSubmit,
}: SubmitViewProps) => {
  const [text, setText] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const prevCount = useRef(answerCount);

  useEffect(() => {
    if (answerCount > prevCount.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      prevCount.current = answerCount;
      return () => clearTimeout(t);
    }
    prevCount.current = answerCount;
  }, [answerCount]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const err = await onSubmit(text.trim());
    if (err) setFieldError(err);
  };

  const charPct = text.length / 120;
  const counterColor =
    charPct >= 0.95
      ? 'text-red-500'
      : charPct >= 0.8
        ? 'text-amber-500'
        : 'text-gray-400';

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-5 py-4 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#d93900]">
          Round Open
        </span>
        <h2 className="text-xl font-bold mt-2 text-gray-900 dark:text-white leading-snug">
          {prompt}
        </h2>
        <p
          className={`text-sm mt-2 transition-colors duration-300 ${
            flash ? 'text-[#d93900] font-semibold' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {answerCount} {answerCount === 1 ? 'answer' : 'answers'} submitted
        </p>
      </div>

      {userHasSubmitted ? (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-5 text-center">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide mb-2">
            Your answer
          </p>
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            &ldquo;{userAnswerText}&rdquo;
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-3">
            Waiting for voting to open…
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-3.5 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#d93900] placeholder-gray-300 dark:placeholder-gray-600 transition-shadow"
            rows={3}
            maxLength={120}
            placeholder="Type your answer…"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFieldError(null);
            }}
          />
          <div className="flex items-center justify-between px-0.5">
            <span className={`text-xs tabular-nums ${counterColor}`}>
              {text.length}/120
            </span>
            {fieldError && (
              <span className="text-xs text-red-500">{fieldError}</span>
            )}
          </div>
          <button
            onClick={() => void handleSubmit()}
            disabled={!text.trim() || submitting}
            className="w-full py-3 rounded-xl bg-[#d93900] text-white font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#c23300] active:scale-[0.98] transition-all"
          >
            {submitting ? 'Submitting…' : 'Submit my answer →'}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Vote Phase ────────────────────────────────────────────────────────────────

type VoteViewProps = {
  prompt: string;
  answers: AnswerForVote[];
  userHasVoted: boolean;
  userVotes?: Record<string, 'human' | 'ai'> | undefined;
  submitting: boolean;
  onVote: (votes: Record<string, 'human' | 'ai'>) => Promise<string | null>;
};

const VoteView = ({
  prompt,
  answers,
  userHasVoted,
  userVotes,
  submitting,
  onVote,
}: VoteViewProps) => {
  const [selections, setSelections] = useState<Record<string, 'human' | 'ai'>>(userVotes ?? {});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const classified = Object.keys(selections).length;
  const total = answers.length;
  const allClassified = classified === total;
  const progressPct = total > 0 ? (classified / total) * 100 : 0;

  const toggle = (id: string, value: 'human' | 'ai') => {
    if (userHasVoted) return;
    setSelections((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    const err = await onVote(selections);
    if (err) setSubmitError(err);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-5 py-4 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#d93900]">
          Voting Open
        </span>
        <h2 className="text-xl font-bold mt-2 text-gray-900 dark:text-white leading-snug">
          {prompt}
        </h2>

        {!userHasVoted && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <span>classified</span>
              <span className="tabular-nums">{classified}/{total}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#d93900] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {answers.map((answer) => {
          const sel = selections[answer.id];
          return (
            <div
              key={answer.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <p className="text-base text-gray-900 dark:text-white mb-3 font-medium leading-snug">
                &ldquo;{answer.text}&rdquo;
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => toggle(answer.id, 'human')}
                  disabled={userHasVoted}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95 ${
                    sel === 'human'
                      ? 'bg-blue-500 text-white ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 scale-[1.02]'
                      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                  } disabled:opacity-60 disabled:cursor-default`}
                >
                  🧠 Human
                </button>
                <button
                  onClick={() => toggle(answer.id, 'ai')}
                  disabled={userHasVoted}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95 ${
                    sel === 'ai'
                      ? 'bg-purple-500 text-white ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-800 scale-[1.02]'
                      : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                  } disabled:opacity-60 disabled:cursor-default`}
                >
                  🤖 AI
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {userHasVoted ? (
        <div className="text-center py-3 text-sm text-gray-400 dark:text-gray-500">
          Votes locked in — waiting for results…
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {submitError && (
            <p className="text-xs text-red-500 text-center">{submitError}</p>
          )}
          <button
            onClick={() => void handleSubmit()}
            disabled={!allClassified || submitting}
            className="w-full py-3 rounded-xl bg-[#d93900] text-white font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#c23300] active:scale-[0.98] transition-all"
          >
            {submitting
              ? 'Locking in…'
              : allClassified
                ? 'Lock in votes →'
                : `${classified}/${total} classified`}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Results Phase ─────────────────────────────────────────────────────────────

const MEDAL = ['🥇', '🥈', '🥉'];

type ResultsViewProps = {
  prompt: string;
  revealedAnswers: AnswerForResults[];
  userScore: number;
  username: string;
  leaderboard: { username: string; score: number }[];
  userAnswerText?: string | undefined;
  userVotes?: Record<string, 'human' | 'ai'> | undefined;
  scoreBreakdown?: ScoreBreakdownEntry[];
};

const ResultsView = ({
  prompt,
  revealedAnswers,
  userScore,
  username,
  leaderboard,
  userAnswerText,
  userVotes,
  scoreBreakdown,
}: ResultsViewProps) => {
  return (
    <div className="flex flex-col gap-5 w-full max-w-md">
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-5 py-5 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#d93900]">
          Results
        </span>
        <h2 className="text-xl font-bold mt-2 text-gray-900 dark:text-white leading-snug">
          {prompt}
        </h2>

        <div className="mt-4 inline-flex flex-col items-center rounded-2xl bg-[#d93900]/10 px-8 py-3">
          <span className="text-4xl font-black text-[#d93900] tabular-nums">{userScore}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-[#d93900]/70 mt-0.5">
            points
          </span>
        </div>

        {userAnswerText && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-3">
            Your answer: &ldquo;{userAnswerText}&rdquo;
          </p>
        )}

        {scoreBreakdown && scoreBreakdown.length > 0 && (
          <div className="mt-3 text-left w-full space-y-1">
            {scoreBreakdown.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-bold text-[#d93900] shrink-0 tabular-nums">+{entry.points}</span>
                <span>{entry.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {revealedAnswers.map((answer, i) => {
          const userGuess = userVotes?.[answer.id];
          const guessedRight = userGuess
            ? (userGuess === 'ai') === answer.isAI
            : null;

          return (
            <div
              key={answer.id}
              className={`reveal-card rounded-xl border p-4 ${
                answer.isAI
                  ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-base font-medium text-gray-900 dark:text-white flex-1 leading-snug">
                  &ldquo;{answer.text}&rdquo;
                </p>
                <span
                  className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                    answer.isAI
                      ? 'bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200'
                      : 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200'
                  }`}
                >
                  {answer.isAI ? '🤖 AI' : '🧠 Human'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>
                  {!answer.isAI && answer.authorUsername
                    ? `u/${answer.authorUsername}`
                    : ''}
                </span>
                <div className="flex items-center gap-2.5">
                  <span>🧠 {answer.humanVoteCount}</span>
                  <span>🤖 {answer.aiVoteCount}</span>
                  {guessedRight !== null && (
                    <span
                      className={`font-bold ${guessedRight ? 'text-emerald-500' : 'text-red-400'}`}
                    >
                      {guessedRight ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {leaderboard.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-widest">
            Leaderboard
          </h3>
          <ol className="flex flex-col gap-2">
            {leaderboard.map((entry, i) => (
              <li
                key={entry.username}
                className={`flex items-center justify-between text-sm ${
                  entry.username === username
                    ? 'font-bold text-[#d93900]'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-5 text-center">
                    {i < 3 ? MEDAL[i] : <span className="text-gray-400 text-xs">#{i + 1}</span>}
                  </span>
                  u/{entry.username}
                  {entry.username === username ? ' (you)' : ''}
                </span>
                <span className="tabular-nums">{entry.score} pts</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

// ── Mod Panel ────────────────────────────────────────────────────────────────

type ModPanelProps = {
  phase: string;
  currentPrompt: string;
  onAdvanceToVote: () => Promise<string | null>;
  onAdvanceToResults: () => Promise<void>;
  onReset: (prompt: string) => Promise<void>;
};

const ModPanel = ({ phase, currentPrompt, onAdvanceToVote, onAdvanceToResults, onReset }: ModPanelProps) => {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<null | { action: () => Promise<string | null | void>; label: string }>(null);
  const [newPrompt, setNewPrompt] = useState(currentPrompt);

  const run = async (action: () => Promise<string | null | void>, label: string) => {
    setBusy(true);
    setMsg(null);
    setPending(null);
    try {
      const warning = await action();
      setMsg(warning ? `⚠️ ${warning}` : `✓ ${label}`);
    } catch {
      setMsg('Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md mt-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Mod controls</p>

      {pending ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Are you sure you want to <span className="font-semibold">{pending.label.toLowerCase()}</span>? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => void run(pending.action, pending.label)}
              disabled={busy}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-40"
            >
              Yes, {pending.label}
            </button>
            <button
              onClick={() => setPending(null)}
              disabled={busy}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setPending({ action: onAdvanceToVote, label: 'Start Voting' })}
            disabled={busy || phase !== 'submit'}
            className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            → Start Voting
          </button>
          <button
            onClick={() => setPending({ action: onAdvanceToResults, label: 'Reveal Results' })}
            disabled={busy || phase !== 'vote'}
            className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            → Reveal Results
          </button>
        </div>
      )}

      {phase === 'results' && !pending && (
        <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700 flex flex-col gap-2">
          <input
            type="text"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="New prompt for next round..."
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#d93900] placeholder-gray-400"
          />
          <button
            onClick={() => setPending({ action: () => onReset(newPrompt), label: 'Start New Round' })}
            disabled={busy || !newPrompt.trim()}
            className="w-full py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            ↺ Start new round
          </button>
        </div>
      )}

      {msg && <p className="text-xs text-gray-500 mt-2">{msg}</p>}
    </div>
  );
};

// ── Root ──────────────────────────────────────────────────────────────────────

export const App = () => {
  const { state, loading, error, submitting, submitAnswer, submitVotes, refresh } = useGame();

  const advanceToVote = async (): Promise<string | null> => {
    const res = await fetch('/api/game/advance-to-vote', { method: 'POST' });
    const data = await res.json() as { warning?: string | null };
    await refresh();
    return data.warning ?? null;
  };

  const advanceToResults = async () => {
    await fetch('/api/game/advance-to-results', { method: 'POST' });
    await refresh();
  };

  const resetGame = async (prompt: string) => {
    await fetch('/api/game/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    await refresh();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900 gap-3">
        <BrandMark size="md" />
        <p className="text-gray-400 dark:text-gray-500 text-sm animate-pulse">Loading…</p>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900 gap-3 px-4">
        <BrandMark size="sm" />
        <p className="text-red-500 text-center text-sm">{error ?? 'Something went wrong.'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-white dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-md mb-8 text-center">
        <BrandMark size="lg" />
        <p className="text-xs text-gray-400 uppercase tracking-widest mt-1.5">
          Can you spot the AI?
        </p>
      </div>

      {state.phase === 'submit' && (
        <SubmitView
          prompt={state.prompt}
          answerCount={state.answerCount}
          userHasSubmitted={state.userHasSubmitted}
          userAnswerText={state.userAnswerText}
          submitting={submitting}
          onSubmit={submitAnswer}
        />
      )}

      {state.phase === 'vote' && state.answers && (
        <VoteView
          prompt={state.prompt}
          answers={state.answers}
          userHasVoted={state.userHasVoted}
          userVotes={state.userVotes}
          submitting={submitting}
          onVote={submitVotes}
        />
      )}

      {state.phase === 'results' && state.revealedAnswers && (
        <ResultsView
          prompt={state.prompt}
          revealedAnswers={state.revealedAnswers}
          userScore={state.userScore ?? 0}
          username={state.username}
          leaderboard={state.leaderboard ?? []}
          userAnswerText={state.userAnswerText}
          userVotes={state.userVotes}
          scoreBreakdown={state.scoreBreakdown ?? []}
        />
      )}

      {state.isMod && (
        <ModPanel
          phase={state.phase}
          currentPrompt={state.prompt}
          onAdvanceToVote={advanceToVote}
          onAdvanceToResults={advanceToResults}
          onReset={resetGame}
        />
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
