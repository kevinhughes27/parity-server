import { describe, expect, it } from 'vitest';
import { parseSchedule, parseTeam, parseTeamIds, zuluruPages } from '../zuluru';
import { leagues } from '../../shared/leagues';

// Trimmed down copies of Zuluru's markup
const teamPage = `
  <h2>Teams</h2>
  <h2>Kells Angels Bicycle Club (KABC)</h2>
  <table class="table table-striped table-hover table-condensed">
    <thead>
      <tr><th>Name</th><th>Role</th><th>Roster Designation</th><th>Rating</th><th>Date Joined</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><a class="trigger" href="/zuluru/people/view?person=1" id="people_person_1">Alice Example</a></td>
        <td><span><span class="zuluru-in-place-widget"><a class="icon" href="#">Captain<img alt="" src="dropdown.png"/></a></span></span></td>
        <td>Woman</td><td>7</td><td>Mar 2, 2022</td>
      </tr>
      <tr>
        <td><a class="trigger" href="/zuluru/people/view?person=2" id="people_person_2">Bob Example</a></td>
        <td><span>Regular player</span></td>
        <td>Open</td><td>6</td><td>Mar 2, 2022</td>
      </tr>
      <tr>
        <td><a class="trigger" href="/zuluru/people/view?person=3" id="people_person_3">Coach Example</a></td>
        <td><span>Non-playing coach</span></td>
        <td>Open</td><td></td><td>Mar 2, 2022</td>
      </tr>
    </tbody>
  </table>`;

describe('parseTeam', () => {
  it('reads players and roster designation, skipping non-playing coaches', () => {
    expect(parseTeam(42, teamPage)).toEqual({
      id: 42,
      name: 'Kells Angels Bicycle Club (KABC)',
      players: [
        { name: 'Alice Example', is_open: false },
        { name: 'Bob Example', is_open: true },
      ],
    });
  });

  it('fails when roster designations are missing (not logged in)', () => {
    const loggedOut = teamPage.replace('<th>Roster Designation</th>', '');
    expect(() => parseTeam(42, loggedOut)).toThrow(/login failed/);
  });
});

describe('parseTeamIds', () => {
  it('finds unique team ids', () => {
    const html = `
      <a id="teams_team_101">A</a> <a id="teams_team_102">B</a> <a id="teams_team_101">A</a>
      <a id="teams_team_x">not a team</a>`;
    expect(parseTeamIds(html)).toEqual([101, 102]);
  });
});

// from v2's test_zuluru_sync.py
const schedulePage = `
  <div class="schedule">
    <table>
      <tbody>
        <tr>
          <th colspan="3"><a name="2025-05-22">May 22, 2025</a></th>
          <th colspan="3" class="actions splash-action"></th>
        </tr>
        <tr>
          <td></td>
          <td><a href="/zuluru/games/view?game=1000">6:45PM-8:35PM</a></td>
          <td><a href="/zuluru/facilities/view?facility=1" id="fields_field_1" class="trigger">UPI 1</a></td>
          <td><a href="/zuluru/teams/view?team=13642" id="teams_team_101" class="trigger">Team Alpha</a></td>
          <td><a href="/zuluru/teams/view?team=13677" id="teams_team_102" class="trigger">Team Beta</a></td>
        </tr>
        <tr>
          <th colspan="3"><a name="2025-05-29">May 29, 2025</a></th>
        </tr>
        <tr>
          <td></td>
          <td><a href="/zuluru/games/view?game=1001">11:00AM-12:30PM</a></td>
          <td><a id="teams_team_102">Team Beta</a></td>
          <td><a id="teams_team_101">Team Alpha</a></td>
        </tr>
        <tr>
          <td></td>
          <td><a href="/zuluru/games/view?game=1002">6:45PM-8:35PM</a></td>
          <td>Playoffs TBD</td>
        </tr>
      </tbody>
    </table>
  </div>`;

describe('parseSchedule', () => {
  it('reads matchups by week and stops at the first TBD game', () => {
    expect(parseSchedule(schedulePage)).toEqual([
      {
        id: 1,
        week: 1,
        homeTeamId: 101,
        awayTeamId: 102,
        gameStart: '2025-05-22T18:45:00',
        gameEnd: '2025-05-22T20:35:00',
      },
      {
        id: 2,
        week: 2,
        homeTeamId: 102,
        awayTeamId: 101,
        gameStart: '2025-05-29T11:00:00',
        gameEnd: '2025-05-29T12:30:00',
      },
    ]);
  });
});

describe('zuluruPages', () => {
  it('handles leagues and divisions', () => {
    expect(zuluruPages('https://www.ocua.ca/zuluru/leagues/view?league=1103')).toEqual({
      teams: 'https://www.ocua.ca/zuluru/leagues/view?league=1103',
      schedule: 'https://www.ocua.ca/zuluru/leagues/schedule?league=1103',
    });
    expect(zuluruPages('https://www.ocua.ca/zuluru/divisions/view?division=1685')).toEqual({
      teams: 'https://www.ocua.ca/zuluru/divisions/view?division=1685',
      schedule: 'https://www.ocua.ca/zuluru/divisions/schedule?division=1685',
    });
    // the older url style
    expect(zuluruPages('https://www.ocua.ca/zuluru/leagues/view/league:1103').teams).toBe(
      'https://www.ocua.ca/zuluru/leagues/view?league=1103'
    );
    expect(() => zuluruPages('https://www.ocua.ca/zuluru/teams/view?team=1')).toThrow();
  });

  it.each(leagues.filter(l => l.zuluru))('league $id has a valid zuluru url', league => {
    expect(() => zuluruPages(league.zuluru!)).not.toThrow();
  });
});
