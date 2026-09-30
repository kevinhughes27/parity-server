// The league registry. Each league is its own Durable Object (see the README).
//
// To start a new season add an entry to the top of leagues.json and deploy.
// The first entry is the current league: it is what the stat keeper records
// games for and what the daily Zuluru sync updates.

import type { League } from './types';
import data from './leagues.json' with { type: 'json' };

// In development (`./dev up`) there is one more league, only on your machine,
// with made up teams and games (see worker/dev.ts). It is the current league so
// the stat keeper records games locally. The real leagues are read from
// production.
export const devLeague: League = {
  id: 0,
  name: 'Dev League',
  lineSize: 6,
  statValues: 'v2',
  salaryCalc: 'pro_rate',
  zuluru: null,
};

// (import.meta.env is set by vite. The e2e tests and scripts run in plain node.)
const development = import.meta.env?.DEV === true;

export const leagues: League[] = development
  ? [devLeague, ...(data as League[])]
  : (data as League[]);

export const currentLeague: League = leagues[0];

export function findLeague(id: number | string): League | undefined {
  const n = typeof id === 'string' ? Number(id) : id;
  return leagues.find(l => l.id === n);
}
