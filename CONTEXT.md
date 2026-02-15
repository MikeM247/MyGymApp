# CONTEXT.md

## Project Snapshot
- Name: `My Gym App`
- Stack: vanilla `HTML + CSS + JS` (no build system)
- Entry point: `index.html`
- Runtime storage: browser `localStorage`
- Repo path: `F:\Dev\repos\My Gym App`
- Primary branch: `main`

## Core User Flows
- Start from `No Template Selected` (default, empty workout list).
- Load a template (built-in or saved custom template).
- Add custom exercises.
- For each exercise:
  - Add/remove sets
  - Enter reps/weight (kg)
  - Mark each set with `Set Done` (blocked if weight is empty/0)
  - Mark exercise `Complete Exercise` only when all sets are done
- Rest timer appears below completed exercise with `Set/Start/Pause/Reset/Complete Rest`.
- Save session history or `Save and Close Session`.

## Important Product Rules
- Default template on startup must be `No Template Selected`.
- `Complete Exercise` disabled until all set rows are done.
- When exercise is complete, all controls for that exercise are disabled except `Undo Complete`.
- Weight units are metric (`kg`).
- Per-exercise remembered weight should preload across templates/sessions.
- Button clicks use themed confirm modal unless explicitly skipped.

## Template System
- Built-in templates defined in `app.js` (`templates` object).
- Custom templates saved to `localStorage` key `myGymApp.templates`.
- Template payload supports:
  - `name`
  - `muscleGroups`
  - `sets`
  - `setRows[]` with `reps` + `weight`
- Custom template actions:
  - Save current as template
  - Edit selected custom template (optional rename)

## Muscle Map System
- Auto-detection from exercise name: `inferMuscleGroups()`.
- Override per exercise via `Edit Muscles` (checkboxes + `Auto Detect`).
- Visual map generated as SVG data URI.
- Exercise position inferred and shown in map (`Standing`, `Seated`, `Lying`, etc.).

## Persistence Keys
- `myGymApp.workout`
- `myGymApp.notes`
- `myGymApp.history`
- `myGymApp.lastSetCount`
- `myGymApp.templates`
- `myGymApp.exerciseWeights`

## Files of Interest
- `index.html`: page structure and modal shells
- `styles.css`: visual theme and component layout
- `app.js`: all app logic/state/persistence/rendering
- `README.md`: user-level run and usage notes

## Known Constraints
- No backend; all data is local browser storage.
- No test framework in repo yet.
- Some features are stateful in renderer-only flows; regression checks should include manual browser walk-through.
