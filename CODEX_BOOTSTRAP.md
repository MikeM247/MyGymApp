# CODEX_BOOTSTRAP.md

## Goal
Fast startup checklist for future Codex sessions touching `My Gym App`.

## 1. Open Project
- `cd "F:\Dev\repos\My Gym App"`
- `git status --short`
- `git branch --show-current`

## 2. Quick Read Order
1. `CONTEXT.md`
2. `README.md`
3. `app.js` (main logic)
4. `index.html` and `styles.css` as needed

## 3. Safety Checks Before Editing
- Confirm current branch (avoid editing directly on `main` unless asked).
- If user asks for new work, create a branch:
  - `git checkout -b <branch-name>`
- Do not revert unrelated local changes.

## 4. Core Validation Commands
- Syntax check:
  - `node --check app.js`
- Optional git summary:
  - `git status --short`
  - `git diff -- app.js index.html styles.css README.md`

## 5. Manual Smoke Test (Browser)
- Open `index.html`.
- Confirm default is `No Template Selected` with no exercises.
- Add a custom exercise and verify themed info dialog.
- Mark set done behavior and complete exercise lock behavior.
- Verify rest timer below exercise after complete.
- Save session and verify history updates.

## 6. Push Workflow (When Requested)
- `git add <files>`
- `git commit -m "<message>"`
- `git push -u origin <branch>` (or `git push origin main` after approved merge flow)

## 7. High-Risk Areas
- Template load/default behavior (`loadSavedWorkout`, `loadTemplate`)
- Exercise lock rules in `renderExercises`
- LocalStorage schema updates (must remain backward compatible)
- Muscle map rendering and overrides

## 8. Session Handoff Requirement
- Update `CONTEXT.md` and/or `FUTURE_WORK.md` if behavior or architecture changes.
