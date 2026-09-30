Parity
======

Stats and salaries for the [OCUA Parity League](https://www.ocua.ca/Parity-League), a league where
we record stats for every game, turn them into (fake) player salaries, and teams have to stay under
a salary cap to keep things balanced.

Production: https://parity.ocua.ca


How it works
------------

There is no server to run. It is one [Cloudflare Worker](https://developers.cloudflare.com/workers/):

- **The React app** (`src/`) is served as static assets. It includes the stat keeper, which records
  games offline in the browser (IndexedDB) and uploads them when done.
- **The API** (`worker/index.ts`) routes `/api/:league/...` to that league's
  [Durable Object](https://developers.cloudflare.com/durable-objects/).
- **One Durable Object per league** (`worker/league.ts`) holds a small SQLite database with the
  league's teams, schedule and games (each game is its raw list of points and events).
- **Stats and salaries** (`shared/stats.ts`) are computed on demand from the raw events. The largest
  season ever takes ~40ms to compute from scratch, so nothing is precomputed or stored.
- **The Zuluru sync** (`worker/zuluru.ts`) runs daily on a cron trigger and replaces the current
  league's rosters and schedule with what is on Zuluru.

The league registry is `shared/leagues.json`. The first entry is the current league.

```
src/       React app (stats site + stat keeper)
shared/    stats + salary logic and types, used by the app and the Worker
worker/    the Worker, the league Durable Object and the Zuluru scraper
scripts/   seed (copy leagues between servers) and compare (diff two servers' APIs)
```


Development
-----------

Everything runs in a container via `./dev` (needs [podman](https://podman.io)), so node, yarn and
wrangler never run directly on your machine.

```sh
./dev setup          # install dependencies, create .dev.vars (local secrets)
./dev up             # the whole app at http://localhost:5173, Worker + Durable Objects included
./dev seed           # in another terminal: copy the current league from production
./dev seed --all     # or every league
./dev check          # lint, type-check, format check, tests (what CI runs)
```

Local Durable Object data lives in `.wrangler/state`; delete it to start fresh. The local admin
password is `dev` (see `.dev.vars`).

Seeding copies from production's `/api/:league/export`. To copy from the v2 database instead (for
the migration) use `./dev seed --all --from v2.sqlite`.


Deploying
---------

```sh
./dev deploy                     # build and deploy production
./dev deploy --env staging       # a separate Worker with separate data, for trying things out
./dev wrangler tail              # production logs
```

Deploys can also happen on every push to `main` by connecting the repo in the Cloudflare dashboard
(Workers & Pages > parity > Settings > Builds, build command `yarn build`, deploy command
`yarn wrangler deploy`).

### First time setup

1. Create an API token from the *Edit Cloudflare Workers* template and trim it to what Parity uses:
   - Account (only the OCUA account): *Workers Scripts: Edit*, *Workers Tail: Read*,
     *Account Settings: Read*. Remove the KV and R2 permissions.
   - Zone (only `ocua.ca`): *Workers Routes: Edit*, only needed for the custom domain.
   - User: *User Details: Read*, *Memberships: Read* (wrangler uses these to check the token).

   Then `export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...` before running `./dev`.
   (`./dev wrangler login` also works but grants everything your user can do.)
2. Set the secrets:
   ```sh
   ./dev wrangler secret put ADMIN_PASSWORD     # for editing/deleting games in the web UI
   ./dev wrangler secret put ZULURU_USER        # an OCUA account that can see rosters
   ./dev wrangler secret put ZULURU_PASSWORD
   ```
   Secret values can be replaced but never read back. Add `--env staging` for staging.
3. `./dev deploy`, then load the data: `./dev seed --all --from v2.sqlite --to https://parity.<subdomain>.workers.dev`
4. Uncomment the `routes` entry in `wrangler.jsonc` to serve it at `parity.ocua.ca` and deploy again.

### New season

Add the league to the top of `shared/leagues.json` (its `zuluruId` is in the Zuluru URL) and deploy.
The next Zuluru sync fills in the teams and schedule, or trigger it right away from the admin
endpoint: `curl -u admin:$PASSWORD -X POST https://parity.ocua.ca/api/<league>/zuluru_sync`.

### Backups

Durable Objects can be restored to any point in the last 30 days. For anything longer save the
exports, e.g. `curl https://parity.ocua.ca/api/24/export > 24.json`.


API
---

All data is public and CORS enabled. `:league` is the league id from `/api/leagues`.

| | |
|---|---|
| `GET /api/leagues` | all leagues |
| `GET /api/:league/export` | everything for a league: teams, schedule, games with every event |
| `GET /api/:league/stats` | season stats per player |
| `GET /api/:league/weeks` and `/weeks/:week` | weeks played and stats for one week |
| `GET /api/:league/players` | salaries |
| `GET /api/:league/teams` and `/schedule` | rosters and upcoming games |
| `GET /api/:league/games` and `/games/:id` | games (`?includePoints=true` for events) and one game with its stats |
| `PUT /api/:league/games/:id` | save a game from the stat keeper (safe to retry) |

Admin (basic auth, user `admin`): `POST /api/:league/games/:id` edit, `DELETE /api/:league/games/:id`,
`POST /api/:league/import`, `POST /api/:league/zuluru_sync`.


History
-------

This is Parity 3.0. Versions 1 and 2 (2014-2026) were a Python server with an Android stat keeping
app: [kevinhughes27/parity-server](https://github.com/kevinhughes27/parity-server). 3.0 started from
its last commit, `20ee02d`. The stats calculations and API responses were checked against v2 for
every game it ever recorded (`scripts/compare.ts`).


Contributing
------------

PRs welcome! If you play in the league and want to help out, get in touch on slack or by email.
