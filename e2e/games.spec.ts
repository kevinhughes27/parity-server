import { test, expect } from './fixtures';
import {
  addPlayer,
  clickButton,
  expectButtonDisabled,
  expectHelpMessage,
  expectLinesSelected,
  expectNextLineText,
  expectPlayByPlay,
  expectRosters,
  expectSnackbar,
  expectText,
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

test('resume', async ({ page, rosters, league }) => {
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
  await clickButton(page, 'Kevin Barford');
  await clickButton(page, 'Point!');

  const playByPlay = [
    '1.Brian Kells pulled',
    '2.Owen Lumley passed to Heather McCabe',
    '3.Heather McCabe passed to Kevin Barford',
    '4.Kevin Barford scored!',
  ];
  await expectPlayByPlay(page, playByPlay);
  await expectNextLineText(page);

  // reload the app to simulate a crash or restart etc
  // playwright can spawn a new browser but they are isolated
  // it can be configured to share state but extra config kind of
  // defeats the purpose and this is sufficient
  await page.goto('/stat_keeper');

  // resume game
  await expectText(page, 'Kells Angels Bicycle Club vs lumleysexuals');
  await expectText(page, 'Score: Kells Angels Bicycle Club 0 - 1 lumleysexuals');

  await expectText(page, 'in-progress');
  await page.getByRole('link', { name: 'Resume Game' }).click();

  // right back where we left off
  await expectPlayByPlay(page, playByPlay);
  await expectNextLineText(page);

  // test undo after resume
  await clickButton(page, 'Undo Point');
  await expectButtonDisabled(page, 'Kevin Barford'); // has possession
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Point!');

  await expectPlayByPlay(page, [
    '1.Brian Kells pulled',
    '2.Owen Lumley passed to Heather McCabe',
    '3.Heather McCabe passed to Kevin Barford',
    '4.Kevin Barford passed to Owen Lumley',
    '5.Owen Lumley scored!',
  ]);
  await expectNextLineText(page);

  // submit
  await submitGame(page);

  // verify submitted stats
  const stats = await league.stats();
  expect(stats['Kevin Barford'].assists).toBe(1);
  expect(stats['Owen Lumley'].goals).toBe(1);
});

test('resubmit', async ({ page, rosters, league }) => {
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
  await clickButton(page, 'Kevin Barford');
  await clickButton(page, 'Point!');

  await expectPlayByPlay(page, [
    '1.Brian Kells pulled',
    '2.Owen Lumley passed to Heather McCabe',
    '3.Heather McCabe passed to Kevin Barford',
    '4.Kevin Barford scored!',
  ]);

  // simulate network failure for the upload
  const upload = '**/api/*/games/*';
  await page.route(upload, route => route.abort());

  // submit
  await submitGame(page, { failed: true });

  // view game
  await page.getByRole('link', { name: 'View Game' }).click();
  await expectText(page, 'Kells Angels Bicycle Club vs lumleysexuals');

  // fix network failure
  await page.unroute(upload);

  // re-submit the game
  await clickButton(page, 'Re-sync');

  // success
  await expect(page.getByRole('alert')).toContainText('Game successfully uploaded to server!');
  await expect(page.locator('#root')).not.toContainText('Re-sync');

  // verify submitted stats
  const stats = await league.stats();
  expect(stats['Brian Kells'].pulls).toBe(1);
  expect(stats['Heather McCabe'].assists).toBe(1);
  expect(stats['Kevin Barford'].goals).toBe(1);
});

// The stat keeper needs the network to load rosters and at the end to submit,
// but during the game (including mid-game roster edits) it should work offline.
test('offline functionality', async ({ page, rosters, league }) => {
  await startStatKeeper(page);

  // create game with network available (loads rosters)
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);
  await startGame(page);

  // DISABLE NETWORK - simulate offline mode
  await page.route('**', route => route.abort());

  // select lines and start first point (should work offline)
  await expectHelpMessage(page, 'Select players for the first point.');
  const homeLine = rosters[home].slice(0, 6);
  const awayLine = rosters[away].slice(0, 6);
  await selectLines(page, homeLine, awayLine);
  await expectLinesSelected(page);
  await startPoint(page);

  // record first point (should work offline)
  await clickButton(page, 'Brian Kells');
  await clickButton(page, 'Pull');
  await clickButton(page, 'Owen Lumley');
  await clickButton(page, 'Heather McCabe');
  await clickButton(page, 'Kevin Barford');
  await clickButton(page, 'Point!');

  await expectPlayByPlay(page, [
    '1.Brian Kells pulled',
    '2.Owen Lumley passed to Heather McCabe',
    '3.Heather McCabe passed to Kevin Barford',
    '4.Kevin Barford scored!',
  ]);

  // edit rosters mid-game while offline
  await openMenuItem(page, 'Edit Rosters');

  // can still add sub while offline
  // league players were cached when we started the game
  await addPlayer(page, 0, 'An Tran', { pick: true });

  // verify sub was added
  await expect(page.locator('#root')).toContainText('An Tran(S)');

  // finish roster edit
  await clickButton(page, 'Update Rosters');

  // select lines for second point (with the new sub)
  await expectNextLineText(page);
  // We added a sub so the flip logic selected the bench players plus the new
  // sub (7 players). Deselect one from the bench to get back to 6
  const homeBench = rosters[home].slice(6);
  await clickButton(page, homeBench[0]);
  await expectLinesSelected(page);
  await startPoint(page);

  // record second point with the substitute (still offline)
  await clickButton(page, 'An Tran(S)');
  await clickButton(page, homeBench[1]);
  await clickButton(page, homeBench[2]);
  await clickButton(page, 'Point!');

  // verify play by play includes the substitute
  await expectPlayByPlay(page, [`An Tran(S) passed to ${homeBench[1]}`]);

  // RE-ENABLE NETWORK - needed for submission
  await page.unroute('**');

  // submit game (now with network)
  await submitGame(page);

  // verify submitted stats include both regular and offline-added players
  const stats = await league.stats();
  expect(stats['Brian Kells'].pulls).toBe(1);
  expect(stats['Kevin Barford'].goals).toBe(1);
  expect(stats['An Tran(S)'].completions).toBe(1);
  expect(stats[homeBench[2]].goals).toBe(1);

  // verify game has the substitute in the roster
  const game = await league.game();
  expect(game.homeRoster).toContain('An Tran(S)');
});

