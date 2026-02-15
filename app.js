const templates = {
  "No Template Selected": [],
  "Push Day": [
    "Barbell Bench Press",
    "Incline Dumbbell Press",
    "Seated Dumbbell Shoulder Press",
    "Cable Lateral Raise",
    "Triceps Rope Pushdown"
  ],
  "Pull Day": [
    "Deadlift",
    "Lat Pulldown",
    "Chest-Supported Row",
    "Face Pull",
    "Hammer Curl"
  ],
  "Leg Day": [
    "Back Squat",
    "Romanian Deadlift",
    "Leg Press",
    "Walking Lunges",
    "Standing Calf Raise"
  ],
  "Full Body Quick": [
    "Goblet Squat",
    "Push-Up",
    "Single-Arm Dumbbell Row",
    "Dumbbell Romanian Deadlift",
    "Plank (60 sec)"
  ]
};

const MUSCLE_OPTIONS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Calves",
  "Core",
  "Full Body"
];

const STORAGE_KEYS = {
  workout: "myGymApp.workout",
  notes: "myGymApp.notes",
  history: "myGymApp.history",
  lastSetCount: "myGymApp.lastSetCount",
  templates: "myGymApp.templates",
  exerciseWeights: "myGymApp.exerciseWeights"
};

const state = {
  exercises: [],
  notes: "",
  timerSeconds: 90,
  timerRemaining: 90,
  timerInterval: null,
  inlineRest: null,
  inlineRestInterval: null,
  lastSetCount: 3,
  confirmBypassButton: null,
  pendingConfirmButton: null
};

const el = {
  templateSelect: document.getElementById("templateSelect"),
  templateNameInput: document.getElementById("templateNameInput"),
  saveTemplateBtn: document.getElementById("saveTemplateBtn"),
  editTemplateBtn: document.getElementById("editTemplateBtn"),
  exerciseInput: document.getElementById("exerciseInput"),
  exerciseList: document.getElementById("exerciseList"),
  completedCount: document.getElementById("completedCount"),
  totalCount: document.getElementById("totalCount"),
  progressPercent: document.getElementById("progressPercent"),
  progressFill: document.getElementById("progressFill"),
  notesInput: document.getElementById("notesInput"),
  historyList: document.getElementById("historyList"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  addExerciseBtn: document.getElementById("addExerciseBtn"),
  saveSessionBtn: document.getElementById("saveSessionBtn"),
  saveCloseSessionBtn: document.getElementById("saveCloseSessionBtn"),
  volumeChart: document.getElementById("volumeChart"),
  consistencyChart: document.getElementById("consistencyChart"),
  prList: document.getElementById("prList"),
  streakCount: document.getElementById("streakCount"),
  bestStreakCount: document.getElementById("bestStreakCount"),
  confirmOverlay: document.getElementById("confirmOverlay"),
  confirmMessage: document.getElementById("confirmMessage"),
  confirmCancelBtn: document.getElementById("confirmCancelBtn"),
  confirmOkBtn: document.getElementById("confirmOkBtn"),
  infoOverlay: document.getElementById("infoOverlay"),
  infoMessage: document.getElementById("infoMessage"),
  infoOkBtn: document.getElementById("infoOkBtn")
};

function init() {
  populateTemplates();
  loadLastSetCount();
  loadSavedWorkout();
  seedRememberedWeightsFromHistory();
  loadNotes();
  bindGlobalButtonConfirmation();
  renderExercises();
  renderHistory();
  bindEvents();
}

function bindGlobalButtonConfirmation() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.confirmSkip === "true") return;
    if (state.confirmBypassButton === button) {
      state.confirmBypassButton = null;
      return;
    }
    if (el.confirmOverlay.classList.contains("open")) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openConfirmForButton(button);
  }, true);
}

function openConfirmForButton(button) {
  state.pendingConfirmButton = button;
  const label = button.textContent ? button.textContent.trim() : "this action";
  el.confirmMessage.textContent = `Proceed with "${label}"?`;
  el.confirmOverlay.classList.add("open");
  el.confirmOverlay.setAttribute("aria-hidden", "false");
  el.confirmOkBtn.focus();
}

function closeConfirmDialog() {
  el.confirmOverlay.classList.remove("open");
  el.confirmOverlay.setAttribute("aria-hidden", "true");
}

function populateTemplates() {
  const allTemplates = getAllTemplates();
  el.templateSelect.innerHTML = "";
  Object.keys(allTemplates).forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    el.templateSelect.appendChild(option);
  });
}

function getCustomTemplates() {
  const raw = localStorage.getItem(STORAGE_KEYS.templates);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : {};
  } catch (error) {
    console.error("Could not parse custom templates.", error);
    return {};
  }
}

function saveCustomTemplates(customTemplates) {
  localStorage.setItem(STORAGE_KEYS.templates, JSON.stringify(customTemplates));
}

function getAllTemplates() {
  return {
    ...templates,
    ...getCustomTemplates()
  };
}

function getExerciseWeightMap() {
  const raw = localStorage.getItem(STORAGE_KEYS.exerciseWeights);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : {};
  } catch (error) {
    console.error("Could not parse exercise weight map.", error);
    return {};
  }
}

function saveExerciseWeightMap(weightMap) {
  localStorage.setItem(STORAGE_KEYS.exerciseWeights, JSON.stringify(weightMap));
}

function getRememberedWeight(exerciseName) {
  const map = getExerciseWeightMap();
  return sanitizeNumber(map[exerciseName], 0, 0, 2000);
}

