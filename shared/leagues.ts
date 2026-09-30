// The league registry. Each league is its own Durable Object (its own SQLite db).
//
// To start a new season add an entry to the top of leagues.json and deploy.
// The first entry is the current league: it is what the stat keeper records
// games for and what the daily Zuluru sync updates.

import type { League } from './types';
import data from './leagues.json' with { type: 'json' };

export const leagues = data as League[];

export const currentLeague: League = leagues[0];

export function findLeague(id: number | string): League | undefined {
  const n = typeof id === 'string' ? Number(id) : id;
  return leagues.find(l => l.id === n);
}
