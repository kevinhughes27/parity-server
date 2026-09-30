// Stat keeper helpers, ported from v2's test_stat_keeper.py.
//
// use `yarn e2e --headed --debug` and `await page.pause()` to step through a
// test, or `yarn e2e --ui` to watch them run.

import { expect, type Page } from '@playwright/test';

export async function startStatKeeper(page: Page) {
  await page.goto('/stat_keeper');

  const blankSlate = 'No games stored locally. Click "Start New Game" to begin.';
  await expect(page.getByRole('paragraph')).toContainText(blankSlate);

  await clickButton(page, 'Start New Game');
  await expect(page.locator('h5')).toContainText('New Game');
}

export async function selectTeams(page: Page, home: string, away: string) {
  // initial state
  await expect(page.locator('h5')).toContainText('New Game');

  // select teams
  await page.getByRole('combobox', { name: 'Home Team' }).click();
  await page.getByRole('option', { name: home }).click();

  await page.getByRole('combobox', { name: 'Away Team' }).click();
  await page.getByRole('option', { name: away }).click();

  // create game (navigates to game view in edit rosters mode)
  await clickButton(page, 'Create Game');
}

// checks that all player names are visible but does not check inside a specific container
// so this assumes the rosters are distinct sets (which they should be)
export async function expectRosters(page: Page, homePlayers: string[], awayPlayers: string[]) {
  for (const player of [...homePlayers, ...awayPlayers]) {
    await expect(page.locator('#root')).toContainText(player);
  }

  // roster editing now visible
  await expect(page.getByRole('button', { name: 'Add' }).first()).toBeVisible();
}

export async function startGame(page: Page) {
  await clickButton(page, 'Update Rosters');
}

// the line selection warning dialog, if it appears
export async function handleRatioWarningIfPresent(page: Page) {
  const dialog = page.getByRole('heading', { name: 'Line Selection Warning' });
  if (await dialog.isVisible()) {
    await clickButton(page, 'Continue Anyway');
  }
}

export async function expectSnackbar(page: Page, message: string) {
  await expect(page.getByRole('alert')).toContainText(message);
  // wait for it to disappear
  await expect(page.getByRole('alert')).not.toBeVisible({ timeout: 5000 });
}

export async function startPoint(page: Page) {
  await clickButton(page, 'Start Point');
  await handleRatioWarningIfPresent(page);
}

export async function selectLines(page: Page, homeLine: string[], awayLine: string[]) {
  for (const player of [...homeLine, ...awayLine]) {
    await clickButton(page, player);
  }
}

// selected players are "contained" buttons, the rest are "outlined"
export async function expectPlayersSelected(page: Page, players: string[]) {
  for (const player of players) {
    await expect(page.getByRole('button', { name: player })).toContainClass('MuiButton-contained');
  }
}

export async function expectPlayersNotSelected(page: Page, players: string[]) {
  for (const player of players) {
    await expect(page.getByRole('button', { name: player })).toContainClass('MuiButton-outlined');
  }
}

export async function expectLinesSelected(page: Page) {
  const counts = page.locator('#root').getByText('(6/6)', { exact: true });
  await expect(counts).toHaveCount(2);
}

export async function expectGameState(page: Page, state: string) {
  await expect(page.locator('#root')).toContainText(`Game State: ${state}`);
}

export async function expectHelpMessage(page: Page, message: string) {
  await expect(page.locator('#root')).toContainText(message);
}

export async function expectNextLineText(page: Page) {
  await expectHelpMessage(
    page,
    'Players not on the previous line are pre-selected. Adjust and confirm.'
  );
}

export async function expectText(page: Page, text: string) {
  await expect(page.locator('#root')).toContainText(text);
}

export async function expectPlayersEnabled(page: Page, players: string[]) {
  for (const player of players) {
    await expect(page.getByRole('button', { name: player })).toBeEnabled();
  }
}

export async function expectPlayersDisabled(page: Page, players: string[]) {
  for (const player of players) {
    await expect(page.getByRole('button', { name: player })).toBeDisabled();
  }
}

export async function clickButton(page: Page, name: string) {
  await page.getByRole('button', { name }).click();
}

export async function expectButtonEnabled(page: Page, name: string) {
  await expect(page.getByRole('button', { name })).toBeEnabled();
}

export async function expectButtonDisabled(page: Page, name: string) {
  await expect(page.getByRole('button', { name })).toBeDisabled();
}

export async function expectPlayByPlay(page: Page, events: string[]) {
  await expect(page.getByRole('list')).toContainText(events.join(''));
}

export async function refutePlayByPlay(page: Page, events: string[]) {
  await expect(page.getByRole('list')).not.toContainText(events.join(''));
}

export async function openHamburgerMenu(page: Page) {
  await page.getByRole('button').filter({ hasText: /^$/ }).click();
}

export async function openMenuItem(page: Page, name: string) {
  await openHamburgerMenu(page);
  await page.getByRole('menuitem', { name }).click();
}

// add a player to a roster while editing rosters. `team` 0 is home, 1 is away.
// `pick` chooses a league player from the suggestions, otherwise it adds a sub by name.
export async function addPlayer(page: Page, team: 0 | 1, name: string, { pick = false } = {}) {
  const search = page.getByPlaceholder('Type to search or add new...').nth(team);
  await search.click();
  await search.fill(name);
  if (pick) await page.getByRole('option', { name }).click();
  await page.getByRole('button', { name: 'Add' }).nth(team).click();
}

export async function removePlayer(page: Page, name: string) {
  await page
    .getByRole('listitem')
    .filter({ hasText: `${name}Remove` })
    .getByRole('button')
    .click();
}

export async function submitGame(page: Page, { failed = false } = {}) {
  await openMenuItem(page, 'Submit Game');

  // wait for and interact with the confirmation dialog
  await expect(page.getByRole('heading', { name: 'Confirm Game Submission' })).toBeVisible();
  await expect(page.getByText('Are you sure you want to submit this game?')).toBeVisible();
  await clickButton(page, 'Submit');

  // back to the list of games
  await page.waitForURL('**/stat_keeper');
  await expect(page.locator('#root')).toContainText('Complete');
  await expect(page.locator('#root')).toContainText(failed ? 'sync-error' : 'uploaded');
}
