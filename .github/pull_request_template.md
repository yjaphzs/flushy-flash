## What and why

<!-- The PR title becomes a line in the release notes, so write it for a reader
     who was not involved: "fix: map pins drift at high zoom", not "fix bug". -->

## Verification

<!-- Tick what you actually ran. CI runs the first four; the rest are manual. -->

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npx expo-doctor`
- [ ] `npm run test:rules` — required if security rules changed
- [ ] Ran on a device/emulator — required for UI, map or native changes

## Native impact

- [ ] This changes `app.json`, a config plugin, or a native dependency
      (needs `npx expo prebuild --clean` and a fresh dev build)
