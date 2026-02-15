# FUTURE_WORK.md

## High-Value Next Improvements
- Add automated tests for:
  - template defaults and load behavior
  - set completion/lock rules
  - rest timer visibility/state transitions
- Add import/export for localStorage backup/restore.
- Add optional cloud sync/auth.
- Add exercise search/autocomplete with better muscle inference.
- Add accessible focus traps for modals and stronger keyboard navigation.

## Known UX Polish Opportunities
- Provide explicit inline helper text when complete button is disabled.
- Add image legend for muscle-map color intensities.
- Improve small-screen layout for dense set rows.

## Technical Debt
- Large `app.js` file; consider modularization (`state`, `render`, `storage`, `analytics`, `muscle-map`).
- Confirm/Info modal logic can be unified into one modal service.
