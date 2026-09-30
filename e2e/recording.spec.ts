import { test, expect } from './fixtures';
import {
  clickButton,
  expectButtonDisabled,
  expectButtonEnabled,
  expectGameState,
  expectHelpMessage,
  expectLinesSelected,
  expectNextLineText,
  expectPlayByPlay,
  expectPlayersDisabled,
  expectPlayersEnabled,
  expectPlayersNotSelected,
  expectPlayersSelected,
  expectRosters,
  expectSnackbar,
  openMenuItem,
  selectLines,
  selectTeams,
  startGame,
  startPoint,
  startStatKeeper,
  submitGame,
} from './helpers';

const home = 'Kells Angels Bicycle Club';
const away = 'lumleysexuals';

test('basic point', async ({ page, rosters, league }) => {
  await startStatKeeper(page);

  // create game
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);
  await startGame(page);

  // select lines
  await expectHelpMessage(page, 'Select players for the first point.');
  const homeLine = [
    'Brian Kells',
    'Jonathan Champagne',
    'Martin Cloake',
    'Scott Higgins',
    'Christine Beals',
    'Ashlin Kelly',
  ];
  const awayLine = [
    'Owen Lumley',
    'Kevin Barford',
    'Wing-Leung Chan',
    'Stephen Close',
    'Karen Kavanagh',
    'Heather McCabe',
  ];
  await selectLines(page, homeLine, awayLine);
  await expectLinesSelected(page);
  await startPoint(page);

  // initial state (both lines enabled)
  await expectPlayersEnabled(page, homeLine);
  await expectPlayersEnabled(page, awayLine);

  // players who are off
  const homeBench = rosters[home].filter(p => !homeLine.includes(p));
  const awayBench = rosters[away].filter(p => !awayLine.includes(p));
  await expectPlayersDisabled(page, homeBench);
  await expectPlayersDisabled(page, awayBench);

  // record stats
  await expectGameState(page, 'Start');

  await clickButton(page, 'Brian Kells');
  await expectGameState(page, 'Pull');

  await clickButton(page, 'Pull');
  await expectGameState(page, 'PickUp');

  await clickButton(page, 'Owen Lumley');
  await expectGameState(page, 'AfterPull');

  await clickButton(page, 'Heather McCabe');
  await expectGameState(page, 'Normal');

  await clickButton(page, 'Kevin Barford');
  await expectGameState(page, 'Normal');

  await clickButton(page, 'Point!');

  await expectPlayByPlay(page, [
    '1.Brian Kells pulled',
    '2.Owen Lumley passed to Heather McCabe',
    '3.Heather McCabe passed to Kevin Barford',
    '4.Kevin Barford scored!',
  ]);

  // lines are swapped automatically
  await expectNextLineText(page);
  await expectPlayersNotSelected(page, homeLine);
  await expectPlayersNotSelected(page, awayLine);
  await expectPlayersSelected(page, homeBench);
  await expectPlayersSelected(page, awayBench);

  // submit
  await submitGame(page);

  // verify submitted stats
  const stats = await league.stats();
  expect(stats['Brian Kells'].pulls).toBe(1);
  expect(stats['Heather McCabe'].assists).toBe(1);
  expect(stats['Kevin Barford'].goals).toBe(1);
});