function updateRememberedWeight(exerciseName, weight) {
  const normalized = sanitizeNumber(weight, 0, 0, 2000);
  if (normalized <= 0) return;
  const map = getExerciseWeightMap();
  map[exerciseName] = normalized;
  saveExerciseWeightMap(map);
}

function seedRememberedWeightsFromHistory() {
  const map = getExerciseWeightMap();
  if (Object.keys(map).length) return;
  const history = getHistory();
  const seeded = {};
  history.forEach((entry) => {
    if (!Array.isArray(entry.exercises)) return;
    entry.exercises.forEach((exercise) => {
      if (!Array.isArray(exercise.setRows)) return;
      const latest = [...exercise.setRows]
        .reverse()
        .find((row) => (Number(row.weight) || 0) > 0);
      if (latest && !seeded[exercise.name]) {
        seeded[exercise.name] = sanitizeNumber(latest.weight, 0, 0, 2000);
      }
    });
  });
  if (Object.keys(seeded).length) {
    saveExerciseWeightMap(seeded);
  }
}

function loadSavedWorkout() {
  const initialTemplate = "No Template Selected";
  el.templateSelect.value = initialTemplate;
  loadTemplate(initialTemplate);
}

function loadLastSetCount() {
  const saved = Number(localStorage.getItem(STORAGE_KEYS.lastSetCount));
  state.lastSetCount = sanitizeNumber(saved, 3, 1, 20);
}

function saveLastSetCount() {
  localStorage.setItem(STORAGE_KEYS.lastSetCount, String(state.lastSetCount));
}

function createExercise(name, setCount = state.lastSetCount || 3) {
  const sets = sanitizeNumber(setCount, 3, 1, 20);
  const rememberedWeight = getRememberedWeight(name);
  return {
    id: crypto.randomUUID(),
    name,
    done: false,
    muscleGroups: inferMuscleGroups(name),
    setRows: Array.from({ length: sets }, () => ({ reps: 10, weight: rememberedWeight, done: false }))
  };
}

function normalizeExercise(item) {
  const sets = sanitizeNumber(item.sets ?? item.setRows?.length, 3, 1, 20);
  const legacyReps = sanitizeNumber(item.reps, 10, 1, 50);
  const legacyWeight = sanitizeNumber(item.weight, 0, 0, 2000);
  const rawSetWeights = Array.isArray(item.setWeights) ? item.setWeights : [];
  const rawSetRows = Array.isArray(item.setRows) ? item.setRows : [];
  return {
    id: item.id || crypto.randomUUID(),
    name: String(item.name || "Exercise"),
    done: Boolean(item.done),
    muscleGroups: normalizeMuscleGroups(item.muscleGroups, String(item.name || "Exercise")),
    setRows: Array.from({ length: sets }, (_, index) => ({
      reps: sanitizeNumber(rawSetRows[index]?.reps ?? legacyReps, 10, 1, 50),
      weight: sanitizeNumber(
        rawSetRows[index]?.weight ?? rawSetWeights[index] ?? legacyWeight,
        0,
        0,
        2000
      ),
      done: Boolean(rawSetRows[index]?.done)
    }))
  };
}

function sanitizeNumber(value, fallback, min, max) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeMuscleGroups(muscleGroups, exerciseName) {
  if (Array.isArray(muscleGroups)) {
    const cleaned = Array.from(
      new Set(
        muscleGroups
          .map((x) => String(x))
          .filter((x) => MUSCLE_OPTIONS.includes(x))
      )
    );
    if (cleaned.length) return cleaned;
  }
  return inferMuscleGroups(exerciseName);
}

function loadTemplate(templateName) {
  clearInlineRest();
  const allTemplates = getAllTemplates();
  const source = allTemplates[templateName] || [];
  state.exercises = source.map(createExerciseFromTemplateItem);
  saveWorkout();
}

function createExerciseFromTemplateItem(item) {
  if (typeof item === "string") {
    return createExercise(item);
  }

  const name = String(item?.name || "Exercise");
  const sets = sanitizeNumber(item?.sets ?? item?.setRows?.length, 3, 1, 20);
  const rememberedWeight = getRememberedWeight(name);
  const exercise = createExercise(name, sets);
  exercise.muscleGroups = normalizeMuscleGroups(item?.muscleGroups, name);
  if (Array.isArray(item?.setRows) && item.setRows.length) {
    exercise.setRows = exercise.setRows.map((row, index) => ({
      reps: sanitizeNumber(item.setRows[index]?.reps ?? row.reps, row.reps, 1, 50),
      weight: rememberedWeight > 0
        ? rememberedWeight
        : sanitizeNumber(item.setRows[index]?.weight ?? row.weight, row.weight, 0, 2000),
      done: false
    }));
  }
  return exercise;
}

