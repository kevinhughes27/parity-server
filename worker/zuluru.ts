// Scrapes team rosters and the schedule from OCUA's Zuluru site.
// Ported from v2's zuluru_sync.py. Rosters need a logged in session because
// roster designations (Open/Woman) are only shown to members.

import { parseHTML } from 'linkedom';
import type { Matchup, Team } from '../shared/types';

const SITE = 'https://www.ocua.ca';
const ZULURU = `${SITE}/zuluru`;
const LOGIN = `${SITE}/user/login`;

const TEAM_ID = /^teams_team_(\d+)$/;
const PLAYER_ID = /^people_person_(\d+)$/;

// Zuluru nests Leagues > Divisions > Teams. OCUA sometimes runs Parity as its
// own league and sometimes as one division of a bigger league. Both have the
// same pages (view lists the teams, schedule the games) so we just need to
// know which one the url is for.
export function zuluruPages(url: string) {
  const match = url.match(/(league|division)[=:](\d+)/);
  if (!match) throw new Error(`Not a zuluru league or division url: ${url}`);
  const [, kind, id] = match;
  return {
    teams: `${ZULURU}/${kind}s/view?${kind}=${id}`,
    schedule: `${ZULURU}/${kind}s/schedule?${kind}=${id}`,
  };
}

export async function fetchZuluru(url: string, user: string, password: string) {
  if (!user || !password) throw new Error('ZULURU_USER and ZULURU_PASSWORD must be set');

  const pages = zuluruPages(url);
  const session = await login(user, password);

  const teamIds = parseTeamIds(await session.get(pages.teams));
  if (teamIds.length === 0) throw new Error(`No teams found at ${pages.teams}`);

  const teams: Team[] = [];
  for (const id of teamIds) {
    teams.push(parseTeam(id, await session.get(`${ZULURU}/teams/view/team:${id}`)));
  }

  const matchups = parseSchedule(await session.get(pages.schedule));

  return { teams, matchups };
}

// A tiny cookie jar, enough to hold the Drupal session cookie.
async function login(user: string, password: string) {
  const cookies = new Map<string, string>();
  const remember = (res: Response) => {
    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const eq = pair.indexOf('=');
      cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  };
  const cookieHeader = () => [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');

  const get = async (url: string) => {
    const res = await fetch(url, { headers: { Cookie: cookieHeader() } });
    remember(res);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.text();
  };

  const { document } = parseHTML(await get(LOGIN));
  const nonce = document.querySelector('[name="form_build_id"]')?.getAttribute('value');
  if (!nonce) throw new Error('Zuluru login form not found');

  const res = await fetch(LOGIN, {
    method: 'POST',
    redirect: 'manual',
    headers: { Cookie: cookieHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      name: user,
      pass: password,
      form_build_id: nonce,
      form_id: 'user_login',
      op: 'log_in',
    }),
  });
  remember(res);
  if (res.status >= 400) throw new Error(`Zuluru login failed: ${res.status}`);

  return { get };
}

export function parseTeamIds(html: string): number[] {
  const { document } = parseHTML(html);
  const ids = [...document.querySelectorAll('[id^="teams_team_"]')]
    .map(el => el.id.match(TEAM_ID)?.[1])
    .filter(Boolean)
    .map(Number);
  return [...new Set(ids)];
}

export function parseTeam(id: number, html: string): Team {
  const { document } = parseHTML(html);
  const headings = document.querySelectorAll('h2');
  const name = headings[headings.length - 1]?.textContent?.trim();
  if (!name) throw new Error(`Team ${id}: name not found`);

  const table = document.querySelector('table.table-striped');
  const headers = [...(table?.querySelectorAll('thead th') ?? [])].map(th =>
    th.textContent?.trim()
  );
  const roleCol = headers.indexOf('Role');
  const genderCol = headers.indexOf('Roster Designation');
  if (!table || roleCol < 0 || genderCol < 0) {
    // members only columns, so this usually means the login failed
    throw new Error(`Team ${id}: roster table not found (login failed?)`);
  }

  const players = [];
  for (const row of table.querySelectorAll('tbody tr')) {
    const link = row.querySelector('[id^="people_person_"]');
    if (!link || !PLAYER_ID.test(link.id)) continue;

    const cells = row.querySelectorAll('td');
    const role = cells[roleCol]?.textContent?.trim();
    const gender = cells[genderCol]?.textContent?.trim();
    if (role === 'Non-playing coach') continue;

    players.push({ name: link.textContent!.trim(), is_open: gender === 'Open' });
  }
  if (players.length === 0) throw new Error(`Team ${id}: no players found`);

  return { id, name, players };
}

// Matchups in schedule order. Team ids are Zuluru team ids (as are our team ids).
export function parseSchedule(html: string): Matchup[] {
  const { document } = parseHTML(html);
  const rows = document.querySelectorAll('div.schedule tbody tr');

  const matchups: Matchup[] = [];
  let date = '';
  let week = 0;

  for (const row of rows) {
    const th = row.querySelector('th a[name]');
    if (th) {
      date = th.getAttribute('name')!; // YYYY-MM-DD
      week += 1;
      continue;
    }

    const teamIds = [...row.querySelectorAll('[id^="teams_team_"]')]
      .map(el => el.id.match(TEAM_ID)?.[1])
      .filter(Boolean)
      .map(Number);
    // v2 stopped at the first row without two teams (playoffs are TBD)
    if (teamIds.length < 2) break;

    const times = row.querySelector('a[href*="games/view"]')?.textContent?.split('-') ?? [];
    const [start, end] = times.map(to24h);
    if (!start || !end) break;

    matchups.push({
      id: matchups.length + 1,
      week,
      homeTeamId: teamIds[0],
      awayTeamId: teamIds[1],
      gameStart: `${date}T${start}`,
      gameEnd: `${date}T${end}`,
    });
  }

  return matchups;
}

// "6:45PM" -> "18:45:00"
function to24h(time: string): string | null {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!m) return null;
  let hour = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${m[2]}:00`;
}
