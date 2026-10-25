# Dev setup

## Requirements
- Android Studio Ladybug (or newer), AGP 8.7.x, Kotlin 2.1, JDK 17

## Getting started
1. Open the repository root in Android Studio and let Gradle sync.
2. Generate the Gradle wrapper (not committed) once from the repo root:
   `gradle wrapper --gradle-version 8.10.2`
3. Run the `:app` configuration on a device or emulator (API 26+), or `:wear`
   on a Wear OS emulator (API 30+).

## Module layout
- `app/` — phone app (Kotlin + Jetpack Compose). P0 spike targets in `engine/`:
  - `CadenceDetector` — accelerometer -> steps/min
  - `BeatDetector` — PCM -> BPM + confidence (on-device, no cloud; the zero-cost moat)
  - `MatchEngine` — cadence -> track selection (pure logic, unit-testable)
  - `PassportEngine` — playlist passport progression (unlock model)
- `wear/` — Wear OS companion (P2 scope)
- `docs/PRODUCT_SPEC.md` — source of truth for scope
- `prototype/` — interactive React prototype (design reference)

## P0 exit criteria (spec section 9)
Cadence detector + beat detector validated on real hardware; a 10-track
library matched end-to-end on-device.
