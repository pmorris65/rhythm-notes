# Rhythm Notes — App Plan (Draft for Review)

Rhythm Notes is a period and cycle tracker built around one idea: **the user's data and the fact that they track it belong only to them.** The app should look like an ordinary notes/journal app, keep all data on the device by default, and never send health data anywhere without the user explicitly choosing to.

---

## 1. Goals

1. **Discreet.** Neutral name, icon, and wording. Nothing on the home screen, in notifications, or in the app switcher reveals that it's a period tracker.
2. **Private by default.** Data stays on the device, encrypted. No account, no analytics, no ads, no third-party SDKs that phone home.
3. **Useful.** Easy logging, accurate predictions that improve over time, and a clear view of history.
4. **Simple.** Logging a day takes one or two taps.

## 2. Non-goals (for v1)

- Social features, community forums, or sharing with partners.
- Fertility/contraception claims (these carry medical/regulatory weight; predictions are shown as estimates only).
- Web version.
- Monetization (ads/data selling are permanently off the table; paid features can be revisited later).

---

## 3. Discretion Features

| Feature | Description |
|---|---|
| Neutral branding | Name "Rhythm Notes", generic notebook-style icon. No pink/flower/moon/uterus imagery. |
| Coded vocabulary (optional) | User can switch labels to neutral terms, e.g. "Period" → "Entry", "Flow" → "Intensity", "Fertile window" → "Focus days". On by default. |
| App lock | PIN and/or Face ID / fingerprint required to open. Auto-locks when the app goes to the background. |
| Disguise screen | When locked, the app shows a plain "notes" screen. Only the correct PIN (or a long-press/gesture) reveals the tracker. |
| Decoy PIN (v2) | A second PIN that opens an empty or fake data set. |
| App-switcher privacy | Screen is blurred/hidden in the recent apps view; screenshots blocked on Android. |
| Neutral notifications | Reminder text is user-editable and generic by default, e.g. "Time to review your notes". Never "Your period starts tomorrow". |
| Alternate icons | Choice of several plain icons (notebook, calendar, music note). |
| Quick exit | Shake or tap a button to instantly switch to the disguise screen. |
| Panic wipe | Option to erase all data, e.g. after X failed PIN attempts or via a settings button. |

## 4. Privacy & Security

- **Local-first storage:** all data lives in an encrypted on-device database (SQLCipher/encrypted SQLite). The encryption key is stored in the iOS Keychain / Android Keystore.
- **No accounts, no servers** in v1. The app works fully offline.
- **No analytics or crash reporting** that includes user data. If crash reporting is added later, it's opt-in and stripped of any health data.
- **Backup/export is user-controlled:** export an encrypted, password-protected file that the user saves wherever they choose. Import restores it.
- **Excluded from automatic cloud backups** (iCloud/Google auto backup) unless the user opts in, so data isn't silently copied off the device.
- **Delete everything** button that fully wipes the data and the key.
- **Clear privacy policy** in plain language: "We don't collect anything."

## 5. Core Features (MVP)

### Logging
- Period start/end with one tap ("Started today" / "Ended today"), editable afterwards.
- Daily flow intensity (spotting, light, medium, heavy).
- Symptoms (cramps, headache, bloating, acne, tender breasts, fatigue, etc.), with custom symptoms.
- Mood (a handful of simple options).
- Free-text note per day — fits the "notes" framing.

### Calendar & Home
- Home screen: "Day X of cycle", days until next expected period, and a quick-log button.
- Month calendar with logged days, predicted period days, and (optionally) an estimated fertile window.
- Tap any day to view/edit that day's log.

### Predictions
- Next period start based on the average of recent cycle lengths (e.g. last 6 cycles), falling back to 28 days (or user-entered length) until enough data exists.
- Shows a range when cycles are irregular (e.g. "in 3–6 days").
- Estimated ovulation ≈ 14 days before predicted next period; fertile window shown as clearly labeled estimates, off by default.

### Insights
- Average cycle and period length, shortest/longest cycle.
- Cycle history list.
- Most common symptoms by cycle phase.

### Reminders
- Upcoming period, log reminder, (optional) pill reminder — all with neutral, editable text.

### Onboarding
- 3–4 screens: set PIN, choose vocabulary (neutral vs. explicit), enter last period date and typical cycle length (optional), notifications on/off.

---

## 6. Proposed Tech Stack

| Area | Choice | Why |
|---|---|---|
| Framework | **React Native + Expo (TypeScript)** | One codebase for iOS and Android; alternate icons, biometrics, secure storage all supported. |
| Storage | `expo-sqlite` with SQLCipher (or `op-sqlite`) | Encrypted local database. |
| Key storage | `expo-secure-store` | Keychain / Keystore. |
| Biometrics | `expo-local-authentication` | Face ID / fingerprint. |
| Notifications | `expo-notifications` (local only) | No push server needed. |
| State | Zustand or React Context | Lightweight. |
| Navigation | Expo Router | File-based routing. |
| Tests | Jest + React Native Testing Library | Especially for the prediction logic. |

Alternative if you prefer: native Swift (iOS only) or Flutter. React Native + Expo is my recommendation for reaching both platforms quickly.

## 7. Data Model (sketch)

```
DayLog      { date, flow?, symptoms[], mood?, note?, isPeriodDay }
Cycle       { startDate, endDate?, periodLength?, cycleLength? }   // derived from DayLogs
Settings    { vocabularyMode, lockType, reminderTexts, cycleLengthGuess, iconChoice, ... }
```

Cycles are computed from logged period days rather than stored separately, so edits never get out of sync.

## 8. Project Structure (proposed)

```
rhythm-notes/
  app/              # screens (Expo Router)
    (locked)/       # disguise + PIN screens
    (main)/         # home, calendar, day log, insights, settings
  src/
    db/             # encrypted DB setup, migrations, queries
    domain/         # cycle calculations & predictions (pure, well-tested)
    security/       # lock, key management, wipe
    vocabulary/     # neutral vs. explicit label sets
    components/
  __tests__/
```

---

## 9. Milestones

1. **Foundation** — Expo project, TypeScript, lint/test setup, navigation skeleton, encrypted DB.
2. **Logging + Calendar** — day log screen, calendar view, period start/end.
3. **Predictions + Home** — cycle math (with unit tests), home dashboard.
4. **Discretion & Security** — PIN/biometric lock, disguise screen, app-switcher blur, neutral vocabulary, neutral notifications.
5. **Insights + Reminders** — stats screens, local notifications.
6. **Backup & Wipe** — encrypted export/import, delete-all, panic wipe.
7. **Polish & Release** — onboarding, accessibility, alternate icons, store listings (with neutral screenshots), privacy policy.

**v2 ideas:** decoy PIN, pregnancy mode, perimenopause mode, optional end-to-end-encrypted sync between the user's own devices, widgets (with neutral content), more languages.

---

## 10. Questions for You

1. **Platforms:** iOS, Android, or both? (Plan assumes both via Expo.)
2. **Disguise level:** Is a neutral name/icon + PIN enough, or do you want the full "fake notes screen" disguise in v1?
3. **Fertility window:** Include it (labeled as an estimate), or leave it out entirely?
4. **Sync:** Is local-only + manual encrypted backup OK for v1?
5. **Look & feel:** Any colors, style, or apps you'd like it to resemble?
6. **Audience:** Any specific users in mind (e.g. teens, people in restrictive environments) that should shape priorities?