test('select scheduled matchup', async ({ page, rosters, matchup, league }) => {
  await startStatKeeper(page);

  // verify upcoming games section is visible
  await expect(page.locator('#root')).toContainText('Upcoming Games');

  // verify matchup is shown with team names
  await expect(page.locator('#root')).toContainText(home);
  await expect(page.locator('#root')).toContainText(away);
  await expect(page.locator('#root')).toContainText(`Week ${matchup.week}`);

  // click on the matchup to select it
  await page.getByText(`${home} vs ${away}`).click();

  // verify teams are pre-selected in the Create Game section
  await expect(page.locator('#root')).toContainText('Create Game');

  // verify week is pre-filled
  await expect(page.getByLabel('Week')).toHaveValue(String(matchup.week));

  // create game
  await clickButton(page, 'Create Game');

  // verify we're on the game page with rosters
  await expectRosters(page, rosters[home], rosters[away]);

  // start game and verify it works
  await startGame(page);

  // select lines and play a quick point
  const homeLine = rosters[home].slice(0, 6);
  const awayLine = rosters[away].slice(0, 6);
  await selectLines(page, homeLine, awayLine);
  await expectLinesSelected(page);
  await startPoint(page);

  // quick point
  await clickButton(page, homeLine[0]);
  await clickButton(page, 'Pull');
  await clickButton(page, awayLine[0]);
  await clickButton(page, awayLine[1]);
  await clickButton(page, awayLine[2]);
  await clickButton(page, 'Point!');

  // submit
  await submitGame(page);

  // verify game was created with correct teams and week
  const game = await league.game();
  expect(game.homeTeam).toBe(home);
  expect(game.awayTeam).toBe(away);
  expect(game.week).toBe(matchup.week);
});