test('throwaway', async ({ page, rosters, league }) => {
  await startStatKeeper(page);

  // create game
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);
  await startGame(page);

  // select lines
  await expectHelpMessage(page, 'Select players for the first point.');
  const homeLine = rosters[home].slice(0, 6);
  const awayLine = rosters[away].slice(0, 6);
  await selectLines(page, homeLine, awayLine);
  await expectLinesSelected(page);
  await startPoint(page);

  // record stats
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Pull');
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Heather McCabe');

  // pre turnover state
  await expectPlayersDisabled(page, homeLine);
  // player with the disk is enabled
  await expectPlayersEnabled(
    page,
    awayLine.filter(p => p !== 'Heather McCabe')
  );

  // button state
  await expectButtonEnabled(page, 'Throwaway');
  await expectButtonEnabled(page, 'Drop');
  await expectButtonDisabled(page, 'D (Block)');
  await expectButtonDisabled(page, 'Catch D');

  // record throwaway (no D)
  await clickButton(page, 'Throwaway');
  await expectGameState(page, 'PickUp');

  // other team is enabled now
  await expectPlayersEnabled(page, homeLine);
  await expectPlayersDisabled(page, awayLine);

  // select who picked up the disc to complete
  await clickButton(page, 'Brian Kells');
  await expectGameState(page, 'AfterTurnover');

  // D buttons become enabled
  await expectButtonEnabled(page, 'D (Block)');
  await expectButtonEnabled(page, 'Catch D');

  // continue with a pass for a pure throw_away
  await clickButton(page, 'Scott Higgins'); // Pass
  await expectGameState(page, 'Normal');

  // D buttons disabled again
  await expectButtonDisabled(page, 'D (Block)');
  await expectButtonDisabled(page, 'Catch D');

  // record D (throwaway -> defender -> D)
  await clickButton(page, 'Throwaway');
  await expectGameState(page, 'PickUp');
  await expectPlayersDisabled(page, homeLine);
  await expectPlayersEnabled(page, awayLine);
  await clickButton(page, 'Owen Lumley');
  await expectGameState(page, 'AfterTurnover');
  await clickButton(page, 'D (Block)');
  await expectGameState(page, 'PickUp');

  // select who picked up the disc to continue
  await clickButton(page, 'Owen Lumley');
  await expectGameState(page, 'Normal');
  await clickButton(page, 'Heather McCabe'); // Pass
  await expectGameState(page, 'Normal');

  // record catch D (throwaway -> defender -> Catch D)
  await clickButton(page, 'Throwaway');
  await expectGameState(page, 'PickUp');
  await expectPlayersEnabled(page, homeLine);
  await expectPlayersDisabled(page, awayLine);
  await clickButton(page, 'Ashlin Kelly');
  await expectGameState(page, 'AfterTurnover');
  await clickButton(page, 'Catch D');
  await expectGameState(page, 'Normal');

  // defender already has the disk
  await expectButtonDisabled(page, 'Ashlin Kelly');
  await clickButton(page, 'Scott Higgins'); // Pass
  await expectGameState(page, 'Normal');
  await clickButton(page, 'Point!');

  await expectPlayByPlay(page, [
    '1.Brian Kells pulled',
    '2.Owen Lumley passed to Heather McCabe',
    '3.Heather McCabe threw it away',
    '4.Brian Kells passed to Scott Higgins',
    '5.Scott Higgins threw it away',
    '6.Owen Lumley got a block',
    '7.Owen Lumley passed to Heather McCabe',
    '8.Heather McCabe threw it away',
    '9.Ashlin Kelly got a block',
    '10.Ashlin Kelly passed to Scott Higgins',
    '11.Scott Higgins scored!',
  ]);
  await expectNextLineText(page);

  // submit
  await submitGame(page);

  // verify submitted stats
  const stats = await league.stats();

  // throw_aways
  expect(stats['Heather McCabe'].throw_aways).toBe(2);
  expect(stats['Heather McCabe'].catches).toBe(2);
  expect(stats['Heather McCabe'].o_points_against).toBe(1);

  expect(stats['Scott Higgins'].throw_aways).toBe(1);
  expect(stats['Scott Higgins'].goals).toBe(1);
  expect(stats['Scott Higgins'].d_points_for).toBe(1);

  // d block
  expect(stats['Owen Lumley'].d_blocks).toBe(1);
  expect(stats['Owen Lumley'].catches).toBe(0);
  expect(stats['Owen Lumley'].o_points_against).toBe(1);

  // catch d
  expect(stats['Ashlin Kelly'].d_blocks).toBe(1);
  expect(stats['Ashlin Kelly'].catches).toBe(0);
  expect(stats['Ashlin Kelly'].d_points_for).toBe(1);
});

test('drop', async ({ page, rosters, league }) => {
  await startStatKeeper(page);

  // create game
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);
  await startGame(page);

  // select lines
  await expectHelpMessage(page, 'Select players for the first point.');
  const homeLine = rosters[home].slice(0, 6);
  const awayLine = rosters[away].slice(0, 6);
  await selectLines(page, homeLine, awayLine);
  await expectLinesSelected(page);
  await startPoint(page);

  // record stats
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Pull');
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Heather McCabe');
  await clickButton(page, 'Drop');
  await expectGameState(page, 'PickUp');

  // possession flips
  await expectPlayersEnabled(page, homeLine);
  await expectPlayersDisabled(page, awayLine);

  await clickButton(page, 'Brian Kells');
  await expectGameState(page, 'AfterDrop');

  // D buttons should be disabled after a drop (no defensive play was made)
  await expectButtonDisabled(page, 'D (Block)');
  await expectButtonDisabled(page, 'Catch D');

  await clickButton(page, 'Ashlin Kelly');
  await expectGameState(page, 'Normal');
  await clickButton(page, 'Point!');

  await expectPlayByPlay(page, [
    '1.Brian Kells pulled',
    '2.Owen Lumley passed to Heather McCabe',
    '3.Heather McCabe dropped it',
    '4.Brian Kells passed to Ashlin Kelly',
    '5.Ashlin Kelly scored!',
  ]);
  await expectNextLineText(page);

  // submit
  await submitGame(page);

  // verify submitted stats
  const stats = await league.stats();

  expect(stats['Owen Lumley'].threw_drops).toBe(1);
  expect(stats['Owen Lumley'].o_points_against).toBe(1);
  expect(stats['Heather McCabe'].drops).toBe(1);
  expect(stats['Heather McCabe'].o_points_against).toBe(1);
  expect(stats['Ashlin Kelly'].d_points_for).toBe(1);
});

