import { test, expect } from './fixtures';
import {
  addPlayer,
  clickButton,
  expectHelpMessage,
  expectLinesSelected,
  expectPlayByPlay,
  expectPlayersEnabled,
  expectRosters,
  expectSnackbar,
  expectText,
  handleRatioWarningIfPresent,
  openMenuItem,
  refutePlayByPlay,
  removePlayer,
  selectLines,
  selectTeams,
  startGame,
  startPoint,
  startStatKeeper,
  submitGame,
} from './helpers';

const home = 'Kells Angels Bicycle Club';
const away = 'lumleysexuals';

test('edit initial rosters', async ({ page, rosters, league }) => {
  await startStatKeeper(page);

  // create game (now navigates to roster editing view)
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);

  // add league player (home team)
  await addPlayer(page, 0, 'Matthew Schijns', { pick: true });

  // trying to add the player again gives a warning
  await addPlayer(page, 0, 'Matthew Schijns', { pick: true });
  await expectSnackbar(page, 'Matthew Schijns(S) is already on the roster.');

  // add sub (away team)
  await addPlayer(page, 1, 'Kevin Hughes');

  // trying to add the player again gives a warning
  await addPlayer(page, 1, 'Kevin Hughes');
  await expectSnackbar(page, 'Kevin Hughes(S) is already on the roster.');

  // remove player (away team)
  await removePlayer(page, 'Kevin Barford');

  // check updated rosters
  const homeRoster = [...rosters[home], 'Matthew Schijns(S)'];
  const awayRoster = [...rosters[away], 'Kevin Hughes(S)'].filter(p => p !== 'Kevin Barford');
  await expectRosters(page, homeRoster, awayRoster);

  // start (Update Rosters button)
  await startGame(page);

  // need to do at least one point before we can submit

  // select lines (from the updated rosters, Kevin Barford is gone)
  await expectHelpMessage(page, 'Select players for the first point.');
  const homeLine = homeRoster.slice(0, 6);
  const awayLine = awayRoster.slice(0, 6);
  await selectLines(page, homeLine, awayLine);
  await expectLinesSelected(page);
  await startPoint(page);

  // record stats
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Pull');
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Heather McCabe');
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Point!');

  await expectPlayByPlay(page, [
    '1.Brian Kells pulled',
    '2.Owen Lumley passed to Heather McCabe',
    '3.Heather McCabe passed to Owen Lumley',
    '4.Owen Lumley scored!',
  ]);

  // submit and check game rosters
  await submitGame(page);
  const game = await league.game();
  expect(game.homeRoster).toEqual(homeRoster.sort());
  expect(game.awayRoster).toEqual(awayRoster.sort());
});

test('edit rosters mid game', async ({ page, rosters }) => {
  await startStatKeeper(page);

  // create game
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);
  await startGame(page);

  // select lines
  await expectHelpMessage(page, 'Select players for the first point.');
  await selectLines(page, rosters[home].slice(0, 6), rosters[away].slice(0, 6));
  await expectLinesSelected(page);
  await startPoint(page);

  // record stats
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Pull');
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Heather McCabe');
  await clickButton(page, 'Kevin Barford');
  await clickButton(page, 'Point!');

  // edit rosters
  await openMenuItem(page, 'Edit Rosters');

  // add sub
  await addPlayer(page, 0, 'Kevin Hughes');

  // test removing and re-adding a roster player doesn't add (S) suffix
  await removePlayer(page, 'Brian Kells');
  await expect(page.locator('#root')).not.toContainText('Brian KellsRemove');
  await addPlayer(page, 0, 'Brian Kells', { pick: true });

  // verify Brian Kells was added back WITHOUT (S) suffix
  await expect(page.locator('#root')).toContainText('Brian KellsRemove');
  await expect(page.locator('#root')).not.toContainText('Brian Kells(S)');

  // finish
  await clickButton(page, 'Update Rosters');

  // select lines
  await expectText(page, 'Players not on the previous line are pre-selected. Adjust and confirm.');
  // we added one sub so the flip selection selects the other 7 players now
  // we need to un-select one. this isn't really realistic as it is easier and better to remove
  // players who aren't there so in practice the flip logic works fine.
  await clickButton(page, 'Rob Ives');
  await expectLinesSelected(page);
  await startPoint(page);

  await expect(page.getByRole('button', { name: 'Point!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kevin Hughes(S)' })).toBeEnabled();

  await clickButton(page, 'Kevin Hughes(S)');
  await clickButton(page, 'Krys Kudakiewicz');

  await expectPlayByPlay(page, ['1.Kevin Hughes(S) passed to Krys Kudakiewicz']);
});

