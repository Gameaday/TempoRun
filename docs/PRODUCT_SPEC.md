# TempoRun — Product Specification

**One-liner:** A run tracker for Android + Wear OS that plays music matched to your live running cadence — analyzed entirely on-device, with no server and no recurring operational cost.

**Status:** Draft v1.0 · Owner: Carl Nelson · Date: Oct 2026

---

## 1. Vision

Runners already know music at the right tempo makes them faster and steadier. Today they either hand-build BPM playlists or use interval timers. TempoRun makes the playlist irrelevant: the runner just runs, and the music follows — locked to their step rate within ±2 BPM.

**Non-negotiables**

1. Works with music the user already owns or streams (no licensing burden on us).
2. All tempo analysis happens on-device. No cloud, no API bills.
3. Phone-free running via Wear OS is a first-class mode, not an accessory.
4. The user's run data belongs to the user: local-first storage, exportable, deletable.

---

## 2. Problem & opportunity

- Runner cadence is naturally stable (155–185 steps/min), making it an unusually reliable music-matching signal.
- Streaming services expose tempo metadata poorly (Spotify requires an approval-gated API; YouTube Music exposes none at all).
- Prior attempts failed on distribution or licensing: Weav Run (adaptive playback, defunct), RockMyRun (curated streams), Spotify Running (discontinued). None combined local analysis + streaming + wear.
- The wearables running market continues to grow, and no major player ships cadence-synced playback.

---

## 3. Target users

| Persona | Profile | Primary need |
|---|---|---|
| **Pace-driven runner** | Runs 3×/week, tracks everything, already uses a sports watch | Music that matches tempo effort without playlist fiddling |
| **Rhythm responder** | Beginner-to-intermediate, notices they speed up with fast songs | Guilt-free pace control; steady legs, fewer injuries |
| **Race pacer** | Training for an event with target paces | Pre-programmed pace/BPM zones per workout block |
| **Walker** | Fitness walking — beginners, recovery days, older users | Same passports at walking cadence (110–130 spm); "run or walk" positioning |

**Anti-persona:** audiobook/social runners — out of scope for v1.

---

## 4. Core product loop

1. User starts a run (phone or watch).
2. Cadence detected from accelerometer (watch) or step sensor (phone) within the first ~10 seconds.
3. Engine computes target BPM (full-time or half-time feel).
4. Next track selected from the pre-analyzed library queue, queued at the next track boundary (no mid-song cut in v1).
5. Every cadence drift > 4 BPM sustained for ~15 s triggers a re-queue.
6. While locked (±2 BPM), the **combo meter** builds: every second in lock earns sync points × combo multiplier (×1 → ×4). Breaking lock resets the combo — standard rhythm-game rules.
7. Run ends → score banked, per-song personal bests updated, active Passport progress checked (milestone crossings unlock tracks for Free Run) → log saved with sync score, zones, track history.

The loop is deliberately **reactive, not prescriptive**: music follows the runner, never the reverse. (A v2 "pacer mode" reverses the arrow — nudging pace via tempo — flagged clearly as optional.)

---

## 5. Feature set

### MVP (v1.0 — ship this)

| # | Feature | Notes |
|---|---|---|
| F1 | GPS run tracking | Pace, distance, time, splits; phone & watch |
| F2 | Cadence detection | Accelerometer peak detection; auto-calibrated per-user over first runs |
| F3 | On-device BPM analysis | Local audio files analyzed once overnight (charging + Wi-Fi), cached in DB |
| F4 | Cadence-synced playback | Full-time & half-time matching; transitions on track boundaries |
| F5 | Match queue | Per-zone queues built from analyzed library; anti-repeat window |
| F6 | Run log & history | Local Room DB; sync score per run |
| F7 | Wear OS standalone | Run + playback from watch, phone-free (cached playlist + offline GPS) |
| F8 | Health Connect | Writes runs to Health Connect; reads weight/HR where available |
| F9 | Export | Run as .gpx / .tcx; history as CSV |
| F10 | Playlist Passports | Bundled themed journeys; milestone completion unlocks tracks for Free Run playlists |
| F11 | Walk mode | Cadence bands and zone thresholds adapted for walking (110–130 spm); passports and points work identically for runners and walkers |

### v1.x

- Spotify playback via Spotify Android SDK, with tempo from Spotify audio-features API (free tier; approval required — apply at MVP start, not launch).
- Workout blocks: target pace/BPM per segment (warm-up / tempo / cool-down).
- Android Auto / lock-screen controls; live wallpaper pace card.

### v2+

- Pacer mode (music drives tempo — opt-in).
- Voice coaching overlays ("cadence dropping, +2 steps").
- Race mode: pre-planned BPM curve synced to a route.
- Community: share run+BPM histories as links (still serverless — export files, not a social backend).
- PB duels: export a song + cadence target as a file and challenge a friend — asynchronous, still serverless.

**Explicitly out of scope:** music hosting, licensing, ads, cloud accounts.