test('callahan', async ({ page, rosters, league }) => {
  await startStatKeeper(page);

  // create game
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);
  await startGame(page);

  // select lines
  await expectHelpMessage(page, 'Select players for the first point.');
  const homeLine = rosters[home].slice(0, 6);
  const awayLine = rosters[away].slice(0, 6);
  await selectLines(page, homeLine, awayLine);
  await expectLinesSelected(page);
  await startPoint(page);

  // record stats
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Pull');
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Throwaway');
  await clickButton(page, 'Ashlin Kelly');
  await expectGameState(page, 'AfterTurnover');
  await clickButton(page, 'Catch D');
  await expectGameState(page, 'Normal');
  await clickButton(page, 'Point!');

  await expectPlayByPlay(page, [
    '1.Brian Kells pulled',
    '2.Owen Lumley threw it away',
    '3.Ashlin Kelly got a block',
    '4.Ashlin Kelly scored!',
  ]);
  await expectNextLineText(page);

  // submit
  await submitGame(page);

  // verify submitted stats
  const stats = await league.stats();

  expect(stats['Owen Lumley'].throw_aways).toBe(1);
  expect(stats['Owen Lumley'].assists).toBe(0);
  expect(stats['Owen Lumley'].o_points_against).toBe(1);

  expect(stats['Ashlin Kelly'].goals).toBe(1);
  expect(stats['Ashlin Kelly'].callahan).toBe(1);
  expect(stats['Ashlin Kelly'].d_points_for).toBe(1);
});

test('back to back defense', async ({ page, rosters, league }) => {
  await startStatKeeper(page);

  // create game
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);
  await startGame(page);

  // select lines
  await expectHelpMessage(page, 'Select players for the first point.');
  const homeLine = rosters[home].slice(0, 6);
  const awayLine = rosters[away].slice(0, 6);
  await selectLines(page, homeLine, awayLine);
  await expectLinesSelected(page);
  await startPoint(page);

  // record stats: pull and initial pass
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Pull');
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Heather McCabe');

  // first D event - throwaway and block
  await clickButton(page, 'Throwaway');
  await clickButton(page, 'Ashlin Kelly');
  await clickButton(page, 'D (Block)');

  // verify first D is recorded
  await expectPlayByPlay(page, ['Heather McCabe threw it away']);
  await expectPlayByPlay(page, ['Ashlin Kelly got a block']);

  // Ashlin doesn't have possession (regular D block, not catch D)
  await expectPlayersEnabled(page, homeLine);
  await expectPlayersDisabled(page, awayLine);

  // second D event - pick up disc, throwaway, and another block
  await clickButton(page, 'Ashlin Kelly');
  await clickButton(page, 'Throwaway');
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'D (Block)');

  // verify second D is recorded
  await expectPlayByPlay(page, ['Ashlin Kelly threw it away']);
  await expectPlayByPlay(page, ['Owen Lumley got a block']);

  // finish the point
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Heather McCabe');
  await clickButton(page, 'Point!');

  await expectPlayByPlay(page, [
    '1.Brian Kells pulled',
    '2.Owen Lumley passed to Heather McCabe',
    '3.Heather McCabe threw it away',
    '4.Ashlin Kelly got a block',
    '5.Ashlin Kelly threw it away',
    '6.Owen Lumley got a block',
    '7.Owen Lumley passed to Heather McCabe',
    '8.Heather McCabe scored!',
  ]);
  await expectNextLineText(page);

  // submit
  await submitGame(page);

  // verify submitted stats
  const stats = await league.stats();

  // both players got a block
  expect(stats['Ashlin Kelly'].d_blocks).toBe(1);
  expect(stats['Owen Lumley'].d_blocks).toBe(1);

  // both players threw it away
  expect(stats['Ashlin Kelly'].throw_aways).toBe(1);
  expect(stats['Heather McCabe'].throw_aways).toBe(1);

  // goal
  expect(stats['Heather McCabe'].goals).toBe(1);
});