test('custom substitutes', async ({ page, rosters, league }) => {
  await startStatKeeper(page);

  // create game
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);

  // add open sub to the home team (default is ON2, so just add)
  await addPlayer(page, 0, 'Open Sub');

  // trying to add the player again gives a warning
  await addPlayer(page, 0, 'Open Sub');
  await expectSnackbar(page, 'Open Sub(S) is already on the roster');

  // add wn2 sub to away team. The gender toggle appears when typing a new
  // name and shows "ON2" by default, click it to switch to "WN2"
  const search = page.getByPlaceholder('Type to search or add new...').nth(1);
  await search.click();
  await search.fill('WN2 Sub');
  await page.getByText('ON2').last().click();
  await page.getByRole('button', { name: 'Add' }).nth(1).click();

  // check updated rosters - these should now include the subs
  const homeRoster = [...rosters[home], 'Open Sub(S)'];
  const awayRoster = [...rosters[away], 'WN2 Sub(S)'];
  await expectRosters(page, homeRoster, awayRoster);

  // start game
  await startGame(page);

  // select lines including the substitutes
  const homeLine = [...rosters[home].slice(0, 5), 'Open Sub(S)'];
  const awayLine = [...rosters[away].slice(0, 5), 'WN2 Sub(S)'];
  await selectLines(page, homeLine, awayLine);
  await expectLinesSelected(page);
  await startPoint(page);

  // check that the subs are styled properly
  const openSubButton = page.getByRole('button', { name: 'Open Sub(S)' });
  const wn2SubButton = page.getByRole('button', { name: 'WN2 Sub(S)' });

  await expect(openSubButton).toHaveCSS('background-color', 'rgb(227, 242, 253)'); // blue
  await expect(wn2SubButton).toHaveCSS('background-color', 'rgb(243, 229, 245)'); // purple

  // record a simple point using the substitute
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Pull');
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Karen Kavanagh');
  await clickButton(page, 'WN2 Sub(S)');
  await clickButton(page, 'Point!');

  // submit game
  await submitGame(page);

  // verify submitted stats - check that the substitute appears in stats
  const stats = await league.stats();
  expect(stats['WN2 Sub(S)'].goals).toBe(1);

  // the game is stored with the subs on its rosters
  const { games, teams } = await league.export();
  expect(games[0].homeRoster).toContain('Open Sub(S)');
  expect(games[0].awayRoster).toContain('WN2 Sub(S)');

  // and subs are not added to the league's teams (v2 created a player for
  // each with an unknown gender). Sub genders are not uploaded at all, which
  // could be added to the upload now that the android app is gone.
  const players = teams.flatMap(t => t.players.map(p => p.name));
  expect(players).not.toContain('Open Sub(S)');
  expect(players).not.toContain('WN2 Sub(S)');
});

