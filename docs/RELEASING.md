# Building, verifying and releasing AutoLL-4

Moved out of `README.md` on 2026-09-21, when that file was cut back to an
introduction. Nothing here changed in the move, and the two policy differences
from AutoLL-3 below are deliberate rather than oversights.

## Development

```bash
npm ci
npm run checkall     # tests, lint, typecheck
npm run harness      # the real screens against fake clients
npm run build
```

[FORK.md](../FORK.md) explains why a plain upstream build does not run and how
the deploy assembles one. [docs/SYNC.md](SYNC.md) governs keeping this build and
AutoLL-3 in step, and is the document to read before any sync.
[docs/PLAN.md](PLAN.md) is the booking-intelligence roadmap and the record of
what was decided; [docs/UX-PLAN.md](UX-PLAN.md) is the same for the screens;
[docs/FUTURE.md](FUTURE.md) is what remains, and [ROADMAP.md](../ROADMAP.md) is
what to do about it next. [docs/USER-GUIDE.md](USER-GUIDE.md) is the guide
written for whoever is holding the phone, rather than for whoever is changing
the code. [SECURITY.md](../SECURITY.md) covers token handling.

## Verifying a build

Every deploy writes
[`autoll4-release.json`](https://mbs1234.github.io/AutoLL-4/autoll4-release.json)
and `autoll4-files.sha256` into the published site: the source revisions the
site is assembled from, plus a SHA-256 of every file served. Point a browser at
it before a park day and confirm the build on your device is the one the
repository says it is — or read the revision from the Settings menu.

The strongest check is that a local build of the same commit reproduces the
served bundle byte for byte:

```bash
npm run build
shasum -a 256 dist/bg1.js
curl -s https://mbs1234.github.io/AutoLL-4/bg1.js | shasum -a 256
```

Build the commit the manifest names, not a branch — the build embeds its own
revision, so a build of a different commit will differ for that reason alone.

## Releasing, and rolling back

A tagged release is that pair of manifest files together with the tag, and both
are attached to the [release](https://github.com/mbs1234/AutoLL-4/releases) as
well as served from the site. Re-running the deploy workflow against a tag
rebuilds the same site, which is what makes a rollback a one-command operation
rather than a rebuild from memory:

```bash
gh workflow run deploy.yml --ref autoll4-v1.3.0
```

The release is not complete until `gh release view` lists both manifest files; a
pushed tag on its own does not satisfy the promise above.

A tag deploy restores the *served* site. It does not revert `main` — if the
build being rolled back is wrong rather than merely unlucky, revert the commit
too, or the next push to `main` re-ships it.

### The branch policy that has now caught both repositories

The `github-pages` environment has a deployment branch policy. Where it permits
`main` only, a workflow dispatched against a tag builds correctly and is then
refused at the deploy step — **with no steps recorded and nothing naming the
cause.** AutoLL-3 hit this first; it happened again here on the first
`autoll4-v1.2.8` tag dispatch (run 35549070005: every build step green, the
`deploy` job failed with an empty step list) and was fixed by adding a
`tag: autoll4-v*` policy beside the branch one.

If the deploy job fails with zero steps, this is why. Anything forking either
repository has to add the policy again.

## Two policy differences from AutoLL-3, both on purpose

**`main` is protected, but not for administrators.** A pull request, a passing
`check` run, no force-pushes and no deletions — with `enforce_admins` off. This
is the build you reach for when the other has stopped working, possibly from a
park, and a rule that makes the fallback slower to repair than the thing it is
standing in for gets the priority backwards. Everything still goes through a
pull request by default; the owner can go around it when the situation warrants,
and should otherwise not.

**Linear history is not required.** Fixes arrive from AutoLL-3 by `git merge`,
and the merge commit is what records that they arrived. Squash it and
`git log HEAD..autoll3/main` reports the same commits as unmerged forever,
re-conflicting the whole tree on every sync afterwards. Requiring linear history
would force exactly that squash. See [docs/SYNC.md](SYNC.md).

## What the deploy inherits

Installer assets come from an immutable AutoLL-2 revision pinned in the deploy
workflow, so AutoLL-2 must stay public for this build to publish a complete
site. Moving that pin is an explicit reviewed release change rather than an
implicit branch update. Unlike AutoLL-3 there is no separate runtime-module
overlay step; everything else is bundled from this repository.

## What the pipeline guarantees

The deploy gates independently on typecheck and the full test suite, and if
either fails the publish is skipped and Pages keeps serving the build already on
your device.

A green pipeline is not evidence about the sensor path. No test in this
repository loads `src/api/sensor-data.ts` — `jest.config.js` maps it to a mock —
so that file can be wrong in every way and the suite stays green. Read it by eye
whenever it changes, and read `docs/SYNC.md` before every sync from AutoLL-3.