function bindEvents() {
  el.confirmCancelBtn.addEventListener("click", () => {
    state.pendingConfirmButton = null;
    closeConfirmDialog();
  });

  el.confirmOkBtn.addEventListener("click", () => {
    const button = state.pendingConfirmButton;
    state.pendingConfirmButton = null;
    closeConfirmDialog();
    if (!button || !document.contains(button)) return;
    state.confirmBypassButton = button;
    button.click();
  });

  el.confirmOverlay.addEventListener("click", (event) => {
    if (event.target !== el.confirmOverlay) return;
    state.pendingConfirmButton = null;
    closeConfirmDialog();
  });

  el.infoOkBtn.addEventListener("click", closeInfoDialog);
  el.infoOverlay.addEventListener("click", (event) => {
    if (event.target !== el.infoOverlay) return;
    closeInfoDialog();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (el.infoOverlay.classList.contains("open")) {
      closeInfoDialog();
      return;
    }
    if (el.confirmOverlay.classList.contains("open")) {
      state.pendingConfirmButton = null;
      closeConfirmDialog();
    }
  });

  el.templateSelect.addEventListener("change", (event) => {
    loadTemplate(event.target.value);
    renderExercises();
  });

  el.saveTemplateBtn.addEventListener("click", saveCurrentAsTemplate);
  el.editTemplateBtn.addEventListener("click", editSelectedTemplate);

  el.clearHistoryBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEYS.history);
    renderHistory();
  });

  el.addExerciseBtn.addEventListener("click", addCustomExercise);
  el.exerciseInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomExercise();
    }
  });

  el.notesInput.addEventListener("input", (event) => {
    state.notes = event.target.value;
    saveNotes();
  });

  el.saveSessionBtn.addEventListener("click", saveSessionToHistory);
  el.saveCloseSessionBtn.addEventListener("click", () => {
    saveSessionToHistory();
    startFreshSession();
  });
}

function startFreshSession() {
  clearInlineRest();
  loadTemplate(el.templateSelect.value);
  state.notes = "";
  el.notesInput.value = "";
  saveNotes();
  renderExercises();
}

function saveCurrentAsTemplate() {
  const templateName = el.templateNameInput.value.trim();
  if (!templateName) {
    openInfoDialog("Enter a template name first.");
    return;
  }

  const customTemplates = getCustomTemplates();
  customTemplates[templateName] = state.exercises.map((exercise) => ({
    name: exercise.name,
    muscleGroups: [...exercise.muscleGroups],
    sets: exercise.setRows.length,
    setRows: exercise.setRows.map((row) => ({
      reps: row.reps,
      weight: row.weight
    }))
  }));
  saveCustomTemplates(customTemplates);
  populateTemplates();
  el.templateSelect.value = templateName;
  el.templateNameInput.value = "";
  openInfoDialog(`Template "${templateName}" was saved and added to the template list.`);
}

function editSelectedTemplate() {
  const selectedTemplate = el.templateSelect.value;
  const customTemplates = getCustomTemplates();
  if (!Object.prototype.hasOwnProperty.call(customTemplates, selectedTemplate)) {
    openInfoDialog("Select a custom template to edit. Built-in templates cannot be edited directly.");
    return;
  }

  const newName = el.templateNameInput.value.trim() || selectedTemplate;
  const updatedTemplate = state.exercises.map((exercise) => ({
    name: exercise.name,
    muscleGroups: [...exercise.muscleGroups],
    sets: exercise.setRows.length,
    setRows: exercise.setRows.map((row) => ({
      reps: row.reps,
      weight: row.weight
    }))
  }));

  if (newName !== selectedTemplate) {
    delete customTemplates[selectedTemplate];
  }
  customTemplates[newName] = updatedTemplate;
  saveCustomTemplates(customTemplates);
  populateTemplates();
  el.templateSelect.value = newName;
  el.templateNameInput.value = "";
  openInfoDialog(`Template "${newName}" was updated.`);
}

