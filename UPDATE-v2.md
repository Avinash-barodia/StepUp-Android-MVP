# Updating your existing StepUp project to v2

Keep using your original project folder: it contains your Expo project link and build configuration.

1. Extract this new ZIP into a separate folder (not directly over your old project).
2. From the new `stepup` folder, copy **App.tsx**, **src**, and **modules** into your original `stepup` folder. Replace matching files. The `src` folder contains the themes and walking metrics; `modules` contains the new Android session code.
3. Keep your original **app.json**, **eas.json**, **package.json**, and **package-lock.json**. No new dependencies are needed for v2. In your original app.json, set `expo.version` to `0.2.0` and `expo.android.versionCode` to `2` (or a higher integer if you have already used 2). Preserve `extra.eas.projectId`, owner, slug, and the Android package name.
4. In a terminal inside your original `stepup` folder, run:

```sh
npm run typecheck
npx eas-cli@latest build --platform android --profile preview
```

5. Install the resulting APK as an **update** over the old app using the same Expo account/project and signing key. Do not uninstall first if you want to retain local history. The database migration creates the walk-session table without deleting daily totals.

If you previously created a root `android` folder yourself, Expo may not regenerate it on EAS. The generated folder was not included in this archive; do not remove manually maintained native projects without reviewing your changes.

## New features
- Blush and Charcoal themes, saved across app restarts.
- Today / Walk / History / Profile navigation.
- Walk start, pause, resume, finish confirmation, review, save and discard.
- Session timer based on Android elapsed time, excluding manual pauses.
- Estimated average pace, average speed, average cadence and active walking energy.
- Persistent active-walk banner and saved session detail views.
- Daily tracking independent of walk-session pauses.
- Interrupted-session recovery: reopening after tracking stops retains saved counters and time up to the most recent persisted checkpoint, then requires explicit resume. No time is invented for the offline gap.

## Phone tests needed
- Compare the timer to a stopwatch; pause for 60 seconds and verify that those 60 seconds do not enter session duration.
- Walk with the screen locked; verify that the timer and session steps advance when reopening.
- Walk while a session is paused: daily steps may increase, session steps should not.
- Save a session; reopen the app and inspect its detail view.
- Finish then discard a different walk; confirm daily totals remain.
- Change theme and restart the app; confirm the choice remains.
- Force-stop during recording, reopen, and confirm it reports interruption with checkpointed duration rather than counting the entire offline gap.
- Install over v1 and confirm earlier daily totals remain.

## Limits
Pace/speed/distance are step-length estimates, not GPS measurements. Walking sessions include standing time unless manually paused. Each session start/resume establishes a fresh sensor baseline and may miss initial steps; buffered sensor events around a pause boundary can be imperfect. A killed process retains only the last checkpoint duration; Android deep sleep can delay checkpoints. Native Android build and physical-device tests still need to pass; the code has not been validated on your phone.