test('edit rosters mid point and change line', async ({ page, rosters, league }) => {
  await startStatKeeper(page);

  // create game
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);
  await startGame(page);

  // select lines
  await expectHelpMessage(page, 'Select players for the first point.');
  await selectLines(page, rosters[home].slice(0, 6), rosters[away].slice(0, 6));
  await expectLinesSelected(page);
  await startPoint(page);

  // record stats
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Pull');
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Heather McCabe');

  // edit rosters
  await openMenuItem(page, 'Edit Rosters');

  // add sub
  await addPlayer(page, 0, 'Kevin Hughes');
  await clickButton(page, 'Update Rosters');

  // change line
  await openMenuItem(page, 'Change Line');
  await expect(page.locator('#root')).toContainText('Resume Point');

  // sub brian for kevin
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Kevin Hughes(S)');
  await clickButton(page, 'Resume Point');
  await handleRatioWarningIfPresent(page);

  await clickButton(page, 'Throwaway');
  await clickButton(page, 'Kevin Hughes(S)');
  await clickButton(page, 'Catch D');
  await clickButton(page, 'Ashlin Kelly');
  await clickButton(page, 'Point!');

  // submit
  await submitGame(page);

  // verify stats
  const stats = await league.stats();
  expect(stats['Kevin Hughes(S)'].assists).toBe(1);

  // verify game
  const game = await league.game();
  expect(game.homeRoster).toContain('Kevin Hughes(S)');
  expect(game.points[0].defensePlayers).toContain('Kevin Hughes(S)');
});

test('change line mid point', async ({ page, rosters, league }) => {
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

  // change line
  await openMenuItem(page, 'Change Line');

  // help text
  const message = "Substituting players mid-point. Adjust the line and click 'Resume Point'.";
  await expectHelpMessage(page, message);

  // undo is not available
  await expect(page.locator('#root')).not.toContainText('Undo');

  // original line selected
  await expectPlayersEnabled(page, homeLine);
  await expectPlayersEnabled(page, awayLine);

  // sub kevin for kyle
  await clickButton(page, 'Kevin Barford');
  await clickButton(page, 'Kyle Sprysa');

  // resume
  await clickButton(page, 'Resume Point');
  await handleRatioWarningIfPresent(page);

  // play by play
  await expectPlayByPlay(page, ['1.Brian Kells pulled', '2.Owen Lumley passed to Heather McCabe']);

  // undo here removes the last action
  // changing the line is not an un-doable action. just change it again
  await clickButton(page, 'Undo');

  // after undo play by play
  await expectPlayByPlay(page, ['1.Brian Kells pulled']);
  await refutePlayByPlay(page, ['2.Owen Lumley passed to Heather McCabe']);

  // resume stats
  await clickButton(page, 'Kyle Sprysa');
  await clickButton(page, 'Heather McCabe');
  await clickButton(page, 'Kyle Sprysa');
  await clickButton(page, 'Point!');

  // submit
  await submitGame(page);

  // verify stats
  const stats = await league.stats();
  expect(stats['Brian Kells'].pulls).toBe(1);
  expect(stats['Kyle Sprysa'].goals).toBe(1);

  // the player subbed off does not get stats for points played or +/-
  // no plus minus makes sense but technically they should get a point played
  //
  // fixing this is not straight forward and is an exisiting bug in android too
  // * if we add players to the point then undo gets hard with re-selecting the correct line
  // * we could use a substitution event that records them leaving then we can update the backend
  //   to calculate points_played by any activity on the point (because there will always be one)
  //   instead of just using the final line for the point. Then we would need to store two "denominators"
  //   one for averaging their salaray per point which includes points they subbbed off from and another
  //   to properly calculate their efficiencies. If you sub off you shouldn't get a point scored against you
  // * since there isn't an easy way to "get everything" right now. Lets keep it like it is now
  //   have which means your salaray per point is slightly higher since it contains events for points
  //   where you were subbed off but those points don't contribute to the denominator

  // verify points played
  expect(stats['Kyle Sprysa'].points_played).toBe(1);
  expect(stats).not.toHaveProperty('Kevin Barford');

  // verify point
  const game = await league.game();
  expect(game.points[0].offensePlayers).toContain('Kyle Sprysa');
  expect(game.points[0].offensePlayers).not.toContain('Kevin Barford');
});
