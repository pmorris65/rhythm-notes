# Rhythm Notes

A private, discreet cycle tracker for iOS and Android. It looks like an ordinary notes app, keeps everything encrypted on the phone, and never sends data anywhere.

See [PLAN.md](PLAN.md) for the product plan.

## What's in the app

- **Today:** day of cycle, when the next period is expected (or how late it is), one-tap "Started today" / "Ended today", and today's note.
- **Calendar:** logged period days are filled circles. The predicted next period is shown as dashed circles, the wider possible range as dotted circles, and about four cycles ahead are predicted. Predictions update as soon as anything is logged. Fertile window and ovulation estimates are optional and off by default.
- **Day log:** period on/off, flow, symptoms (plus your own), mood and a free-text note. Tapping an expected day offers "Started on this day".
- **Insights:** average cycle and period length, shortest/longest cycle, cycle history, and the most common symptoms by phase.
- **Reminders:** local notifications only, with neutral text you choose.
- **Backup:** export a password-encrypted backup file and restore it later.

## Privacy and discretion

| | |
|---|---|
| Storage | SQLite encrypted with SQLCipher. The 256-bit key is random and kept in the iOS Keychain / Android Keystore ("this device only"). |
| Network | None. No accounts, servers, analytics, ads or third-party SDKs that phone home. |
| Wording | Neutral by default ("Entry", "Rhythm", "Focus days"); can be switched to explicit. |
| App lock | 4-digit PIN, optional Face ID / fingerprint. Locks whenever the app goes to the background. |
| Disguise | Optional. When locked, the app shows a plain notepad; press and hold "Notes" to get to the PIN pad. |
| Wrong PINs | Optional: erase everything after 10 wrong PINs in a row. |
| App switcher | Content is hidden in the recent-apps view; screenshots are blocked on Android. |
| Backups | Android auto-backup is off. Export files are encrypted with XChaCha20-Poly1305, with the key derived from your password by scrypt. They have a plain file name and reveal nothing without the password. |
| Icon | A plain notebook. |

## Running it

Requirements: Node 20+.

```bash
npm install
```

### Quick look with Expo Go (no encryption)

Install **Expo Go** from the App Store / Play Store, then:

```bash
npm start          # scan the QR code with the camera (iPhone) or Expo Go (Android)
```

Add `--tunnel` if the phone and computer aren't on the same Wi-Fi. Expo Go doesn't include SQLCipher, so data is stored **unencrypted** there (Settings → Your data shows which case you're in), and Face ID may not work. Use it for trying out the screens only.

### Real build with encryption (cloud, no Mac needed)

Needs a free [Expo account](https://expo.dev/signup). Profiles are in `eas.json`.

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform android   # gives an .apk link / QR code to install
npx eas-cli@latest build --profile preview --platform ios       # needs a paid Apple Developer account
```

For iOS, register your iPhone first with `npx eas-cli@latest device:create`, then build.

### Real build on your own machine

```bash
npx expo run:android --device   # Android Studio installed, phone connected by USB with USB debugging on
npx expo run:ios --device       # Mac with Xcode, iPhone connected; a free Apple ID works (the app expires after 7 days)
```

`npm run web` opens a browser preview for quick UI work. It stores data unencrypted in the browser and is not meant for real use.

The bundle identifier / package name is `com.rhythmnotes.app` in `app.json`; change it to your own before publishing.

## Development

```bash
npm test           # unit tests (cycle maths, predictions, backups, validation)
npm run typecheck
npm run lint
```

```
src/
  app/              screens (Expo Router): tabs, day/[date], set-pin, reminders, backup
  domain/           pure logic: dates, cycles, predictions, insights, validation (unit tested)
  state/            Zustand store and derived data hooks
  storage/          encrypted SQLite repository (+ in-memory version for web/tests)
  security/         PIN, secure storage, encrypted backups
  notifications/    local reminders
  vocabulary/       neutral and explicit wording
  ui/               shared components, calendar, PIN pad, lock screen, onboarding
```

### How predictions work

- Consecutive period days (allowing one missed day) are grouped into periods; a cycle runs from one period start to the next.
- The next start is the last start plus the average of the last 6 cycle lengths. Cycles shorter than 15 or longer than 60 days are ignored as missed logs. Until there's history, the usual length set during setup is used.
- The ± range comes from how much your cycles vary, and it widens for cycles further ahead. Cycles varying by more than 7 days are flagged as irregular.
- If a period is late, it is shown as expected from today, with how many days late it is.
- Ovulation is estimated 14 days before the next period, with a 7-day fertile window. These are estimates and must not be used as contraception.

## Not built yet

From the plan: alternate app icons, a decoy PIN, pregnancy/perimenopause modes, widgets, and optional end-to-end-encrypted sync between your own devices.
