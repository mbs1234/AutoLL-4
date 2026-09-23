# Keeping AutoLL-3 and AutoLL-4 in step

Written 2026-09-17. Rewritten 2026-09-18, when the repositories turned out to
be more closely related than this document first assumed.

Two builds are live, deliberately, so that if one stops booking the other may
not. That only works if they stay close enough that a fix made in one reaches
the other — and far enough apart that the thing being tested stays tested.

## What the two are

|  | AutoLL-3 | AutoLL-4 |
|---|---|---|
| Sensor payload | a vendored `sensor-data.js`, served from its own origin | fetched live from `bg1.joelface.com/sensor/data`, five-use rotation |
| `x-app-id` | `ANDROID` | `<resort>-IOS-<version>` |
| Runs from | a phone browser | a phone **or desktop** browser |
| Storage | `autoll3.*`, tags `autoll3-` | `autoll4.*`, tags `autoll4-` |
| Origin | `mbs1234.github.io/AutoLL-3` | `mbs1234.github.io/AutoLL-4` |
| Role | the build that has booked in a park | the fallback, and the experiment |

The storage namespaces and the origins are separate on purpose: both can be
installed on one phone without sharing a watch list, a plan, a lease or a
doubt. **Run only one at a time anyway.** They share Disney's origin and the
same rate limiter is per-page, so two live engines contend for the same
reservations and the same five requests a second. Put that in the park-day
routine rather than trusting yourself to remember it at 7am.

## The rule

**Once a change is verified on AutoLL-3 and the owner is happy with it, it ports
to AutoLL-4 — always.** Stated by the owner on 2026-09-23. The two builds stay in
step in everything except what genuinely differs between them: the sensor path,
each build's own name and storage namespace, and the few settings recorded below.

