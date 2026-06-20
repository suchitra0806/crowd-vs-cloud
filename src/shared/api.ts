export type GamePhase = 'submit' | 'vote' | 'results';

export type AnswerForVote = {
  id: string;
  text: string;
};

export type AnswerForResults = {
  id: string;
  text: string;
  isAI: boolean;
  authorUsername: string | null;
  humanVoteCount: number;
  aiVoteCount: number;
};

export type LeaderboardEntry = {
  username: string;
  score: number;
};

export type GameInitResponse = {
  type: 'game_init';
  postId: string;
  phase: GamePhase;
  prompt: string;
  username: string;
  isMod: boolean;
  answerCount: number;
  userHasSubmitted: boolean;
  userAnswerText?: string;
  answers?: AnswerForVote[];
  userHasVoted: boolean;
  userVotes?: Record<string, 'human' | 'ai'>;
  revealedAnswers?: AnswerForResults[];
  userScore?: number;
  leaderboard?: LeaderboardEntry[];
};

export type GamePreviewResponse = {
  type: 'game_preview';
  phase: GamePhase;
  prompt: string;
  answerCount: number;
};

export type SubmitAnswerResponse = {
  type: 'submit_answer';
  success: boolean;
  answerCount: number;
};

export type VoteResponse = {
  type: 'vote';
  success: boolean;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
