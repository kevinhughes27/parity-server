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
e2e/       browser tests for the stat keeper
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
```

Local Durable Object data lives in `.wrangler/state`; delete it to start fresh. The local admin
password is `dev` (see `.dev.vars`).

Seeding copies from production's `/api/:league/export`. Until v3 is in production use the v2
database instead: `./dev seed --all --from v2.sqlite`.

### Tests

```sh
./dev check          # type-check, format check and unit tests
./dev e2e            # the stat keeper in a real browser
```

The unit tests cover the stats (`shared/`, checked against v2), the app (`src/`) and the Worker
API (`worker/`, run inside the Workers runtime with a real Durable Object).

The e2e tests (`e2e/`) drive the stat keeper through whole games against a production build of
the app, then check what was saved in the league's Durable Object. Each test starts with a fresh
league from `e2e/fixtures.ts`. The test server uses in memory storage so it never touches your
local data. `./dev e2e -g undo` runs matching tests, `./dev e2e --ui-port=8080` lets you watch
them at http://localhost:8080.

Both run on every push in GitHub Actions.


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

### Hosting

Parity runs in its own Cloudflare account, on its own domain (`<domain>` below). OCUA keeps
`parity.ocua.ca` pointing at it with a single CNAME record, using
[Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/)
custom hostnames (free for up to 100 hostnames, which is also how other leagues could get their
own domain one day). OCUA doesn't have to give out any access to their account.

### Secrets

```sh
./dev wrangler secret put ADMIN_PASSWORD     # for editing/deleting games in the web UI
./dev wrangler secret put ZULURU_USER        # an OCUA account that can see rosters
./dev wrangler secret put ZULURU_PASSWORD
```

Secret values can be replaced but never read back. Add `--env staging` for staging.

`./dev` uses a Cloudflare API token if `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set.
Create one from the *Edit Cloudflare Workers* template: remove the KV and R2 permissions and limit
the zone to `<domain>`. `./dev wrangler login` also works.

### New season

1. Find the Zuluru page that lists the Parity teams. OCUA sets up some seasons as their own Zuluru
   league and others as a division of a bigger league, so it is either
   `.../zuluru/leagues/view?league=1234` or `.../zuluru/divisions/view?division=5678`.
2. Add the league to the top of `shared/leagues.json` with that url as `zuluru`, then deploy.
3. The next daily sync fills in the teams and schedule, or sync right away:
   `curl -u admin:$PASSWORD -X POST https://parity.ocua.ca/api/<league>/zuluru_sync`.

### Backups

Durable Objects can be restored to any point in the last 30 days. For anything longer save the
exports, e.g. `curl https://parity.ocua.ca/api/24/export > 24.json`.


Moving from v2
--------------

The plan for moving production from parity-server (EC2) to this. Delete this section (and
`scripts/compare.ts` and the v2 reader in `scripts/seed.ts`) once it is done.

**Set up** (any time, v2 keeps running):

1. Buy a domain for Parity (the Cloudflare registrar is at cost) in your Cloudflare account.
2. Set the secrets (above), deploy, and set up hosting on the domain:
   - DNS: proxied `AAAA` records for `@` and `origin`, both pointing to `100::` (the Worker
     answers, the address is never used)
   - Uncomment `routes` in `wrangler.jsonc` with your domain and deploy again
   - SSL/TLS > Custom Hostnames: enable Cloudflare for SaaS, set the fallback origin to
     `origin.<domain>` and add the custom hostname `parity.ocua.ca`
3. Load the data. Copy the v2 database (`scp parity-server:~/parity-server/server/db.sqlite v2.sqlite`)
   then `./dev seed --all --from v2.sqlite --to https://<domain>`.
4. Check it matches v2: `./dev yarn node scripts/compare.ts --a https://parity.ocua.ca --b https://<domain>`.
   Expect differences only for the two v2 salary bugs listed in the script. Try the stat keeper on
   `https://<domain>` too.

**Cut over** (a weekday, not game day, since no games can be recorded in between):

1. Copy the v2 database and seed again (steps 3 and 4) so v3 has the latest games.
2. OCUA replaces the `parity.ocua.ca` A record (`3.98.197.218`) with
   `CNAME parity.ocua.ca -> origin.<domain>`.
3. Cloudflare validates the hostname and issues its certificate once the CNAME exists. OCUA's zone
   is on Cloudflare so this can't be done ahead of time and takes a few minutes. Watch the custom
   hostname status go to *Active*, then check `https://parity.ocua.ca/api/leagues`.

Stat keepers don't need to do anything. The site stays on the same address so games saved in
their browsers stay put, and uploads from pages opened before the switch still work
(`/submit_game` is kept for this).

**Rolling back**: put the A record back. v2 is untouched, but any games uploaded to v3 in between
would need to be re-uploaded from the stat keepers' browsers.

**Afterwards**: once it has run for a few weeks, stop the EC2 instance, release its Elastic IP and
archive parity-server.

### Moving to OCUA's account

Workers can't be transferred between Cloudflare accounts but moving is just a redeploy: deploy this
repo to OCUA's account, copy the data across with
`./dev seed --all --from https://parity.ocua.ca --to https://parity.<ocua-subdomain>.workers.dev`,
then serve `parity.ocua.ca` from the new Worker with a custom domain
(`{ "pattern": "parity.ocua.ca", "custom_domain": true }` in `routes`) instead of the CNAME.


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


Ideas
-----

- **Live games.** Games are only uploaded when they are finished, but the API already accepts
  `"status": "live"` uploads and keeps live games out of the stats. Saving after every point would
  make live scores and stats cheap to add (a Durable Object can also push updates over WebSockets).
- **Other leagues.** Each league is its own Durable Object named `ocua/<id>`, so another
  organization could be another prefix and custom hostname. Live stats would be most useful to
  competitive teams, who usually only take stats for their own side.


History
-------

This is Parity 3.0. Versions 1 and 2 (2014-2026) were a Python server with an Android stat keeping
app in [kevinhughes27/parity-server](https://github.com/kevinhughes27/parity-server), now archived.
3.0 was built on a branch there and this repo starts from its last commit, `20ee02d`. The stats
and API responses were checked against v2 for every game it ever recorded (`scripts/compare.ts`).

To browse the old history from this repo (`git log` and `git blame` then follow files back
through v2, e.g. `git log --follow src/views/StatKeeper/bookkeeper.ts`):

```sh
git fetch https://github.com/kevinhughes27/parity-server.git master
git replace --graft $(git rev-list --max-parents=0 HEAD) 20ee02d
```

`git replace -d $(git rev-list --max-parents=0 HEAD)` undoes it.


Contributing
------------

PRs welcome! If you play in the league and want to help out, get in touch on slack or by email.