function renderExercises() {
  el.exerciseList.innerHTML = "";

  state.exercises.forEach((exercise) => {
    const exerciseLocked = exercise.done;
    const li = document.createElement("li");
    li.className = `exercise-item ${exercise.done ? "completed" : ""}`;
    li.style.position = "relative";

    const main = document.createElement("div");
    main.className = "exercise-main";

    const top = document.createElement("div");
    top.className = "exercise-top";

    const name = document.createElement("span");
    name.className = "exercise-name";
    name.textContent = exercise.name;

    const status = document.createElement("span");
    status.className = "exercise-status";
    status.textContent = exercise.done ? "Completed" : "In progress";

    const setCount = document.createElement("span");
    setCount.className = "set-count-pill";
    setCount.textContent = `${exercise.setRows.length} sets`;

    const titleWrap = document.createElement("div");
    titleWrap.className = "exercise-title-wrap";
    titleWrap.appendChild(name);
    titleWrap.appendChild(setCount);
    titleWrap.appendChild(status);

    const muscleGroups = normalizeMuscleGroups(exercise.muscleGroups, exercise.name);
    exercise.muscleGroups = muscleGroups;
    const muscleVisual = createMuscleVisual(exercise.name, muscleGroups);

    const actions = document.createElement("div");
    actions.className = "exercise-actions";

    const addSetBtn = document.createElement("button");
    addSetBtn.className = "btn btn-secondary";
    addSetBtn.textContent = "Add Set";
    addSetBtn.disabled = exerciseLocked;
    addSetBtn.addEventListener("click", () => {
      addSetRow(exercise);
      saveWorkout();
      renderExercises();
    });

    const removeSetBtn = document.createElement("button");
    removeSetBtn.className = "btn btn-ghost";
    removeSetBtn.textContent = "Remove Last Set";
    removeSetBtn.disabled = exerciseLocked || exercise.setRows.length <= 1;
    removeSetBtn.addEventListener("click", () => {
      removeSetRow(exercise);
      saveWorkout();
      renderExercises();
    });

    const completeBtn = document.createElement("button");
    completeBtn.className = exercise.done ? "btn btn-ghost" : "btn btn-primary";
    completeBtn.textContent = exercise.done ? "Undo Complete" : "Complete Exercise";
    const allSetsDone = exercise.setRows.every((row) => row.done);
    if (!exercise.done && !allSetsDone) {
      completeBtn.disabled = true;
      completeBtn.title = "Mark all sets as Set Done first.";
    }
    completeBtn.addEventListener("click", () => {
      const nextDone = !exercise.done;
      exercise.done = nextDone;
      saveWorkout();
      if (nextDone) {
        startInlineRest(exercise.id, true);
        triggerCelebration(li);
      } else if (state.inlineRest?.exerciseId === exercise.id) {
        clearInlineRest();
      }
      renderExercises();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-ghost";
    removeBtn.textContent = "Remove";
    removeBtn.disabled = exerciseLocked;
    removeBtn.addEventListener("click", () => {
      if (state.inlineRest?.exerciseId === exercise.id) {
        clearInlineRest();
      }
      state.exercises = state.exercises.filter((x) => x.id !== exercise.id);
      saveWorkout();
      renderExercises();
    });

    actions.appendChild(addSetBtn);
    actions.appendChild(removeSetBtn);
    actions.appendChild(completeBtn);
    actions.appendChild(removeBtn);
    top.appendChild(titleWrap);
    main.appendChild(top);
    main.appendChild(muscleVisual);
    main.appendChild(createMuscleEditor(exercise, exerciseLocked));
    main.appendChild(createSetRowsEditor(exercise, exerciseLocked));
    if (state.inlineRest?.exerciseId === exercise.id) {
      const restSlot = document.createElement("div");
      restSlot.className = "exercise-rest-slot";
      restSlot.appendChild(createInlineRestPanel(exercise.id));
      main.appendChild(restSlot);
    }
    main.appendChild(actions);
    li.appendChild(main);
    el.exerciseList.appendChild(li);
  });

  updateStats();
}

function addSetRow(exercise) {
  const last = exercise.setRows[exercise.setRows.length - 1] || { reps: 10, weight: 0, done: false };
  exercise.setRows.push({
    reps: sanitizeNumber(last.reps, 10, 1, 50),
    weight: sanitizeNumber(last.weight, 0, 0, 2000),
    done: false
  });
  state.lastSetCount = sanitizeNumber(exercise.setRows.length, state.lastSetCount, 1, 20);
  saveLastSetCount();
}

function removeSetRow(exercise) {
  if (exercise.setRows.length <= 1) return;
  exercise.setRows.pop();
  state.lastSetCount = sanitizeNumber(exercise.setRows.length, state.lastSetCount, 1, 20);
  saveLastSetCount();
}

function createSetRowsEditor(exercise, exerciseLocked = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "set-rows-block";

  const header = document.createElement("div");
  header.className = "set-rows-header";
  header.innerHTML = "<span>Set</span><span>Reps</span><span>Weight (kg)</span><span>Action</span>";
  wrapper.appendChild(header);

  exercise.setRows.forEach((row, index) => {
    const rowEl = document.createElement("div");
    rowEl.className = "set-row";

    const label = document.createElement("span");
    label.className = "set-row-label";
    label.textContent = `#${index + 1}`;

    const repsInput = document.createElement("input");
    repsInput.type = "number";
    repsInput.min = "1";
    repsInput.max = "50";
    repsInput.value = String(row.reps);
    repsInput.disabled = exerciseLocked;
    repsInput.setAttribute("aria-label", `${exercise.name} set ${index + 1} reps`);
    repsInput.addEventListener("input", () => {
      exercise.setRows[index].reps = sanitizeNumber(repsInput.value, 10, 1, 50);
      saveWorkout();
    });

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "2000";
    input.value = String(row.weight);
    input.disabled = exerciseLocked;
    input.placeholder = "0";
    input.setAttribute("aria-label", `${exercise.name} set ${index + 1} weight`);
    input.addEventListener("input", () => {
      exercise.setRows[index].weight = sanitizeNumber(input.value, 0, 0, 2000);
      updateRememberedWeight(exercise.name, exercise.setRows[index].weight);
      saveWorkout();
    });

    const doneBtn = document.createElement("button");
    doneBtn.className = row.done ? "btn btn-ghost set-done-btn" : "btn btn-secondary set-done-btn";
    doneBtn.textContent = row.done ? "Done" : "Set Done";
    doneBtn.disabled = exerciseLocked;
    doneBtn.addEventListener("click", () => {
      const weight = sanitizeNumber(exercise.setRows[index].weight, 0, 0, 2000);
      if (!exercise.setRows[index].done && weight <= 0) {
        openInfoDialog("Enter a weight before marking this set as done.");
        return;
      }
      const nextDone = !exercise.setRows[index].done;
      exercise.setRows[index].done = nextDone;
      saveWorkout();
      if (nextDone && state.inlineRest) {
        clearInlineRest();
      }
      renderExercises();
    });

    rowEl.appendChild(label);
    rowEl.appendChild(repsInput);
    rowEl.appendChild(input);
    rowEl.appendChild(doneBtn);
    wrapper.appendChild(rowEl);
  });

  return wrapper;
}

function inferMuscleGroups(exerciseName) {
  const name = exerciseName.toLowerCase();
  const groups = [];

  if (/(bench|press|push-up|fly|chest)/.test(name)) groups.push("Chest");
  if (/(shoulder|overhead|lateral|face pull)/.test(name)) groups.push("Shoulders");
  if (/(triceps|pushdown|dip)/.test(name)) groups.push("Triceps");
  if (/(row|pulldown|pull-up|pullup|lat|deadlift)/.test(name)) groups.push("Back");
  if (/(biceps|curl|hammer)/.test(name)) groups.push("Biceps");
  if (/(squat|lunge|leg press|leg extension|hamstring|rdl|romanian)/.test(name)) groups.push("Legs");
  if (/(calf)/.test(name)) groups.push("Calves");
  if (/(plank|core|ab|crunch)/.test(name)) groups.push("Core");
  if (!groups.length) groups.push("Full Body");

  return groups.slice(0, 4);
}

function inferExercisePosition(exerciseName) {
  const name = exerciseName.toLowerCase();
  if (/(seated|sit)/.test(name)) return "Seated";
  if (/(bench|lying|supine|push-up|press)/.test(name)) return "Lying";
  if (/(plank|prone)/.test(name)) return "Prone";
  if (/(kneeling|lunge|split squat)/.test(name)) return "Kneeling";
  return "Standing";
}

function createMuscleVisual(exerciseName, groups) {
  const wrapper = document.createElement("div");
  wrapper.className = "muscle-visual";
  const position = inferExercisePosition(exerciseName);

  const image = document.createElement("img");
  image.className = "muscle-image";
  image.alt = `${exerciseName} position: ${position}. muscle groups: ${groups.join(", ")}`;
  image.src = buildMuscleSvgDataUri(groups, position);

  const caption = document.createElement("div");
  caption.className = "muscle-caption";
  caption.textContent = `${position} | ${groups.join(" | ")}`;

  wrapper.appendChild(image);
  wrapper.appendChild(caption);
  return wrapper;
}

function createMuscleEditor(exercise, exerciseLocked = false) {
  const details = document.createElement("details");
  details.className = "muscle-editor";
  if (exerciseLocked) {
    details.setAttribute("data-locked", "true");
  }

  const summary = document.createElement("summary");
  summary.textContent = "Edit Muscles";
  details.appendChild(summary);

  const body = document.createElement("div");
  body.className = "muscle-editor-body";

  const options = document.createElement("div");
  options.className = "muscle-options";

  MUSCLE_OPTIONS.forEach((group) => {
    const label = document.createElement("label");
    label.className = "muscle-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = exercise.muscleGroups.includes(group);
    checkbox.disabled = exerciseLocked;
    checkbox.addEventListener("change", () => {
      let next = exercise.muscleGroups.filter((x) => x !== group);
      if (checkbox.checked) {
        next = [...next, group];
      }
      if (!next.length) next = ["Full Body"];
      exercise.muscleGroups = normalizeMuscleGroups(next, exercise.name);
      saveWorkout();
      renderExercises();
    });

    const text = document.createElement("span");
    text.textContent = group;

    label.appendChild(checkbox);
    label.appendChild(text);
    options.appendChild(label);
  });

  const autoBtn = document.createElement("button");
  autoBtn.className = "btn btn-ghost";
  autoBtn.textContent = "Auto Detect";
  autoBtn.disabled = exerciseLocked;
  autoBtn.addEventListener("click", () => {
    exercise.muscleGroups = inferMuscleGroups(exercise.name);
    saveWorkout();
    renderExercises();
  });

  body.appendChild(options);
  body.appendChild(autoBtn);
  details.appendChild(body);
  return details;
}

function buildMuscleSvgDataUri(groups, position) {
  const highlights = groups.map((group) => muscleShape(group)).join("");
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 158">
  <rect width="320" height="158" rx="14" fill="#f8fafc"/>
  <rect x="10" y="10" width="132" height="138" rx="10" fill="#f1f5f9"/>
  <rect x="178" y="10" width="132" height="138" rx="10" fill="#f1f5f9"/>
  <rect x="232" y="16" width="78" height="24" rx="12" fill="#ecfeff" stroke="#67e8f9" stroke-width="1.5"/>
  <text x="271" y="32" font-size="11" text-anchor="middle" fill="#0f766e" font-family="Space Grotesk, sans-serif">${position}</text>
  <text x="76" y="144" font-size="11" text-anchor="middle" fill="#64748b" font-family="Space Grotesk, sans-serif">Front</text>
  <text x="244" y="144" font-size="11" text-anchor="middle" fill="#64748b" font-family="Space Grotesk, sans-serif">Back</text>
  <g fill="#dbe4f0" stroke="#8aa0b8" stroke-width="2">
    <circle cx="76" cy="28" r="11"/><rect x="60" y="42" width="32" height="54" rx="13"/>
    <rect x="49" y="46" width="10" height="40" rx="5"/><rect x="93" y="46" width="10" height="40" rx="5"/>
    <rect x="64" y="96" width="10" height="30" rx="4"/><rect x="78" y="96" width="10" height="30" rx="4"/>
    <circle cx="244" cy="28" r="11"/><rect x="228" y="42" width="32" height="54" rx="13"/>
    <rect x="217" y="46" width="10" height="40" rx="5"/><rect x="261" y="46" width="10" height="40" rx="5"/>
    <rect x="232" y="96" width="10" height="30" rx="4"/><rect x="246" y="96" width="10" height="30" rx="4"/>
  </g>
  ${highlights}
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function muscleShape(group) {
  const fill = "#ff5a3a";
  const front = {
    Chest: `<rect x="63" y="50" width="26" height="14" rx="5" fill="${fill}" opacity="0.86"/>`,
    Shoulders: `<rect x="54" y="41" width="44" height="11" rx="5" fill="${fill}" opacity="0.86"/>`,
    Triceps: `<rect x="49" y="52" width="8" height="22" rx="3" fill="${fill}" opacity="0.86"/><rect x="95" y="52" width="8" height="22" rx="3" fill="${fill}" opacity="0.86"/>`,
    Biceps: `<rect x="49" y="45" width="8" height="16" rx="3" fill="${fill}" opacity="0.86"/><rect x="95" y="45" width="8" height="16" rx="3" fill="${fill}" opacity="0.86"/>`,
    Legs: `<rect x="63" y="96" width="26" height="18" rx="5" fill="${fill}" opacity="0.86"/>`,
    Calves: `<rect x="64" y="112" width="10" height="12" rx="4" fill="${fill}" opacity="0.86"/><rect x="78" y="112" width="10" height="12" rx="4" fill="${fill}" opacity="0.86"/>`,
    Core: `<rect x="67" y="65" width="18" height="24" rx="5" fill="${fill}" opacity="0.86"/>`,
    "Full Body": `<rect x="60" y="42" width="32" height="84" rx="12" fill="${fill}" opacity="0.5"/>`
  };
  const back = {
    Back: `<rect x="231" y="48" width="26" height="26" rx="6" fill="${fill}" opacity="0.86"/>`,
    Shoulders: `<rect x="222" y="41" width="44" height="11" rx="5" fill="${fill}" opacity="0.86"/>`,
    Triceps: `<rect x="217" y="52" width="8" height="22" rx="3" fill="${fill}" opacity="0.86"/><rect x="263" y="52" width="8" height="22" rx="3" fill="${fill}" opacity="0.86"/>`,
    Biceps: `<rect x="217" y="45" width="8" height="16" rx="3" fill="${fill}" opacity="0.86"/><rect x="263" y="45" width="8" height="16" rx="3" fill="${fill}" opacity="0.86"/>`,
    Legs: `<rect x="231" y="96" width="26" height="18" rx="5" fill="${fill}" opacity="0.86"/>`,
    Calves: `<rect x="232" y="112" width="10" height="12" rx="4" fill="${fill}" opacity="0.86"/><rect x="246" y="112" width="10" height="12" rx="4" fill="${fill}" opacity="0.86"/>`,
    Core: `<rect x="235" y="66" width="18" height="24" rx="5" fill="${fill}" opacity="0.86"/>`,
    "Full Body": `<rect x="228" y="42" width="32" height="84" rx="12" fill="${fill}" opacity="0.5"/>`
  };

  return `${front[group] || ""}${back[group] || ""}`;
}

function createInlineRestPanel(exerciseId) {
  const panel = document.createElement("div");
  panel.className = "exercise-rest-panel";
  panel.setAttribute("data-rest-panel", exerciseId);

  const title = document.createElement("p");
  title.className = "rest-panel-title";
  title.textContent = "Rest Timer";

  const readout = document.createElement("div");
  readout.className = "rest-panel-readout";
  readout.setAttribute("data-rest-readout", exerciseId);
  readout.textContent = formatSeconds(state.inlineRest?.remaining || state.timerSeconds);

  const setRow = document.createElement("div");
  setRow.className = "rest-panel-set-row";

  const minutesInput = document.createElement("input");
  minutesInput.type = "number";
  minutesInput.min = "0";
  minutesInput.max = "10";
  minutesInput.value = String(Math.floor(state.timerSeconds / 60));
  minutesInput.setAttribute("aria-label", "Rest timer minutes");

  const secondsInput = document.createElement("input");
  secondsInput.type = "number";
  secondsInput.min = "0";
  secondsInput.max = "59";
  secondsInput.value = String(state.timerSeconds % 60);
  secondsInput.setAttribute("aria-label", "Rest timer seconds");

  const setBtn = document.createElement("button");
  setBtn.className = "btn btn-secondary";
  setBtn.textContent = "Set";
  setBtn.addEventListener("click", () => {
    const minutes = Number(minutesInput.value) || 0;
    const seconds = Number(secondsInput.value) || 0;
    const total = Math.min(10 * 60, (minutes * 60) + seconds);
    state.timerSeconds = Math.max(5, total);
    if (state.inlineRest) {
      state.inlineRest.remaining = state.timerSeconds;
      state.inlineRest.running = false;
      if (state.inlineRestInterval) {
        clearInterval(state.inlineRestInterval);
        state.inlineRestInterval = null;
      }
    }
    updateInlineRestBadge();
    renderExercises();
  });

  setRow.appendChild(minutesInput);
  setRow.appendChild(secondsInput);
  setRow.appendChild(setBtn);

  const controls = document.createElement("div");
  controls.className = "rest-panel-controls";

  const startBtn = document.createElement("button");
  startBtn.className = "btn btn-primary";
  startBtn.textContent = "Start";
  startBtn.addEventListener("click", () => {
    if (!state.inlineRest) return;
    state.inlineRest.running = true;
    runInlineRestInterval();
    renderExercises();
  });

  const pauseBtn = document.createElement("button");
  pauseBtn.className = "btn btn-ghost";
  pauseBtn.textContent = "Pause";
  pauseBtn.addEventListener("click", () => {
    pauseInlineRest();
    renderExercises();
  });

  const resetBtn = document.createElement("button");
  resetBtn.className = "btn btn-ghost";
  resetBtn.textContent = "Reset";
  resetBtn.addEventListener("click", () => {
    resetInlineRest();
    renderExercises();
  });

  const completeRestBtn = document.createElement("button");
  completeRestBtn.className = "btn btn-primary";
  completeRestBtn.textContent = "Complete Rest";
  completeRestBtn.addEventListener("click", () => {
    clearInlineRest();
    renderExercises();
  });

  controls.appendChild(startBtn);
  controls.appendChild(pauseBtn);
  controls.appendChild(resetBtn);
  controls.appendChild(completeRestBtn);
  panel.appendChild(title);
  panel.appendChild(readout);
  panel.appendChild(setRow);
  panel.appendChild(controls);
  return panel;
}

function triggerCelebration(cardEl) {
  cardEl.animate(
    [
      { transform: "scale(1)", boxShadow: "0 0 0 rgba(0,0,0,0)" },
      { transform: "scale(1.01)", boxShadow: "0 12px 30px rgba(20,184,166,0.32)" },
      { transform: "scale(1)" }
    ],
    { duration: 500, easing: "ease-out" }
  );

  for (let i = 0; i < 8; i += 1) {
    const dot = document.createElement("span");
    dot.className = "celebrate-dot";
    dot.style.left = `${45 + (Math.random() * 10)}%`;
    dot.style.top = "55%";
    dot.style.setProperty("--x", `${(Math.random() * 120) - 60}px`);
    dot.style.setProperty("--y", `${-40 - (Math.random() * 80)}px`);
    dot.style.animationDelay = `${i * 20}ms`;
    cardEl.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove(), { once: true });
  }
}

function addCustomExercise() {
  const name = el.exerciseInput.value.trim();
  if (!name) return;

  state.exercises.push(createExercise(name, state.lastSetCount || 3));
  el.exerciseInput.value = "";
  saveWorkout();
  renderExercises();
  openInfoDialog(`"${name}" was added to the bottom of your exercise list.`);
}

function openInfoDialog(message) {
  el.infoMessage.textContent = message;
  el.infoOverlay.classList.add("open");
  el.infoOverlay.setAttribute("aria-hidden", "false");
  el.infoOkBtn.focus();
}

function closeInfoDialog() {
  el.infoOverlay.classList.remove("open");
  el.infoOverlay.setAttribute("aria-hidden", "true");
}

function updateStats() {
  const total = state.exercises.length;
  const completed = state.exercises.filter((item) => item.done).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  el.completedCount.textContent = String(completed);
  el.totalCount.textContent = String(total);
  el.progressPercent.textContent = `${progress}%`;
  el.progressFill.style.width = `${progress}%`;
}

function saveWorkout() {
  localStorage.setItem(STORAGE_KEYS.workout, JSON.stringify(state.exercises));
}

function loadNotes() {
  state.notes = localStorage.getItem(STORAGE_KEYS.notes) || "";
  el.notesInput.value = state.notes;
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEYS.notes, state.notes);
}

function saveSessionToHistory() {
  state.exercises.forEach((exercise) => {
    exercise.setRows.forEach((row) => updateRememberedWeight(exercise.name, row.weight));
  });

  const history = getHistory();
  const completed = state.exercises.filter((item) => item.done).length;
  const volume = computeSessionVolume(state.exercises);
  const now = new Date();
  const entry = {
    id: crypto.randomUUID(),
    date: now.toLocaleString(),
    dateISO: now.toISOString(),
    template: el.templateSelect.value,
    completed,
    total: state.exercises.length,
    volume,
    notes: state.notes.trim(),
    exercises: state.exercises.map((item) => ({
      name: item.name,
      muscleGroups: [...normalizeMuscleGroups(item.muscleGroups, item.name)],
      done: item.done,
      sets: item.setRows.length,
      setRows: item.setRows.map((row) => ({ reps: row.reps, weight: row.weight, done: row.done }))
    }))
  };

  history.unshift(entry);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, 60)));
  renderHistory();
}

