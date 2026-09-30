import { test, expect } from './fixtures';
import {
  clickButton,
  expectButtonDisabled,
  expectButtonEnabled,
  expectGameState,
  expectHelpMessage,
  expectLinesSelected,
  expectNextLineText,
  expectPlayersDisabled,
  expectPlayersEnabled,
  expectRosters,
  selectLines,
  selectTeams,
  startGame,
  startPoint,
  startStatKeeper,
} from './helpers';

const home = 'Kells Angels Bicycle Club';
const away = 'lumleysexuals';

// coverage for this logic is sprinkled around in other tests as well
// it is still nice to have one test explicitly focusing on this
test('button states', async ({ page, rosters }) => {
  await startStatKeeper(page);

  // create game
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);
  await startGame(page);

  // select lines
  await expectHelpMessage(page, 'Select players for the first point.');

  // all player buttons enabled
  await expectPlayersEnabled(page, rosters[home]);
  await expectPlayersEnabled(page, rosters[away]);

  const homeLine = rosters[home].slice(0, 6);
  const homeBench = rosters[home].slice(6);
  const awayLine = rosters[away].slice(0, 6);
  const awayBench = rosters[away].slice(6);
  await selectLines(page, homeLine, awayLine);
  await expectLinesSelected(page);
  await startPoint(page);

  // lines active, bench disabled
  await expectPlayersEnabled(page, homeLine);
  await expectPlayersEnabled(page, awayLine);
  await expectPlayersDisabled(page, homeBench);
  await expectPlayersDisabled(page, awayBench);

  // all actions disabled until a player is picked to start
  await expectButtonDisabled(page, 'Pull');
  await expectButtonDisabled(page, 'Point!');
  await expectButtonDisabled(page, 'Drop');
  await expectButtonDisabled(page, 'Throwaway');
  await expectButtonDisabled(page, 'D (Block)');
  await expectButtonDisabled(page, 'Catch D');
  // nothing has happened yet. nothing to undo
  await expectButtonDisabled(page, 'Undo');

  // player is chosen
  // away is pulling
  await clickButton(page, 'Owen Lumley');
  await expectPlayersDisabled(page, homeLine);
  await expectPlayersDisabled(page, awayLine);
  // only pull and undo enabled
  await expectButtonEnabled(page, 'Pull');
  await expectButtonDisabled(page, 'Point!');
  await expectButtonDisabled(page, 'Drop');
  await expectButtonDisabled(page, 'Throwaway');
  await expectButtonDisabled(page, 'D (Block)');
  await expectButtonDisabled(page, 'Catch D');
  await expectButtonEnabled(page, 'Undo');

  // pull has to be next (or undo)
  await clickButton(page, 'Pull');
  await expectPlayersEnabled(page, homeLine);
  await expectPlayersDisabled(page, awayLine);
  await expectButtonDisabled(page, 'pull');
  await expectButtonDisabled(page, 'point!');
  await expectButtonDisabled(page, 'drop');
  await expectButtonDisabled(page, 'throwaway');
  await expectButtonDisabled(page, 'd (block)');
  await expectButtonDisabled(page, 'catch d');

  // player receives the pull or picks it up
  // they can drop it or throw it away
  await clickButton(page, 'Brian Kells');
  await expectPlayersEnabled(
    page,
    homeLine.filter(p => p !== 'Brian Kells')
  );
  await expectPlayersDisabled(page, awayLine);
  await expectButtonDisabled(page, 'pull');
  await expectButtonDisabled(page, 'point!');
  await expectButtonEnabled(page, 'drop');
  await expectButtonEnabled(page, 'throwaway');
  await expectButtonDisabled(page, 'd (block)');
  await expectButtonDisabled(page, 'catch d');

  // first pass
  await clickButton(page, 'Ashlin Kelly');
  await expectPlayersEnabled(
    page,
    homeLine.filter(p => p !== 'Ashlin Kelly')
  );
  await expectPlayersDisabled(page, awayLine);
  await expectButtonDisabled(page, 'pull');
  await expectButtonDisabled(page, 'point!'); // point disabled (QuebecVariant)
  await expectButtonEnabled(page, 'drop');
  await expectButtonEnabled(page, 'throwaway');
  await expectButtonDisabled(page, 'd (block)');
  await expectButtonDisabled(page, 'catch d');

  // turnover
  await clickButton(page, 'Throwaway');
  await expectPlayersDisabled(page, homeLine);
  await expectPlayersEnabled(page, awayLine);
  await expectButtonDisabled(page, 'pull');
  await expectButtonDisabled(page, 'point!');
  await expectButtonDisabled(page, 'drop');
  await expectButtonDisabled(page, 'throwaway');
  await expectButtonDisabled(page, 'd (block)');
  await expectButtonDisabled(page, 'catch d');

  // player is selected next then a D or Catch D can be recorded or not for a pick up
  // a player is technically able to drop it although it would be rare. this would
  // result in an immediate turnover with the only offense recording being a drop
  //
  // in this case we proceed with a pick-up from a plain throwaway
  await clickButton(page, 'Owen Lumley');
  await expectPlayersDisabled(page, homeLine);
  await expectPlayersEnabled(
    page,
    awayLine.filter(p => p !== 'Owen Lumley')
  );
  await expectButtonDisabled(page, 'pull');
  await expectButtonDisabled(page, 'point!');
  await expectButtonEnabled(page, 'drop');
  await expectButtonEnabled(page, 'throwaway');
  await expectButtonEnabled(page, 'd (block)');
  await expectButtonEnabled(page, 'catch d');

  // pass (d buttons get disabled now)
  await clickButton(page, 'Heather McCabe');
  await expectButtonDisabled(page, 'pull');
  await expectButtonEnabled(page, 'point!');
  await expectButtonEnabled(page, 'drop');
  await expectButtonEnabled(page, 'throwaway');
  await expectButtonDisabled(page, 'd (block)');
  await expectButtonDisabled(page, 'catch d');

  // undo pass, make it a catch d
  await clickButton(page, 'Undo');
  await clickButton(page, 'Catch D');

  // can pass
  await expectPlayersDisabled(page, homeLine);
  await expectPlayersEnabled(
    page,
    awayLine.filter(p => p !== 'Owen Lumley')
  );

  // catch d is now disabled
  await expectButtonDisabled(page, 'd (block)');
  await expectButtonDisabled(page, 'catch d');

  // a callahan is possible from a catch d
  await expectButtonEnabled(page, 'point!');
  await clickButton(page, 'Point!');

  // setup next point
  await expectNextLineText(page);
  await expectLinesSelected(page);
  await startPoint(page);

  // line is now bench, bench is now active
  // possession is known so only home is active
  await expectPlayersDisabled(page, homeLine);
  await expectPlayersDisabled(page, awayLine);
  await expectPlayersEnabled(page, homeBench);
  await expectPlayersDisabled(page, awayBench);

  // select home player to start (this creates the active point since possession is known)
  await clickButton(page, 'Christopher Keates');
  await expectGameState(page, 'FirstThrow');

  // no pull for other points
  await expectButtonDisabled(page, 'pull');
  await expectButtonDisabled(page, 'drop');
  await expectButtonEnabled(page, 'throwaway');
});

