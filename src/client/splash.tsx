import './index.css';

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';
import type { GamePreviewResponse, GamePhase } from '../shared/api';

const PHASE_LABEL: Record<GamePhase, string> = {
  submit: 'Answers open',
  vote: 'Voting open',
  results: 'Results in',
};

const PHASE_COLOR: Record<GamePhase, string> = {
  submit: 'text-emerald-500',
  vote: 'text-blue-500',
  results: 'text-[#d93900]',
};

export const Splash = () => {
  const [preview, setPreview] = useState<GamePreviewResponse | null>(null);

  useEffect(() => {
    fetch('/api/game/preview')
      .then((r) => r.json())
      .then((data: GamePreviewResponse) => {
        if (data.type === 'game_preview') setPreview(data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4 bg-white dark:bg-gray-900 px-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base font-black text-[#d93900]">Crowd</span>
        <span className="text-base font-black text-gray-400">vs</span>
        <span className="text-base font-black text-purple-600">Cloud</span>
      </div>

      {preview ? (
        <>
          <p className="text-lg font-semibold text-center text-gray-900 dark:text-white leading-snug max-w-xs">
            {preview.prompt}
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className={`font-semibold ${PHASE_COLOR[preview.phase]}`}>
              {PHASE_LABEL[preview.phase]}
            </span>
            <span>·</span>
            <span>
              {preview.answerCount} {preview.answerCount === 1 ? 'answer' : 'answers'}
            </span>
          </div>
        </>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">Loading…</p>
      )}

      <button
        className="mt-2 px-6 py-2.5 bg-[#d93900] text-white font-semibold rounded-full hover:bg-[#c23300] transition-colors text-sm"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Play now
      </button>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