function computeSessionVolume(exercises) {
  return Math.round(
    exercises.reduce((sum, item) => {
      if (!item.done) return sum;
      const setVolume = (item.setRows || []).reduce(
        (setSum, row) => setSum + (row.weight * row.reps),
        0
      );
      return sum + setVolume;
    }, 0)
  );
}

function getHistory() {
  const saved = localStorage.getItem(STORAGE_KEYS.history);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not parse history.", error);
    return [];
  }
}

function renderHistory() {
  const history = getHistory();
  el.historyList.innerHTML = "";

  if (!history.length) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "No saved sessions yet. Save your workout when you finish.";
    el.historyList.appendChild(li);
  } else {
    history.slice(0, 20).forEach((entry) => {
      const li = document.createElement("li");
      li.className = "history-item";
      const volume = Number(entry.volume) || 0;
      li.innerHTML = `
        <strong>${escapeHtml(entry.template || "Workout")}</strong>
        <div class="history-meta">${escapeHtml(entry.date || "Unknown date")}</div>
        <div>${Number(entry.completed) || 0}/${Number(entry.total) || 0} exercises completed</div>
        <div class="history-meta">Volume: ${volume.toLocaleString()} kg</div>
        ${entry.notes ? `<div class="history-meta">Notes: ${escapeHtml(entry.notes)}</div>` : ""}
      `;
      el.historyList.appendChild(li);
    });
  }

  renderAnalytics(history);
}