That rule has one consequence the rest of this document now depends on: **port
by `git merge`, never by hand.** On 2026-09-21 two AutoLL-3 documentation
changes (#69, #70) reached this build as hand-made copies (#19, #20). They were
correct, and git could not see them: it still listed both as unmerged, the
weekly drift check below would have gone red for work that was already here, and
the next sync would have tried to apply both again on top of their copies. A
hand-made port is a second copy of the work that git cannot recognise as the
first. Adapt a change *inside* the merge that brings it, as the merge of
2026-09-23 does, and git's record stays true.

## Syncing is a merge, not a cherry-pick

This document originally prescribed `git cherry-pick`, one commit at a time.
That was wrong, and it made the job sound harder than it is. AutoLL-4 is a true
git descendant of AutoLL-3 — both share root commit `017868a`, and the merge
base is `f889fbf`. Git will merge them directly, any number of commits at once.

Once per clone:

```bash
git remote add autoll3 https://github.com/mbs1234/AutoLL-3.git
```

Then, per sync:

```bash
git fetch autoll3
git log --oneline HEAD..autoll3/main     # what AutoLL-3 has that this does not
git merge autoll3/main
```

Sync *from* AutoLL-3 *to* AutoLL-4 by default. The reverse direction is a
decision, not a routine: porting the sensor provider back into AutoLL-3 would
end the experiment by making both builds depend on the same endpoint, which is
the one thing having two builds is meant to avoid.

## Why the merge is usually clean

Until 2026-09-18 the two trees differed by a brand string written out 49 times
across 25 files. Every one of those was a line a merge could stop on for a
reason nobody cared about, and measured against 25 real AutoLL-3 commits, 8 of
them conflicted — every single hunk being "take AutoLL-3's side, change 3 to 4".

Those 49 literals now derive from `src/appIdentity.ts`.

> **Landing note, 2026-09-18.** That refactor reached AutoLL-4 before this sync,
> through mbs1234/AutoLL-4#13. The 1.2.8 sync therefore preserved the identity
> seam without a conflict; future syncs should do the same.

What is left that genuinely differs once it has landed:

| what | why |
|---|---|
| `src/appIdentity.ts` | the four values: `APP_NAME`, `APP_SLUG`, `APP_SHORT`, `APP_ICON` |
| `package.json` | `name`, `description`, `repository` — cannot import a constant |
| `harness/index.html` | a static `<title>`; dev-only, cannot import a constant |
| the sensor files | deliberately and permanently — see below |
| `src/hooks/useDataLoader.tsx` | names `SensorDataUnavailable`, distinguishing the helper service being down from Disney refusing |
| `.github/workflows/deploy.yml` | the sensor overlay, and `PAGES_ORIGIN`, which is a second spelling of `PAGES_BASE` for files that never pass through the bundler |
| the docs, **in part** | Kept in step like the code, except where this build genuinely differs: `README.md` and `docs/RELEASING.md` are this build's own; the user guide, the roadmap and `FUTURE.md` take AutoLL-3's content with this build's name, and are *ported* where this build behaves differently — it also runs in desktop browsers — rather than renamed. `FORK.md`, this file and `SECURITY.md` are this build's own |

Everything else should be identical. When it is not, one of them is wrong, and
the question is which side is right rather than which side is newer.

`src/appIdentity.test.ts` is deliberately **not** on that list. It checks the
identity against `package.json`'s repository name instead of asserting a
literal, so the same file passes in both builds — and fails in either if a
merge takes the wrong side of the identity file.

## Git will not keep the sensor mechanisms apart

This is the part to read before merging, because it is the part that is not
true by construction and cannot be made so.

Today, AutoLL-3's sensor changes conflict here. That is luck, not a rule: they
conflict because AutoLL-4 happens to have rewritten the same regions of the
same files. Three things defeat it, all demonstrated against these repositories
rather than reasoned about:

1. **Git cannot conflict on a file only one side added.** Every new file
   AutoLL-3 adds enters AutoLL-4 unconditionally, forever. A future sensor
   change that lives in a new module arrives silently.
2. **The header construction is byte-identical in both repos.** The
   `x-acf-sensor-data` block in `src/api/client.ts` is the same bytes on both
   sides, so it sits squarely in git's take-it-silently zone.
3. **No test in either repo loads `src/api/sensor-data.ts`.** Both
   `jest.config.js` files map `.*/sensor-data$` to a mock. That file is the one
   that decides whether the payload is generated locally or fetched; here it is
   one line, in AutoLL-3 it is a 28-line dynamic-import loader. Swapping them
   leaves the suite fully green, the typecheck clean, the lint clean — and this
   build asking a 404 for its payload, which you would find in a park rather
   than in CI.

So: **read the diff of `src/api/` and `.github/workflows/deploy.yml` by eye on
every merge.** A green pipeline is not evidence about the sensor path.

```bash
git diff autoll3/main -- src/api/ .github/workflows/deploy.yml
```

### What must never be synced

- `src/api/sensor-data-provider.ts` → AutoLL-3, unless you have decided to
  abandon the static payload deliberately.
- Anything that puts local payload generation back on this build's request
  path, whatever file it arrives in.
- The storage namespace or the notification tag prefix, in either direction.
  Two builds sharing `autoll3.*` on one phone would share a watch list, a
  booking log, and — worse — leases and quarantines about the same reservations.
- `src/appIdentity.ts`. Taking the other side of this one file renames the
  build, repoints every stored key, and hands a live Disney session to the
  other build's responder page.

## When to merge

**Not on the same day AutoLL-3 deployed, and not on a park day.** Two builds
changed together are one build: if a bad commit reaches both at once, the
fallback was worth nothing, which is the exact scenario two repositories exist
to insure against. Deliberate lag is a feature here, not sloppiness.

**A change with no code in it may port the same day.** The rule exists so a bad
commit cannot reach both builds at once, and a commit that changes nothing under
`src/` cannot make the fallback worse. The December replan (#71) ported the day
it deployed on that basis. Check the "no code" claim rather than assume it —
`git diff --name-only HEAD..autoll3/main -- src/` should print nothing — and
remember that touching the guide's HTML still rebuilds and republishes this
build's bundle, with the same code and a new embedded revision.

**Resolve a documentation conflict by reading it, not by taking a side.** And
read the files git merged *without* a conflict too: on 2026-09-23 `FUTURE.md`
merged cleanly and had silently picked up an "AutoLL-3" where this build means
itself. The sensor section below says the same about `src/api/`; it is equally
true of prose.

The one thing that does go wrong is forgetting there was anything to merge
until the morning a park day needs the fallback. That is what
`.github/workflows/upstream-drift.yml` is for: it runs weekly, counts what is
waiting, and fails only when something has sat unmerged past a seven-day soak.
It never merges anything and it cannot tell you a waiting commit is safe —
see the section above for why nothing can.

Run it on demand from the Actions tab, or locally:

```bash
git fetch autoll3 && git rev-list --count HEAD..autoll3/main
```

## Checking they are in step

The check is deliberately in two parts. First, read every sensor-path
difference by eye; this is the check a green suite cannot replace:

```bash
git fetch autoll3
git diff autoll3/main -- src/api/ .github/workflows/deploy.yml
```

Then compare the shared application areas, including hooks because the sensor
provider has one deliberate user-facing error there:

```bash
git diff autoll3/main -- src/autopilot/ src/providers/ src/components/ src/hooks/
```

After the 1.2.8 sync the second command prints three files, and all are
expected:

- `src/autopilot/schedule.ts`
- `src/autopilot/usePoller.test.ts`
- `src/hooks/useDataLoader.tsx`

The first two carry comments explaining why the tick deadline sits above the
client timeout, and the explanation genuinely differs between the builds:
AutoLL-3's sensor payload arrives through an untimed dynamic import, this one's
through a fetch bounded by `SENSOR_TIMEOUT_MS`. `useDataLoader.tsx` keeps the
third failure class visible: the helper service is unavailable, rather than
Disney refusing or a generic request failing.

Anything else it prints is either drift worth resolving or a deliberate
divergence worth adding to the table above.

It is worth running even when it prints only those two. This check is what
caught both of them still claiming the sensor fetch was unbounded months after
it stopped being — a divergence that was legitimate and stale at the same
time, which is not a combination a conflict marker would ever have shown you.
