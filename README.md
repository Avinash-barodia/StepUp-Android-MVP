# StepUp — Android walking tracker

React Native + TypeScript + Expo SDK 57, with a local Kotlin Expo module. This is the first source-code MVP, not a compiled or phone-validated APK.

## Included
- Profile setup: weight, height, daily goal, optional calibrated step length.
- Today dashboard: actual sensor steps, goal progress, distance and rough active walking calories.
- Seven-day chart and all recorded daily history.
- Native Android health foreground service and persistent tracking notification.
- SQLite daily totals; no login, application backend, GPS or external wearable.
- Pause/start controls, permission handling, unsupported-sensor handling and delete history.

The milestone uses a simple three-tab view rather than Expo Router; this keeps the first sensor build small. SQLite belongs to the native module so data is saved without depending on JavaScript remaining alive. Future routing, detailed day screens, monthly chart, automated reboot recovery and sensor fallback are not included yet.

## What you need
- Node.js 22.13+ LTS (or a compatible newer LTS) and npm.
- A free Expo account: https://expo.dev/signup
- An Android phone with a hardware step counter and internet for downloading the APK.
- No Android Studio, emulator or local Android SDK required for EAS builds.

## First standalone APK — recommended
Unzip this folder, open a terminal inside `stepup`, then run:

```sh
npm ci
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

During setup, choose your own Expo account, allow EAS to create/link the project, and let EAS generate an Android keystore if prompted. Keep the included `preview` profile in eas.json. EAS will add your real project ID to app.json; no account IDs or credentials are included in this archive.

When the cloud build succeeds, open its download link on your Android phone, install the APK, and allow installation from that source when Android asks. This preview APK runs independently: no laptop server is needed afterwards. Free EAS builds have quotas and queues; check your account before submitting additional builds.

Do not use Expo Go: the custom Kotlin service is not bundled in it. Do not run `expo run:android` or `eas build --local` on a low-spec laptop; those require local Android build tools.

## Development with live edits

```sh
npx eas-cli@latest build --platform android --profile development
npx expo start --dev-client
```

Install the development APK on your phone. Connect the phone and laptop to the same Wi-Fi. If your network blocks the connection, use `npx expo start --dev-client --tunnel` (this can prompt to install an additional tunnel package). TypeScript/UI edits usually do not need a new native build. Changes to Kotlin, native dependencies or manifest configuration do.

## Checks available here

```sh
npm run typecheck
npx expo install --check
npx expo-modules-autolinking resolve --platform android
npx expo export --platform android
```

The package was checked with TypeScript, Expo dependency checking, Expo Android module resolution, Android prebuild and JavaScript export. Native Gradle compilation and physical sensor behaviour still require the first EAS build and real-device test. A successful JS export is not proof that Kotlin compiles or that screen-locked counting works.

## First phone acceptance test
1. Save your measurements. Tap Start tracking and allow activity permission. Allow notifications so you can see tracking status.
2. Wait for an initial sensor update, then walk 100 manually counted steps with the phone in your pocket. Allow a short delay for the sensor to deliver its reading. Record the discrepancy; exact agreement is not guaranteed.
3. Lock the screen and walk another 100 steps. Reopen and confirm the total increased.
4. Pause, walk, resume, and confirm steps from the paused interval are not credited. The first reading in each new session is a baseline and may omit a few initial steps.
5. Close/reopen the UI while the service remains alive; confirm saved history remains and steps are not duplicated.
6. Reboot or force-stop: reopen and explicitly start tracking again. History should remain; missing steps are not recovered.
7. Revoke activity permission; confirm tracking stops or reports an error and can be restarted after permission is restored.
8. Test day rollover and a timezone change. Batched increments are assigned to the final sensor event's local date, so a batch spanning midnight may be imperfectly allocated.
9. Delete history while paused. Confirm profile stays, counters clear, and a new session starts from a fresh baseline.

## Tracking contract and limitations
- Android TYPE_STEP_COUNTER is cumulative. A transaction records the new baseline and adds only its positive delta; duplicate readings add zero. Boot changes and counter decreases establish a new baseline.
- Every explicit service start establishes a fresh baseline. This avoids crediting unobserved paused gaps but can miss a few initial steps or steps after service interruption.
- The service is START_NOT_STICKY: it does not silently restart after system termination. Manufacturer battery controls can stop it. Reopen and start again.
- Data is committed to SQLite before the UI reads it. UI refreshes every two seconds; the sensor itself can update less frequently.
- No accelerometer fallback, running classification, measured walking duration or historic Health Connect import in this milestone.
- Dates use the phone's timezone at event processing; past rows are not re-bucketed after timezone changes.
- Tracking status is in process memory; after process restart it correctly defaults to paused. History and profile persist.

## Estimation method
Distance = steps × step length in metres / 1000. If omitted, step length starts as height in cm × 0.00415 metres: a rough heuristic, not a personal measurement. Calibrate using a known distance divided by counted steps.

Active walking energy = 0.5 × weight in kg × distance in km. This is a rough horizontal, level-walking estimate derived from the ACSM walking equation's horizontal component (0.1 mL O2/kg/metre), using approximately 5 kcal/litre O2 and excluding its resting component. This simplified application is not validated for this app. It can under/overestimate real energy costs; no pace, hills, loads, running or individual physiology correction is applied. Do not use it as a precise calorie budget.

Estimates are accumulated using the profile at each incoming reading, so changing weight or step length does not recalculate older totals. A delayed batch around a profile change uses the new profile.

Reference: https://pmc.ncbi.nlm.nih.gov/articles/PMC7896743/
Android sensor documentation: https://developer.android.com/develop/sensors-and-location/sensors/sensors_motion
Foreground service requirements: https://developer.android.com/develop/background-work/services/fgs/service-types
Expo cloud builds: https://docs.expo.dev/build/setup/

## Files to edit
- `App.tsx`: onboarding, Today/History/Settings UI and permission prompts.
- `modules/step-tracker/index.ts`: typed native interface.
- `modules/step-tracker/android/src/main/java/com/stepup/tracker/`: service, database, counter logic and Expo bridge.
- `app.json`: app name, package and Android permissions.
- `eas.json`: cloud development, preview APK and production AAB profiles.

## Privacy
No application analytics or server upload is implemented. The development build includes Expo development tooling. Android's default OS backup behaviour may include local app data; this MVP does not promise that it is excluded from device backup. Uninstalling without restoration removes local history. There is no in-app export/restore yet.