function renderAnalytics(history) {
  const streakData = calculateStreaks(history);
  el.streakCount.textContent = `${streakData.current} days`;
  el.bestStreakCount.textContent = `${streakData.best} days`;
  renderPrList(history);
  renderVolumeChart(history);
  renderConsistencyChart(history);
}

function renderPrList(history) {
  const prs = calculatePrs(history);
  el.prList.innerHTML = "";
  const prEntries = Object.entries(prs).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!prEntries.length) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "Complete weighted exercises and save sessions to generate PRs.";
    el.prList.appendChild(li);
    return;
  }

  prEntries.forEach(([name, oneRm]) => {
    const li = document.createElement("li");
    li.className = "pr-item";
    li.textContent = `${name}: ${oneRm.toFixed(1)} kg`;
    el.prList.appendChild(li);
  });
}

function calculatePrs(history) {
  const best = {};
  history.forEach((entry) => {
    if (!Array.isArray(entry.exercises)) return;
    entry.exercises.forEach((exercise) => {
      if (!exercise.done) return;
      const rows = Array.isArray(exercise.setRows)
        ? exercise.setRows
        : [];
      const fallbackRows = rows.length
        ? rows
        : [{ reps: Number(exercise.reps) || 0, weight: Number(exercise.weight) || 0 }];
      fallbackRows.forEach((row) => {
        const reps = Number(row.reps) || 0;
        const weight = Number(row.weight) || 0;
        if (weight <= 0 || reps <= 0) return;
        const oneRm = weight * (1 + (reps / 30));
        if (!best[exercise.name] || oneRm > best[exercise.name]) {
          best[exercise.name] = oneRm;
        }
      });
    });
  });
  return best;
}

