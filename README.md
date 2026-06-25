# Crowd vs Cloud

A Reddit game where humans try to out-write AI — and then spot each other.

## How it works

1. **Submit** — A prompt drops on a subreddit post. Everyone writes a short answer.
2. **Vote** — The mod opens voting. Claude (AI) quietly adds 3 answers to the mix. Players vote: which answers are human, which are AI?
3. **Results** — Scores revealed. +1 for each correct guess. +2 every time someone mistakes your answer for AI.

The best human writers fool the crowd. The sharpest readers catch the bots.

## Stack

- [Devvit](https://developers.reddit.com/) — Reddit app platform
- [React](https://react.dev/) + [Tailwind](https://tailwindcss.com/) — UI
- [Hono](https://hono.dev/) — backend server
- [Redis](https://developers.reddit.com/docs/api/redditapi/interfaces/RedisClient) — game state (Devvit built-in)
- [Claude Haiku](https://www.anthropic.com/claude) — AI answer generation

## Setup

1. Install dependencies: `npm install`
2. Log in to Devvit: `npm run login`
3. Set your Anthropic API key: `npx devvit settings set ANTHROPIC_API_KEY`
4. Start dev server: `npm run dev`

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Live development on Reddit |
| `npm run build` | Build client and server |
| `npm run deploy` | Upload a new version |
| `npm run type-check` | TypeScript check |
| `npm run lint` | ESLint |

## Mod controls

Mods advance the game through phases either via the in-post mod panel or the subreddit/post menu items. A "Create today's game" menu action on the subreddit starts a new post with a custom prompt.
