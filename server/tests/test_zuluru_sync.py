from datetime import date, datetime, time
from sqlmodel import select
from unittest import mock
import textwrap

from server.zuluru_sync import ZuluruSync
import server.db as db


def test_sync_schedule(session, mocker):
    league = db.League(name="Summer League", zuluru_id=123)
    session.add(league)
    session.commit()
    session.refresh(league)

    team_a = db.Team(name="Team Alpha", zuluru_id=101, league_id=league.id)
    team_b = db.Team(name="Team Beta", zuluru_id=102, league_id=league.id)
    session.add_all([team_a, team_b])
    session.commit()
    session.refresh(team_a)
    session.refresh(team_b)

    # fake zuluru html
    mock_html = textwrap.dedent(f"""
      <div class="schedule">
        <table>
          <tbody>
            <tr>
              <th colspan="3"><a name="2025-05-22">May 22, 2025</a></th>
              <th colspan="3" class="actions splash-action">
            </th>
            </tr>
            <tr>
              <td></td>
              <td><a href="/zuluru/games/view?game=1000">6:45PM-8:35PM</a></td>
              <td><a href="/zuluru/facilities/view?facility=1" id="fields_field_1" class="trigger">UPI 1</a></td>
              <td><a href="/zuluru/teams/view?team=13642" id="teams_team_{team_a.zuluru_id}" class="trigger">{team_a.name}</a></td>
              <td><a href="/zuluru/teams/view?team=13677" id="teams_team_{team_b.zuluru_id}" class="trigger">{team_b.name}</a></td>
              <span class="actions"></span></td>
            </tr>
          </tbody>
        </table>
      </div>
    """)

    # mock requests.get to return our mock_html
    mock_response = mock.Mock()
    mock_response.text = mock_html
    mocker.patch("requests.get", return_value=mock_response)

    # zuluru-sync
    sync_scraper = ZuluruSync(session=session, league=league)
    sync_scraper.sync_schedule()

    # assert
    retrieved_matchups = session.exec(
        select(db.Matchup).where(db.Matchup.league_id == league.id)
    ).all()

    assert len(retrieved_matchups) == 1
    assert retrieved_matchups[0].home_team_id == team_a.id
    assert retrieved_matchups[0].away_team_id == team_b.id
    assert retrieved_matchups[0].game_start == datetime.combine(
        date(2025, 5, 22), time(18, 45)
    )
    assert retrieved_matchups[0].game_end == datetime.combine(
        date(2025, 5, 22), time(20, 35)
    )
