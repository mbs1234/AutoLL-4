# AutoLL-4

AutoLL-4 books Walt Disney World Lightning Lane Multi Passes while you are in
the park, from a phone or a desktop browser. You tell it which attractions you
want, in what order, and between which times; it watches Disney's tip board and
takes what appears — including in the two-second window when a scheduled drop
lands.

It runs the same booking engine as
[AutoLL-3](https://github.com/mbs1234/AutoLL-3) and is kept deliberately in step
with it. The two **talk to Disney differently**, and that is the whole reason
both exist: when a change on Disney's side stops one of them, the other may keep
working. Which one that will be cannot be predicted, so it is worth having both
installed and trying the other when one fails.

It is unofficial, experimental software. It is not affiliated with or endorsed
by Disney, it can stop working the day Disney changes an endpoint, and it comes
with no warranty. Keep Disney's own app as the source of truth for what you
actually hold.

## Install

Open the [setup page](https://mbs1234.github.io/AutoLL-4/) on the device you
will use and install **either** the bookmarklet **or** the userscript.

|  | Bookmarklet | Userscript |
|---|---|---|
| Needs | nothing | a userscript manager (Userscripts on iOS, Tampermonkey on Android) |
| Starts | when you tap it | by itself, on Disney's Lightning Lane page |

Either way it runs on a page whose address begins
`disneyworld.disney.go.com`.

Three things worth knowing before you do:

- **It installs alongside AutoLL-3 and v1.0 without touching them.** Separate
  browser storage, separate notifications, its own tab name, icon and address.
  Nothing the other builds hold is disturbed.
- **Nothing carries over.** Because the storage is separate, AutoLL-4 starts
  empty. Re-pick your party and rebuild your watch list before the trip, not at
  the gate.
- **Install one AutoLL userscript, not two.** Every build's autoloader matches
  the same Disney URL and they will fight over the page. Two *bookmarklets* are
  fine — each only runs when you tap it.

> **Run one build at a time.** They share Disney's origin and its rate limit, so
> two live engines contend for the same reservations and the same handful of
> requests per second. Keep the other as the fallback you switch to, not a
> second engine you run beside this one.

## What it does

**Plans a park day.** A watch list per park and date, each attraction with its
own return-time window and rank. **Plan Check** rehearses the whole plan against
what you already hold and makes no requests doing it, so a conflict turns up on
the sofa rather than at the gate.

**Books while you walk.** Autopilot polls the tip board on a cadence that speeds
up as a drop approaches, starts two minutes early, and keeps watching the quieter
hours when inventory trickles back. It moves reservations earlier, swaps a worse
hold for a better one, and knows when Disney's one-Tier-1-at-a-time limit lifts.

**Pocket mode.** A full-screen guard so a phone in a pocket cannot mis-tap the
control that stops it — lifted by three deliberate taps on a target that moves.
It shows what the engine is doing, and whether the alert sound and the screen
wake lock are actually working, so a glance answers "is it still running".

**Refuses to double-book.** Reservations are leased, so two of its own engines
can never act on the same one. An action whose outcome Disney never confirmed
raises a quarantine instead of being retried, and a wedged check gives up rather
than stalling the day in silence.

**Tells you the truth.** The activity log says in plain English what it did, what
it skipped and why. It names attractions Disney lists that this build does not
recognise rather than quietly ignoring them.

**Alerts you by sound.** On iOS Safari a chime is the only alert channel a web
page gets, so there is a **Test sound** button that proves the channel works
before you rely on it.

**Keeps a copy.** Safari deletes what a website has stored after about a week
without a visit, and everything AutoLL-4 knows is stored that way. **Backup and
Restore**, in the Settings menu, saves your plan, your party and every drop the
learner has seen to a file you keep, and puts it back on a phone that has lost
it. Your Disney sign-in is never in it.

It books Walt Disney World Multi Passes only — not Disneyland, not virtual
queues, not Individual Lightning Lanes — and it cannot get you more than
Disney's own rules allow.

## Using it

**[User guide](https://mbs1234.github.io/AutoLL-4/guide.html)** — setup, the park
day, every screen, and what to do when something breaks.
[docs/USER-GUIDE.md](docs/USER-GUIDE.md) is the same text in this repository.

Release notes for each version are on the
[releases page](https://github.com/mbs1234/AutoLL-4/releases). Building,
verifying a build and rolling one back are in
[docs/RELEASING.md](docs/RELEASING.md); [FORK.md](FORK.md) explains why a plain
upstream build does not run, and [docs/SYNC.md](docs/SYNC.md) covers keeping
this build and AutoLL-3 in step.

## Acknowledgements

AutoLL-4 exists because of [joelface/bg1](https://github.com/joelface/bg1) by
Joel Bruick, which made booking from a browser possible at all, and
[jgeurts/bg1](https://github.com/jgeurts/bg1), whose booking work this builds on
directly.

It descends from [AutoLL](https://github.com/mbs1234/AutoLL), frozen at v1.0, by
way of [AutoLL-2](https://github.com/mbs1234/AutoLL-2) and
[AutoLL-3](https://github.com/mbs1234/AutoLL-3), whose application line it
continues to track.

## License

GPL-3.0-only, as a modified version of BG1 by Joel Bruick, with the booking work
from jgeurts/bg1. Copyright for the modifications in this repository rests with
its contributors. Distributed in the hope it is useful, without any warranty —
see [LICENSE.txt](LICENSE.txt).
