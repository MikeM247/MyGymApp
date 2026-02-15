# ARCHITECTURE.md

## Runtime Model
- Single-page app with direct DOM rendering.
- State is held in a `state` object in `app.js`.
- Rendering is imperative (`renderExercises`, `renderHistory`, chart draw functions).

## Main Data Structures
- `state.exercises[]`
  - `id`
  - `name`
  - `done`
  - `muscleGroups[]`
  - `setRows[]` (`reps`, `weight`, `done`)
- `state.inlineRest`
  - `exerciseId`
  - `remaining`
  - `running`

## Persistence Strategy
- Each feature uses a dedicated localStorage key.
- Templates and histories store normalized structures.
- Backward compatibility is handled in normalization paths.

## Rendering Layers
- Workout editor/list (exercise cards)
- Rest timer panel (scoped to completed exercise)
- Analytics section (history-derived)
- Modals:
  - confirm modal (global button confirmation)
  - info modal (notifications)

## Dependency Boundaries
- No external JS libraries.
- SVG muscle maps are generated in JS and embedded as data URI.
- Charts are canvas-based custom draw code.