### Gamification layer (v1.1 — the retention engine)

| # | Feature | Notes |
|---|---|---|
| G1 | Combo meter | Seconds continuously locked × multiplier (×1→×4); breaks on lock loss; shown live on phone and watch |
| G2 | Run score | Sync points per run + lifetime total; run history becomes a leaderboard against yourself |
| G3 | Per-song personal bests | Best lock streak per track; the mid-run "NEW PB!" moment is the dopamine hit that brings runners back |
| G4 | Playlist Passports | Finch-style content loop: curated themed playlist journeys; running with a passport active progresses its milestones, and completing a milestone permanently unlocks that track for Free Run playlists — all computed on-device |
| G5 | Smart playlists | Auto-generated by tempo zone, genre, era/decade, energy, liked-only — built from the same on-device analysis metadata |
| G6 | TempoPoints & Store | Points earned by moving (combo time, PB beats, milestones, streaks); spent on one-off songs added to the collection, cosmetics, and conveniences — never on progression itself |

**Design rules**

- Combos reward *consistency*, not speed — an easy-pace runner can max a combo just like a racer. Casual users stay in the loop.
- Passports and unlocks are per-user and local: no global economy, no server, no cheating surface that matters.
- Progress is never paywalled — the Pro gate stays on integrations and modes, never on scores or unlocks.

**Content model: Playlist Passports**

The unlock economy is a content loop modeled on Finch's adventures:

- **Passport** = a themed, curated playlist journey (e.g., "First Mile" — 8 tracks, 40 km; "Rock Road Trip"; "EDM Sprint Lab"). Ships as bundled JSON in the app, refreshed with app updates — zero server.
- **Milestones** = km gates inside the passport. Run with the passport active and its tracks auto-selected by the matching engine; crossing a gate completes that track's milestone.
- **Unlock** = the completed track enters the Free Run library permanently, usable in custom playlists by tempo, genre, era, energy.
- **First-run guarantee** — the starter passport is sized to complete in 2–3 runs, so the first unlock lands in session 1–2.
- **Completion rewards** — finishing a passport unlocks the next one plus cosmetics (watch face themes, badges). Never a paywall.
- **Free Run is the destination** — guided content feeds the sandbox; the sandbox (custom playlists by tempo/genre/era) is what retains users long-term.
- **Roadmap:** MVP ships 3–4 passports (~25 tracks curated from the user's own analyzed library tags); new passports arrive with app updates; v2 adds shareable community passports via exported files (still serverless).

**Points store**

- **TempoPoints accrue from play:** combo time, PB beats, passport milestones, streaks — earned by running *or walking*.
- **Spend on:** one-off songs (instantly added to your collection, no km gate), watch-face themes, passport covers, milestone effects, extra playlist slots.
- **Nothing in the store gates progression** — no energy timers, no pay-for-progress, no dark patterns. Content is earned by moving; the store sells cosmetics and shortcuts only.

---

## 6. The matching engine

```
cadence (spm) ──► smoothing (5 s rolling) ──► target BPM = cadence or cadence/2
                                                        │
library ──► analyzed BPM cache ──► candidates within ±4 BPM ──► score:
   • |trackBPM − target|            (primary)
   • not played in last N tracks    (anti-repeat)
   • user like/energy affinity      (secondary)
                                            ──► next-up slot
```

- **Half-time feel:** tracks at half the step rate (e.g., 85 BPM track ↔ 170 spm runner). Doubles usable catalog, often subjectively better at easy paces.
- **Hysteresis:** no switch unless drift > 4 BPM sustained 15 s — prevents flip-flopping.
- **Transitions:** only at track boundaries in v1. Crossfade-at-phrase-boundary detection is a v2 polish item.
- **Sync score:** % of moving time where playing track BPM matched cadence within ±2%. The core retention metric and a shareable bragging stat.

---

## 7. Architecture — zero operational cost

### Design principle
**No backend. Ever.** The app is a self-contained client pair. Every dollar of cost below is one-time; recurring infra is $0.

### Phone app (Android)
| Concern | Choice | Cost |
|---|---|---|
| Language/UI | Kotlin + Jetpack Compose + Material 3 | $0 |
| Playback | Media3 (ExoPlayer) — local files; Spotify via their SDK (v1.x) | $0 |
| Tempo analysis | On-device beat detection (TarsosDSP or aubio-style port), run as WorkManager job | $0 |
| Run tracking | FusedLocationProvider + step detector sensor | $0 |
| Storage | Room DB (runs, tracks, BPM cache) | $0 |
| Health sync | Health Connect | $0 |

### Wear OS app
- Kotlin + Compose for Wear OS; standalone run tracking (on-watch GPS on capable devices, else phone-connected).
- Cadence from wrist accelerometer (often more accurate than phone-in-pocket).
- Playlist: tempo-tagged audio cached to watch storage (~50 tracks ≈ 300 MB), played via Media3 on-watch.
- Sync with phone via Wear Data Layer (Bluetooth/Wi-Fi) — no server.

### Where data lives
Everything in local Room DBs on phone + watch. No accounts, no cloud. Export/backup via file share. Deletion = uninstall.

### Cost model

| Item | Cost | Type |
|---|---|---|
| Google Play developer account | **$25** | One-time |
| Android Studio, Jetpack, Media3 | $0 | Open source |
| All compute (analysis, matching) | $0 | On-device |
| Backend, hosting, DB | $0 | None exists |
| Crash reporting (optional) | $0 | Firebase free tier, off by default |
| **Recurring opex** | **$0 / month** | — |

The only scaling cost is Play Store distribution itself, which is Google's problem.

---

## 8. Monetization (Finch-style: support, not gates)

Guiding principle: **you never pay for content.** Every song, passport, feature, and cosmetic is earnable free by running and walking. Paying is patronage and convenience:

- **Free:** the whole product — unlimited runs/walks, matching, passports, gamification, history, export.
- **Supporter Pass (low monthly via Play Billing):** patronage, not a paywall. Funds runner support (gift a month to another runner, community challenges) and grants conveniences: expanded cosmetic shop, early access to new passports (free for everyone later), extra playlist slots, automated export/backup. Nothing a patient free user can't reach.
- **Gifting:** buy a month of Supporter for someone else — the "donate a month" mechanic. Community-forward framing that reinforces healthy habits.
- **No server means the marginal cost of a user is ~$0** — Supporter revenue is nearly pure margin after Google's cut, and patronage aligns revenue with the habit-health mission instead of fighting it.
- Optional Play Pass listing for distribution.

Rule of thumb: monetization must reinforce healthy habits, never punish missed days — no streak-loss fear, no ads, no pay-to-progress.

---

## 9. MVP roadmap

| Phase | Duration | Exit criteria |
|---|---|---|
| **P0 — Engine spike** | 2 wks | Cadence detector + beat detector run on real hardware; match a 10-track library |
| **P1 — Phone MVP** | 4 wks | F1–F6 complete; 3 in-house testers complete 10 runs each, sync score > 85% |
| **P2 — Wear OS** | 3 wks | Phone-free run works end-to-end; watch battery survives 90-min run (< 15% drain) |
| **P3 — Beta + polish** | 3 wks | Gamification layer (G1–G5) + playlist builder shipped; Health Connect, export; 50-user closed beta via Play internal track |
| **P4 — Launch** | — | Public listing; Spotify API approval submitted in parallel |

---

## 10. Success metrics

- **Activation:** first run completed within 2 sessions of install.
- **Aha moment:** first automatic track switch — instrument this event.
- **Retention:** D7 ≥ 25%, W4 ≥ 12% for runners who hit sync score ≥ 85% on run #1.
- **Quality:** median sync score ≥ 85%; false cadence detections < 1/min.
- **Progression:** "First Mile" passport completed within the first week; first unlock by run 2; PB-beat rate ≥ 1 per 3 runs; combo active ≥ 70% of moving time.

---

## 11. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Beat detection quality varies by genre (EDM easy, jazz hard) | High | Confidence score per track; low-confidence tracks excluded from auto-queue, usable manually |
| Spotify API approval delayed/declined | Medium | MVP ships local-files-only; Spotify is additive, never the foundation |
| YT Music has no API at all | Medium | Out of MVP; revisit if Google opens one |
| Cadence false positives (watch swing) | Medium | Wrist vs. arm-cadence calibration; HR cross-check |
| Battery drain on watch | Medium | Hard budget: analysis is precomputed, runtime is selection-only |
| One-person maintenance | High | Zero-cost architecture is itself the mitigation: no servers to keep alive |

---

## 12. Competitive snapshot

- **Weav Run** — adaptive playback speed, required licensed catalog, defunct. Lesson: don't own music.
- **RockMyRun / FitRadio** — curated mixes by BPM range, subscription servers. Lesson: server cost killed margins.
- **Spotify Running** — discontinued; tempo was playlist-level, not live. Lesson: live cadence lock is the differentiator, but don't depend on Spotify.
- **Strava/Runkeeper** — track everything, sync nothing to music. Gap TempoRun fills.

---

## 13. Open questions

1. Does half-time or full-time matching feel better at easy paces? (Needs P0 user testing — the prototype's toggle exists to answer exactly this.)
2. Should the watch cache be zone-balanced (fixed slots per zone) or top-N closest to recent paces?
3. Minimum viable library size before the product feels broken? (Hypothesis: ~120 analyzed tracks.)
4. One-time unlock vs. subscription pricing for Pro.
5. Passport pacing: km per milestone and passport length — hypothesis: starter passport completes in 2–3 runs, then ~10 km per milestone. Tune in beta.
6. Combo break: instant on lock loss, or a 5-second grace window? (Prototype uses instant; feels harsh on hills.)