function calculateStreaks(history) {
  const days = Array.from(
    new Set(
      history
        .map((entry) => toDayKey(entry.dateISO || entry.date))
        .filter(Boolean)
    )
  ).sort();

  if (!days.length) return { current: 0, best: 0 };

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (diffDays(days[i - 1], days[i]) === 1) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  let current = 1;
  for (let i = days.length - 1; i > 0; i -= 1) {
    if (diffDays(days[i - 1], days[i]) === 1) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, best };
}

function renderVolumeChart(history) {
  const data = history
    .slice(0, 10)
    .reverse()
    .map((entry, index) => ({
      label: `S${index + 1}`,
      value: Number(entry.volume) || 0
    }));
  drawBarChart(el.volumeChart, data, "#ff4d2d");
}

function renderConsistencyChart(history) {
  const dayCounts = {};
  history.forEach((entry) => {
    const key = toDayKey(entry.dateISO || entry.date);
    if (!key) return;
    dayCounts[key] = (dayCounts[key] || 0) + 1;
  });

  const today = new Date();
  const points = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    points.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      value: dayCounts[key] || 0
    });
  }
  drawBarChart(el.consistencyChart, points, "#14b8a6");
}

function drawBarChart(canvas, data, color) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cssWidth = canvas.clientWidth || canvas.width;
  const cssHeight = canvas.clientHeight || canvas.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, cssWidth, cssHeight);
  const padding = { top: 14, right: 10, bottom: 30, left: 30 };
  const innerW = cssWidth - padding.left - padding.right;
  const innerH = cssHeight - padding.top - padding.bottom;

  ctx.strokeStyle = "rgba(15, 23, 42, 0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + innerH);
  ctx.lineTo(padding.left + innerW, padding.top + innerH);
  ctx.stroke();

  if (!data.length) return;
  const maxValue = Math.max(...data.map((x) => x.value), 1);
  const barGap = 6;
  const barW = Math.max(4, (innerW / data.length) - barGap);
  ctx.fillStyle = color;

  data.forEach((point, i) => {
    const ratio = point.value / maxValue;
    const h = Math.max(2, innerH * ratio);
    const x = padding.left + i * (barW + barGap) + (barGap / 2);
    const y = padding.top + innerH - h;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x, y, barW, h);
    ctx.globalAlpha = 1;
  });

  ctx.fillStyle = "#536079";
  ctx.font = "11px Space Grotesk";
  ctx.textAlign = "right";
  ctx.fillText(String(maxValue), padding.left - 5, padding.top + 6);
  ctx.fillText("0", padding.left - 5, padding.top + innerH + 4);
}

function toDayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function diffDays(a, b) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / oneDay);
}

function formatSeconds(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function startInlineRest(exerciseId, resetDuration = false) {
  const remaining = resetDuration || !state.inlineRest
    ? state.timerSeconds
    : state.inlineRest.remaining;
  state.inlineRest = {
    exerciseId,
    remaining,
    running: true
  };
  runInlineRestInterval();
  updateInlineRestBadge();
}

function runInlineRestInterval() {
  if (state.inlineRestInterval) {
    clearInterval(state.inlineRestInterval);
    state.inlineRestInterval = null;
  }
  if (!state.inlineRest || !state.inlineRest.running) return;

  state.inlineRestInterval = setInterval(() => {
    if (!state.inlineRest || !state.inlineRest.running) return;
    state.inlineRest.remaining -= 1;
    if (state.inlineRest.remaining <= 0) {
      clearInlineRest();
      renderExercises();
      return;
    }
    updateInlineRestBadge();
  }, 1000);
}

function pauseInlineRest() {
  if (!state.inlineRest) return;
  state.inlineRest.running = false;
  if (state.inlineRestInterval) {
    clearInterval(state.inlineRestInterval);
    state.inlineRestInterval = null;
  }
}

function resumeInlineRest() {
  if (!state.inlineRest) return;
  state.inlineRest.running = true;
  runInlineRestInterval();
}

function resetInlineRest() {
  if (!state.inlineRest) return;
  state.inlineRest.remaining = state.timerSeconds;
  state.inlineRest.running = true;
  runInlineRestInterval();
  updateInlineRestBadge();
}

function updateInlineRestBadge() {
  if (!state.inlineRest) return;
  const readout = document.querySelector(`[data-rest-readout="${state.inlineRest.exerciseId}"]`);
  if (!readout) {
    const stillExists = state.exercises.some((item) => item.id === state.inlineRest.exerciseId);
    if (!stillExists) {
      clearInlineRest();
      return;
    }
    renderExercises();
    return;
  }
  readout.textContent = formatSeconds(state.inlineRest.remaining);
}

function clearInlineRest() {
  if (state.inlineRestInterval) {
    clearInterval(state.inlineRestInterval);
    state.inlineRestInterval = null;
  }
  state.inlineRest = null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

init();
