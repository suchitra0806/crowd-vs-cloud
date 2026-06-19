import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameInitResponse } from '../../shared/api';

type GameState = GameInitResponse | null;

export const useGame = () => {
  const [state, setState] = useState<GameState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/game/init');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as GameInitResponse;
      if (data.type !== 'game_init') throw new Error('Unexpected response');
      setState(data);
      setError(null);
    } catch (e) {
      console.error('Failed to load game state', e);
      setError('Failed to load game. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchState();
    intervalRef.current = setInterval(() => void fetchState(), 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchState]);

  const submitAnswer = useCallback(async (text: string): Promise<string | null> => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/game/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json() as { type?: string; status?: string; message?: string };
      if (!res.ok) return data.message ?? 'Failed to submit';
      await fetchState();
      return null;
    } catch {
      return 'Failed to submit. Try again.';
    } finally {
      setSubmitting(false);
    }
  }, [fetchState]);

  const submitVotes = useCallback(
    async (votes: Record<string, 'human' | 'ai'>): Promise<string | null> => {
      setSubmitting(true);
      try {
        const res = await fetch('/api/game/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ votes }),
        });
        const data = await res.json() as { type?: string; status?: string; message?: string };
        if (!res.ok) return data.message ?? 'Failed to vote';
        await fetchState();
        return null;
      } catch {
        return 'Failed to submit votes. Try again.';
      } finally {
        setSubmitting(false);
      }
    },
    [fetchState]
  );

  return { state, loading, error, submitting, submitAnswer, submitVotes, refresh: fetchState };
};