test('select lines warnings', async ({ page, rosters, league }) => {
  // the app will sort players so we sort the list here so we know
  // what order the genders will be
  const sortedHomeRoster = [...rosters[home]].sort();
  const sortedAwayRoster = [...rosters[away]].sort();

  // set player genders in order (the app will sort them) for convenience
  const open = [...sortedHomeRoster.slice(0, 8), ...sortedAwayRoster.slice(0, 8)];
  await league.updatePlayers(p => ({ ...p, is_open: open.includes(p.name) }));

  // create game
  await startStatKeeper(page);
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);
  await startGame(page);

  // select lines
  await expectHelpMessage(page, 'Select players for the first point.');

  // check the warning dialog has the expected messages and dismiss it
  async function expectWarningAndDismiss(messages: string[]) {
    const heading = page.getByRole('heading', { name: 'Line Selection Warning' });
    await expect(heading).toBeVisible();

    for (const message of messages) {
      await expect(page.getByRole('dialog')).toContainText(message);
    }

    await clickButton(page, 'Cancel');
    await expect(heading).not.toBeVisible();
  }

  // not enough left
  let homeLine = rosters[home].slice(0, 5);
  let awayLine = rosters[away].slice(0, 6);
  await selectLines(page, homeLine, awayLine);

  await clickButton(page, 'Start Point');
  await expectWarningAndDismiss([`${home}: 5/6 players selected`]);
  await selectLines(page, homeLine, awayLine); // reset

  // not enough right
  homeLine = rosters[home].slice(0, 6);
  awayLine = rosters[away].slice(0, 5);
  await selectLines(page, homeLine, awayLine);

  await clickButton(page, 'Start Point');
  await expectWarningAndDismiss([`${away}: 5/6 players selected`]);
  await selectLines(page, homeLine, awayLine); // reset

  // too many left
  homeLine = rosters[home].slice(0, 7); // 7 players (too many)
  awayLine = rosters[away].slice(0, 6);
  await selectLines(page, homeLine, awayLine);

  await clickButton(page, 'Start Point');
  await expectWarningAndDismiss([`${home}: 7/6 players selected (too many)`]);
  await selectLines(page, homeLine, awayLine); // reset

  // too many right
  homeLine = rosters[home].slice(0, 6);
  awayLine = rosters[away].slice(0, 7); // 7 players (too many)
  await selectLines(page, homeLine, awayLine);

  await clickButton(page, 'Start Point');
  await expectWarningAndDismiss([`${away}: 7/6 players selected (too many)`]);
  await selectLines(page, homeLine, awayLine); // reset

  // ratio warnings are disabled for now
  //
  // // ratio error
  // homeLine = [...sortedHomeRoster.slice(0, 5), ...sortedHomeRoster.slice(9, 10)]; // 5 ON2 1 WN2
  // awayLine = [...sortedAwayRoster.slice(0, 3), ...sortedAwayRoster.slice(9)]; // 3 ON2 3 WN2
  // await selectLines(page, homeLine, awayLine);
  //
  // await clickButton(page, 'Start Point');
  // await expectWarningAndDismiss([`${home}: 5 ON2, 1 WN2`, `${away}: 3 ON2, 3 WN2`]);
  // await selectLines(page, homeLine, awayLine); // reset
  //
  // // ratio error
  // homeLine = [...sortedHomeRoster.slice(0, 2), ...sortedHomeRoster.slice(8)]; // 2 ON2 4 WN2
  // awayLine = [...sortedAwayRoster.slice(0, 4), ...sortedAwayRoster.slice(10)]; // 4 ON2 2 WN2
  // await selectLines(page, homeLine, awayLine);
  //
  // await clickButton(page, 'Start Point');
  // await expectWarningAndDismiss([`${home}: 2 ON2, 4 WN2`]);
  // await selectLines(page, homeLine, awayLine); // reset

  // valid line
  homeLine = [...sortedHomeRoster.slice(0, 4), ...sortedHomeRoster.slice(10)]; // 4 ON2 2 WN2
  awayLine = [...sortedAwayRoster.slice(0, 4), ...sortedAwayRoster.slice(10)]; // 4 ON2 2 WN2
  await selectLines(page, homeLine, awayLine);
  await clickButton(page, 'Start Point');

  // game started
  await expectGameState(page, 'Start');
});
