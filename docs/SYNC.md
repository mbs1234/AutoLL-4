# Keeping AutoLL-3 and AutoLL-4 in step

Written 2026-09-17.

Two builds are live, deliberately, so that if one stops booking the other may
not. That only works if they stay close enough that a fix made in one reaches
the other — and far enough apart that the thing being tested stays tested.

## What the two are

|  | AutoLL-3 | AutoLL-4 |
|---|---|---|
| Sensor payload | a vendored `sensor-data.js`, served from its own origin | fetched live from `bg1.joelface.com/sensor/data`, five-use rotation |
| Depends on AutoLL-2 for | the 7 installer files, **and** the payload file | the 7 installer files only |
| Storage | `autoll3.*`, notification tags `autoll3-` | `autoll4.*`, tags `autoll4-` |
| Origin | `mbs1234.github.io/AutoLL-3` | `mbs1234.github.io/AutoLL-4` |
| Role | the build that has booked in a park | the fallback, and the experiment |

The storage namespaces and the origins are separate on purpose: both can be
installed on one phone without sharing a watch list, a plan, a lease or a
doubt. **Run only one at a time anyway.** They share Disney's origin and the
same rate limiter is per-page, so two live engines contend for the same
reservations and the same five requests a second. Put that in the park-day
routine rather than trusting yourself to remember it at 7am.

## The shape of the divergence

AutoLL-4 branched from AutoLL-3 at `f889fbf` and differs in exactly two ways
that are meant to persist:

1. **The sensor path.** `src/api/sensor-data-provider.ts` and the one-line
   `src/api/sensor-data.ts` that re-exports it; the `x-app-id` header in
   `src/api/client.ts`; the absence of the `gh-pages` checkout, the
   `sensor-data.js` overlay and its hash guard in `.github/workflows/deploy.yml`.
2. **The brand.** Every `AutoLL-3` → `AutoLL-4`, the storage namespace, the
   notification tag prefix, `PAGES_ORIGIN`, `base` in `vite.config.mts`, and the
   OneID `responderPage` in `src/components/LoginForm.tsx`.

Everything else should be identical. When it is not, one of them is wrong.

## Syncing, in practice

AutoLL-4 is not a GitHub fork, but it shares history, so git handles this
directly. Once per clone:

```bash
git remote add autoll3 https://github.com/mbs1234/AutoLL-3.git
```

Then, per sync:

```bash
git fetch autoll3
git log --oneline HEAD..autoll3/main        # what AutoLL-3 has that this does not
git cherry-pick -n <sha>                    # -n so conflicts can be resolved first
```

**Expect conflicts in exactly two places**, and resolve both toward AutoLL-4:

- Test counts in `README.md` and `FORK.md`. The two trees differ by the sensor
  tests, so the numbers legitimately differ. Take AutoLL-4's and re-run
  `npm run checkall` to confirm them.
- Anything naming `sensor-data.js`, the `gh-pages` checkout or the payload hash
  guard. Those apparatus do not exist here; a fix to them is not applicable and
  should be dropped rather than adapted.

Sync *from* AutoLL-3 *to* AutoLL-4 by default. The reverse direction is a
decision, not a routine: porting the sensor provider back into AutoLL-3 would
end the experiment by making both builds depend on the same endpoint, which is
the one thing having two builds is meant to avoid.

## What must never be synced

- `src/api/sensor-data-provider.ts` → AutoLL-3, unless you have decided to
  abandon the static payload deliberately.
- The storage namespace or the notification tag prefix, in either direction.
  Two builds sharing `autoll3.*` on one phone would share a watch list, a
  booking log, and — worse — leases and quarantines about the same reservations.
- The `responderPage` URL. It is per-origin and getting it wrong breaks login
  entirely.

## Checking they are in step

```bash
git fetch autoll3
git diff autoll3/main -- src/autopilot/ src/providers/ src/components/
```

The engine, the providers and the screens should differ **only** by the brand
string. Anything else is drift, and the question to ask is which side is right
rather than which side is newer.