test('perf', async ({ page, rosters, league }) => {
  test.slow();

  await startStatKeeper(page);

  const homeLine1 = rosters[home].slice(0, 6);
  const homeLine2 = rosters[home].slice(6);
  const awayLine1 = rosters[away].slice(0, 6);
  const awayLine2 = rosters[away].slice(6);

  // create game
  await selectTeams(page, home, away);
  await expectRosters(page, rosters[home], rosters[away]);
  await startGame(page);

  // track timing for each point
  const pointTimes: number[] = [];

  // pass to each player on the team, with the last one scoring
  async function passAndScore(team: string[]) {
    for (const player of team) await clickButton(page, player);
    await clickButton(page, 'Point!');
  }

  async function playHalf({ puller, receivers, lines }: Half) {
    for (let point = 0; point < 20; point++) {
      const start = performance.now();
      await startPoint(page);

      if (point === 0) {
        await clickButton(page, puller);
        await clickButton(page, 'Pull');
        await passAndScore(receivers);
      } else {
        // the lines alternate each point and the team that was scored on
        // starts with possession
        await passAndScore(point % 2 === 1 ? lines.odd : lines.even);
      }

      pointTimes.push((performance.now() - start) / 1000);
      await expectNextLineText(page);
    }
  }

  // first half - 20 points, away pulls
  await expectHelpMessage(page, 'Select players for the first point.');
  await selectLines(page, homeLine1, awayLine1);
  await expectLinesSelected(page);
  await playHalf({
    puller: awayLine1[0], // Owen Lumley
    receivers: homeLine1,
    lines: { odd: awayLine2, even: homeLine1 },
  });

  // record half
  await openMenuItem(page, 'Record Half');
  await expectSnackbar(page, 'Half time recorded.');

  // second half - 20 more points, home pulls
  await selectLines(page, homeLine1, awayLine1);
  await expectLinesSelected(page);
  await playHalf({
    puller: homeLine1[0], // Brian Kells
    receivers: awayLine1,
    lines: { odd: homeLine2, even: awayLine1 },
  });

  // submit game
  await submitGame(page);

  // verify stats
  const stats = await league.stats();

  // Each team should have scored 20 points (40 total)
  const totalGoals = Object.values(stats).reduce((total, s) => total + s.goals, 0);
  expect(totalGoals).toBe(40);

  // last player on each line should have 10 goals
  expect(stats[homeLine1.at(-1)!].goals).toBe(10);
  expect(stats[homeLine2.at(-1)!].goals).toBe(10);
  expect(stats[awayLine1.at(-1)!].goals).toBe(10);
  expect(stats[awayLine2.at(-1)!].goals).toBe(10);

  // analyze performance - compute slope to ensure no exponential slowdown
  const n = pointTimes.length;
  const xMean = (n - 1) / 2;
  const yMean = pointTimes.reduce((a, b) => a + b, 0) / n;

  // least squares slope
  let numerator = 0;
  let denominator = 0;
  pointTimes.forEach((y, x) => {
    numerator += (x - xMean) * (y - yMean);
    denominator += (x - xMean) ** 2;
  });
  const slope = numerator / denominator;

  // the slope should be very small (close to 0) indicating no significant slowdown
  // a slope > 0.1 seconds per point would indicate serious performance degradation
  expect(slope, `Performance degradation detected: ${slope.toFixed(4)}s per point`).toBeLessThan(
    0.1
  );

  // also check that no individual point took an unreasonably long time
  const maxTime = Math.max(...pointTimes);
  expect(maxTime, `Individual point took too long: ${maxTime.toFixed(2)}s`).toBeLessThan(5);

  console.log(
    `perf: ${n} points, average ${yMean.toFixed(3)}s, max ${maxTime.toFixed(3)}s, slope ${slope.toFixed(6)}s per point`
  );
});

interface Half {
  puller: string;
  receivers: string[];
  lines: { odd: string[]; even: string[] };
}
