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
  expectRosters,
  refutePlayByPlay,
  selectLines,
  selectTeams,
  startGame,
  startPoint,
  startStatKeeper,
  submitGame,
} from './helpers';

const home = 'Kells Angels Bicycle Club';
const away = 'lumleysexuals';

test('undo', async ({ page, rosters, league }) => {
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

  // check possession
  await expectButtonEnabled(page, 'Owen Lumley');
  await expectButtonDisabled(page, 'Heather McCabe');

  // undo pass
  await clickButton(page, 'Undo');

  // possesion moves back
  await expectButtonDisabled(page, 'Owen Lumley');
  await expectButtonEnabled(page, 'Heather McCabe');

  // new pass
  await clickButton(page, 'Kevin Barford');
  await expectPlayByPlay(page, ['1.Brian Kells pulled', '2.Owen Lumley passed to Kevin Barford']);

  // throw away undo
  await clickButton(page, 'Throwaway');
  await expectPlayByPlay(page, ['Kevin Barford threw it away']);
  await clickButton(page, 'Undo');
  await refutePlayByPlay(page, ['Kevin Barford threw it away']);

  // drop undo
  await clickButton(page, 'Drop');
  await expectPlayByPlay(page, ['Kevin Barford dropped it']);
  await clickButton(page, 'Undo');
  await refutePlayByPlay(page, ['Kevin Barford dropped it']);

  // d undo
  await clickButton(page, 'Throwaway');
  await clickButton(page, 'Scott Higgins');
  await clickButton(page, 'D (Block)');
  await expectPlayByPlay(page, ['Kevin Barford threw it away']);
  await expectPlayByPlay(page, ['Scott Higgins got a block']);
  await expectButtonEnabled(page, 'Scott Higgins'); // not a catch d so no one has possession
  await clickButton(page, 'Undo');
  await expectPlayByPlay(page, ['Kevin Barford threw it away']);
  await refutePlayByPlay(page, ['Scott Higgins got a block']);
  // undo possession
  await expectButtonDisabled(page, 'Scott Higgins');
  await clickButton(page, 'Undo');
  await expectButtonEnabled(page, 'Scott Higgins');
  // undo throw away
  await clickButton(page, 'Undo');
  await refutePlayByPlay(page, ['Kevin Barford threw it away']);

  // catch d undo
  await clickButton(page, 'Throwaway');
  await clickButton(page, 'Scott Higgins');
  await clickButton(page, 'Catch D');
  await expectPlayByPlay(page, ['Kevin Barford threw it away']);
  await expectPlayByPlay(page, ['Scott Higgins got a block']);
  await expectButtonDisabled(page, 'Scott Higgins'); // catch d so he has possession
  await clickButton(page, 'Undo');
  await expectPlayByPlay(page, ['Kevin Barford threw it away']);
  await refutePlayByPlay(page, ['Scott Higgins got a block']);
  // undo possession
  await expectButtonDisabled(page, 'Scott Higgins');
  await clickButton(page, 'Undo');
  await expectButtonEnabled(page, 'Scott Higgins');
  // undo throw away
  await clickButton(page, 'Undo');
  await refutePlayByPlay(page, ['Kevin Barford threw it away']);

  // undo point
  // first we need another pass.
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Point!');
  await expectPlayByPlay(page, ['Owen Lumley scored!']);
  await clickButton(page, 'Undo Point');
  await refutePlayByPlay(page, ['Owen Lumley scored!']);

  // finish point
  await clickButton(page, 'Point!');

  await expectPlayByPlay(page, [
    '1.Brian Kells pulled',
    '2.Owen Lumley passed to Kevin Barford',
    '3.Kevin Barford passed to Owen Lumley',
    '4.Owen Lumley scored!',
  ]);
  await expectNextLineText(page);

  // start second point
  await startPoint(page);

  // undo callahan
  await clickButton(page, 'Christopher Keates');
  await clickButton(page, 'Throwaway');
  await clickButton(page, 'Kyle Sprysa');
  await clickButton(page, 'Catch D');
  await clickButton(page, 'Point!');
  await clickButton(page, 'Undo Point');
  await clickButton(page, 'Kirsten Querbach');
  await clickButton(page, 'Point!');

  // submit
  await submitGame(page);

  // verify submitted stats
  const stats = await league.stats();

  expect(stats['Owen Lumley'].goals).toBe(1);

  expect(stats['Kevin Barford'].goals).toBe(0);
  expect(stats['Kevin Barford'].throw_aways).toBe(0);
  expect(stats['Kevin Barford'].drops).toBe(0);
  expect(stats['Kevin Barford'].completions).toBe(1);
  expect(stats['Kevin Barford'].assists).toBe(1);

  expect(stats['Scott Higgins'].d_blocks).toBe(0);

  expect(stats['Kyle Sprysa'].goals).toBe(0);
  expect(stats['Kyle Sprysa'].callahan).toBe(0);

  expect(stats['Kirsten Querbach'].goals).toBe(1);
});

test('undo pull', async ({ page, rosters }) => {
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

  // select player
  await clickButton(page, 'Owen Lumley');
  await expectGameState(page, 'Pull');
  await clickButton(page, 'Undo');
  await expectGameState(page, 'Start');

  // at the begining again. nothing more to undo
  await expectButtonDisabled(page, 'Undo');

  // select player (opposite team as before now) and pull
  await clickButton(page, 'Brian Kells');
  await expectGameState(page, 'Pull');
  await clickButton(page, 'Pull');
  await expectGameState(page, 'PickUp');
  await expectPlayByPlay(page, ['1.Brian Kells pulled']);

  // receive
  await clickButton(page, 'Owen Lumley');
  await expectGameState(page, 'AfterPull');

  // undo twice
  await clickButton(page, 'Undo');
  await expectGameState(page, 'PickUp');
  await expectPlayByPlay(page, ['1.Brian Kells pulled']);

  await clickButton(page, 'Undo');
  await expect(page.locator('#root')).not.toContainText('1.Brian Kells pulled');

  // pull again
  await clickButton(page, 'Pull');
  await expectPlayByPlay(page, ['1.Brian Kells pulled']);
});