// this isn't actually a special case if you understand the underlying logic
// but since that is not always clear having this test is worth it.
test('dropped pull', async ({ page, rosters, league }) => {
  await startStatKeeper(page);

  // create game
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);
  await startGame(page);

  // select lines
  await expectHelpMessage(page, 'Select players for the first point.');
  const homeLine = rosters[home].slice(0, 6);
  const awayLine = rosters[away].slice(0, 6);
  await selectLines(page, homeLine, awayLine);
  await expectLinesSelected(page);
  await startPoint(page);

  // record pull
  await expectGameState(page, 'Start');
  await clickButton(page, 'Brian Kells');
  await expectGameState(page, 'Pull');
  await clickButton(page, 'Pull');
  await expectGameState(page, 'PickUp');

  // receiving player drops the pull
  await clickButton(page, 'Owen Lumley');
  await expectGameState(page, 'AfterPull');
  await clickButton(page, 'Drop');
  await expectGameState(page, 'PickUp');

  // verify pull and drop are recorded
  await expectPlayByPlay(page, ['Brian Kells pulled']);
  await expectPlayByPlay(page, ['Owen Lumley dropped it']);

  // possession flips to pulling team
  await expectPlayersEnabled(page, homeLine);
  await expectPlayersDisabled(page, awayLine);

  // finish the point
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Ashlin Kelly');
  await clickButton(page, 'Point!');

  await expectPlayByPlay(page, [
    '1.Brian Kells pulled',
    '2.Owen Lumley dropped it',
    '3.Brian Kells passed to Ashlin Kelly',
    '4.Ashlin Kelly scored!',
  ]);
  await expectNextLineText(page);

  // submit
  await submitGame(page);

  // verify submitted stats
  const stats = await league.stats();

  // pull stats
  expect(stats['Brian Kells'].pulls).toBe(1);

  // drop stats
  expect(stats['Owen Lumley'].drops).toBe(1);
  expect(stats['Owen Lumley'].o_points_against).toBe(1);

  // goal stats
  expect(stats['Ashlin Kelly'].goals).toBe(1);
  expect(stats['Ashlin Kelly'].d_points_for).toBe(1);
});

test('halftime', async ({ page, rosters, league }) => {
  await startStatKeeper(page);

  // create game
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);
  await startGame(page);

  // select lines
  await expectHelpMessage(page, 'Select players for the first point.');
  const homeLine = rosters[home].slice(0, 6);
  const awayLine = rosters[away].slice(0, 6);
  await selectLines(page, homeLine, awayLine);
  await expectLinesSelected(page);
  await startPoint(page);

  // initial state (both teams enabled)
  await expectPlayersEnabled(page, homeLine);
  await expectPlayersEnabled(page, awayLine);

  // pull to start
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Pull');

  // first point
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Ashlin Kelly');
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Ashlin Kelly');
  await clickButton(page, 'Point!');

  // record half
  await expectNextLineText(page);
  await openMenuItem(page, 'Record Half');
  await expectSnackbar(page, 'Half time recorded.');

  // expect select lines state with no players selected
  await expectHelpMessage(page, 'Select players for the next point.');
  await expectPlayersNotSelected(page, rosters[home]);
  await expectPlayersNotSelected(page, rosters[away]);

  // test undoing half time
  await clickButton(page, 'Undo Half');
  await expectNextLineText(page);

  // should also be able to undo point from here
  await clickButton(page, 'Undo Point');

  // the correct line is selected still
  await expectPlayersEnabled(
    page,
    homeLine.filter(p => p !== 'Ashlin Kelly')
  );
  await expectPlayersDisabled(page, awayLine);
  await clickButton(page, 'Point!');

  // record half again
  await expectNextLineText(page);
  await openMenuItem(page, 'Record Half');
  await expectSnackbar(page, 'Half time recorded.');

  // select lines again
  await expectHelpMessage(page, 'Select players for the next point.');
  await expectPlayersNotSelected(page, rosters[home]);
  await expectPlayersNotSelected(page, rosters[away]);
  await selectLines(page, homeLine, awayLine);
  await expectLinesSelected(page);
  await startPoint(page);

  // after half state (both teams enabled)
  // ideally it should force the correct team to pull after half
  await expectPlayersEnabled(page, homeLine);
  await expectPlayersEnabled(page, awayLine);

  // pull to start
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Pull');

  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Heather McCabe');
  await clickButton(page, 'Kevin Barford');
  await clickButton(page, 'Point!');

  // submit
  await submitGame(page);

  // verify submitted stats
  const stats = await league.stats();

  expect(stats['Owen Lumley'].pulls).toBe(1);
  expect(stats['Brian Kells'].pulls).toBe(1);
});
