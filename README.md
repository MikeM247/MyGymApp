# My Gym App

Modern, no-build workout tracker for your gym sessions.

## Run

1. Open `index.html` in your browser.
2. Pick a template or add custom exercises.
3. To create a new template workout, build your current exercise list, enter a template name, and click `Save Template`.
4. For each exercise, log each set in its own row (`set number`, `reps`, `weight`) and use `Add Set` / `Remove Last Set` as needed.
5. Tap `Start Exercise` first; exercise actions stay disabled until started.
6. Use `Edit Muscles` on any exercise to override the auto-detected muscle groups (or use `Auto Detect` to reset).
7. Tap `Complete Exercise` when done (includes a small celebration animation), then save your session to history.
8. Review analytics:
   - Volume chart (last 10 sessions)
   - Consistency chart (last 14 days)
   - PR leaderboard (estimated 1RM)
   - Current and best streak

All data is saved locally in your browser using `localStorage`.
