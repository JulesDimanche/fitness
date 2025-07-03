// workout.js - Complete Workout Tracker Application
document.addEventListener('DOMContentLoaded', function() {
    initWorkoutTracker();
});

// Global variables
let exerciseCount = 0;
const token = localStorage.getItem("token");
let currentTemplateId = null;

document.getElementById("logout-btn").addEventListener("click", () => {
  if (confirm("Logout from your session?")) {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  }
});

// Main initialization function
function initWorkoutTracker() {
    if (!token) {
        redirectToLogin();
        return;
    }
    /*document.getElementById("workout-date").addEventListener("change", () => {
    // Reset routine state
    currentTemplateId = null;
    document.getElementById("routine-name").value = "";
    document.getElementById("template-selector").value = ""; // reset dropdown
    document.querySelector("input[name='routine-mode'][value='new']").checked = true;

    // Clear and start fresh
    document.getElementById("exercises-container").innerHTML = "";
    addExercise();
});*/
    // Set up routine mode toggle
    document.querySelectorAll("input[name='routine-mode']").forEach(radio => {
        radio.addEventListener("change", (e) => {
            const isTemplate = e.target.value === "template";
            document.getElementById("template-select-group").style.display = isTemplate ? "block" : "none";
            document.getElementById("update-template-btn").style.display = isTemplate ? "inline-block" : "none";
            if (!isTemplate) {
                currentTemplateId = null;
                document.getElementById("routine-name").value = "";
                document.getElementById("exercises-container").innerHTML = "";
                addExercise();
            }
        });
    });

    document.getElementById("workout-form").addEventListener("submit", handleFormSubmit);
    document.getElementById("save-template-btn").addEventListener("click", handleSaveTemplate);
    document.getElementById("update-template-btn").addEventListener("click", handleUpdateTemplate);

    populateTemplateDropdown();
    const templateSelector = document.getElementById("template-selector");
templateSelector.addEventListener("change", (e) => {
    const templateId = e.target.value;
    console.log("🔄 Loading template ID:", templateId);
    if (templateId) {
        loadTemplate(templateId);
    }
});
    addExercise();
    document.getElementById("add-exercise-btn").addEventListener("click", addExercise);

}
async function handleUpdateTemplate() {
    if (!currentTemplateId) {
        alert("No template loaded.");
        return;
    }

    const name = document.getElementById("routine-name").value.trim();
    if (!name) return alert("Routine name is required.");

    const exercises = collectExerciseData();
    if (exercises.length === 0) return alert("Add at least one exercise with sets.");

    const res = await fetch(`http://localhost:8000/workout_templates/${currentTemplateId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, exercises })
    });

    if (res.ok) {
        alert("Template updated.");
        populateTemplateDropdown();
    } else {
        alert("Failed to update template.");
    }
}


async function handleSaveTemplate(e) {
  e.preventDefault();
  console.log("💾 Save Template button clicked");

  const templateName = document.getElementById("routine-name").value.trim();
  if (!templateName) {
    alert("Please enter a name for your routine.");
    return;
  }

  const exercises = [];
  const exerciseBlocks = document.querySelectorAll(".exercise");
  console.log(`Found ${exerciseBlocks.length} exercise blocks`);

  exerciseBlocks.forEach((exerciseBlock, i) => {
    const exerciseNameInput = exerciseBlock.querySelector(".exercise-name-input");
    const exerciseName = exerciseNameInput ? exerciseNameInput.value : null;

    if (!exerciseName) {
      console.warn(`Exercise ${i + 1} has no name. Skipping.`);
      return;
    }

    const sets = [];
    const setRows = exerciseBlock.querySelectorAll(".set");

    setRows.forEach((setRow, index) => {
      const repsInput = setRow.querySelector(".reps-input");
      const weightInput = setRow.querySelector(".weight-input");

      if (!repsInput || !weightInput) return;

      const reps = parseInt(repsInput.value);
      const weight = parseFloat(weightInput.value);

      console.log(`➤ Found set with reps: ${repsInput?.value}, weight: ${weightInput?.value}`);

      if (!isNaN(reps) && !isNaN(weight)) {
        sets.push({ set_number: index + 1, reps, weight });
      } else {
        console.warn(`Invalid set: reps=${reps}, weight=${weight}`);
      }
    });

    if (sets.length > 0) {
      exercises.push({ exercise_name: exerciseName, sets });
    } else {
      console.warn(`Exercise "${exerciseName}" has no valid sets. Skipping.`);
    }
  });

  const payload = {
    name: templateName,
    exercises: exercises
  };

  console.log("📦 Final payload to send:", JSON.stringify(payload, null, 2));

  if (!token) {
    console.error("❌ No token found. Cannot send request.");
    return;
  }

  try {
    const url = currentTemplateId
      ? `http://localhost:8000/workout_templates/${currentTemplateId}`  // Update template
      : `http://localhost:8000/save_template`;                          // Create new

    const method = currentTemplateId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    console.log("📡 Response status:", response.status);

    if (!response.ok) {
      const err = await response.text();
      console.error("❌ Server responded with error:", err);
      alert("Failed to save template.");
      return;
    }

    const resData = await response.json();
    console.log("✅ Template saved successfully:", resData);
    alert(currentTemplateId ? "Template updated!" : "Template saved!");
    populateTemplateDropdown(); // Refresh the dropdown
  } catch (error) {
    console.error("🚨 Network or fetch error:", error);
    alert("Error saving template. Check console.");
  }
}


async function populateTemplateDropdown() {
    const dropdown = document.getElementById("template-selector");
    if (!dropdown) {
        console.warn("Dropdown element #template-selector not found.");
        return;
    }

    dropdown.innerHTML = `<option value="">-- Select a Template --</option>`;

    try {
        const res = await fetch("http://localhost:8000/workout_templates", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Failed to fetch templates:", errorText);
            alert("Failed to fetch templates.");
            return;
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
            console.error("Invalid template data format:", data);
            alert("Invalid template data received.");
            return;
        }

        data.forEach(template => {
            const option = document.createElement("option");
            option.value = template.id;
            option.textContent = template.name;
            dropdown.appendChild(option);
        });

        console.log("✅ Templates loaded:", data);
    } catch (error) {
        console.error("🚨 Error fetching templates:", error);
        alert("Could not load templates. Please try again later.");
    }
}
async function loadTemplate(templateId) {
    console.log("🔄 Loading template ID:", templateId);

    if (!templateId) {
        console.warn("No template ID provided.");
        return;
    }

    try {
        const res = await fetch(`http://localhost:8000/workout_templates/${templateId}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("❌ Failed to load template:", err);
            alert("Failed to load template.");
            return;
        }

        const data = await res.json();

        // Set state
        currentTemplateId = templateId;
        document.getElementById("routine-name").value = data.name || "";

        const exercisesContainer = document.getElementById("exercises-container");
        exercisesContainer.innerHTML = ""; // Clear previous content

        if (!Array.isArray(data.exercises) || data.exercises.length === 0) {
            console.warn("⚠️ No exercises found in this template.");
            return;
        }

        data.exercises.forEach((exercise, exIdx) => {
            const exerciseDiv = createExerciseContainer();
            const nameGroup = createExerciseNameInput(exerciseDiv.id);
            const setsContainer = createSetsContainer();

            nameGroup.querySelector("input").value = exercise.exercise_name;

            if (Array.isArray(exercise.sets)) {
                const newSetsContent = setsContainer.querySelector('.new-sets-content');
                exercise.sets.forEach((set, i) => {
                    const setDiv = createSetInput(set.set_number, set.reps, set.weight);
                    newSetsContent.appendChild(setDiv);
                });
                updateSetNumbers(newSetsContent);

            }

            exerciseDiv.appendChild(nameGroup);
            exerciseDiv.appendChild(setsContainer);
            exerciseDiv.appendChild(createAddSetButton(exerciseDiv.id, setsContainer));

            exercisesContainer.appendChild(exerciseDiv);
        });

        console.log("✅ Template loaded:", data.name);
    } catch (error) {
        console.error("🚨 Error loading template:", error);
        alert("An error occurred while loading the template.");
    }
}


function createSetInput(setNumber = 1, reps = "", weight = "") {
    const setDiv = document.createElement("div");
    setDiv.classList.add("set");

    const repsInput = document.createElement("input");
    repsInput.type = "number";
    repsInput.placeholder = "Reps";
    repsInput.value = reps;
    repsInput.classList.add("reps-input");

    const weightInput = document.createElement("input");
    weightInput.type = "number";
    weightInput.placeholder = "Weight (kg)";
    weightInput.value = weight;
    weightInput.classList.add("weight-input");

    setDiv.appendChild(repsInput);
    setDiv.appendChild(weightInput);

    return setDiv;
}
function updateSetNumbers(container) {
    const sets = container.querySelectorAll('.set');
    sets.forEach((setDiv, idx) => {
        const label = setDiv.querySelector('span');
        if (label) label.textContent = `Set ${idx + 1}:`;
    });
}
// Exercise creation and management
function addExercise() {
    const exerciseDiv = createExerciseContainer();
    const nameGroup = createExerciseNameInput(exerciseDiv.id);
    const setsContainer = createSetsContainer();

    exerciseDiv.appendChild(nameGroup);
    exerciseDiv.appendChild(setsContainer);
    exerciseDiv.appendChild(createAddSetButton(exerciseDiv.id, setsContainer));
    exerciseDiv.appendChild(createRemoveExerciseButton(exerciseDiv));


    document.getElementById('exercises-container').appendChild(exerciseDiv);
}
document.getElementById("delete-template-btn").addEventListener("click", async () => {
  const templateId = document.getElementById("template-selector").value;
  if (!templateId) {
    alert("Please select a template to delete.");
    return;
  }

  const confirmDelete = confirm("Are you sure you want to delete this template?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`http://localhost:8000/workout_templates/${templateId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.ok) {
      alert("Template deleted.");
      currentTemplateId = null;
      document.getElementById("template-selector").value = "";
      document.getElementById("routine-name").value = "";
      document.getElementById("exercises-container").innerHTML = "";
      addExercise();
      populateTemplateDropdown();
    } else {
      const error = await res.text();
      alert("Failed to delete template:\n" + error);
    }
  } catch (err) {
    console.error("Error deleting template:", err);
    alert("An error occurred while deleting the template.");
  }
});

function createExerciseContainer() {
    const exerciseDiv = document.createElement('div');
    exerciseDiv.classList.add('exercise');
    exerciseDiv.id = `exercise-${exerciseCount++}`;
    return exerciseDiv;
}

function createExerciseNameInput(exerciseId) {
    const nameGroup = document.createElement('div');
    nameGroup.classList.add('exercise-name-group');

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.name = 'exercise_name';
    nameInput.placeholder = 'Search for an exercise...';
    nameInput.autocomplete = 'off';
    nameInput.classList.add('exercise-name-input');
    nameInput.setAttribute('aria-autocomplete', 'list');

    const datalistId = `exercise-suggestions-${exerciseCount}`;
    const datalist = document.createElement('datalist');
    datalist.id = datalistId;
    nameInput.setAttribute('list', datalistId);
    nameInput.setAttribute('aria-controls', datalistId);

    nameGroup.appendChild(nameInput);
    nameGroup.appendChild(datalist);

    setupExerciseAutocomplete(nameInput, datalist);
    setupPreviousSetsListener(nameInput, exerciseId);

    return nameGroup;
}

function createSetsContainer() {
    const setsContainer = document.createElement('div');
    setsContainer.classList.add('sets-container');
    
    setsContainer.appendChild(createPreviousSetsDisplay());
    setsContainer.appendChild(createNewSetsDisplay());

    return setsContainer;
}

function createPreviousSetsDisplay() {
    const previousSetsDiv = document.createElement('div');
    previousSetsDiv.classList.add('previous-sets');
    previousSetsDiv.innerHTML = `
        <h4>Last Performance</h4>
        <div class="previous-content">
            <div class="empty-state">Enter exercise name to see previous sets</div>
        </div>
    `;
    return previousSetsDiv;
}

function createNewSetsDisplay() {
    const newSetsDiv = document.createElement('div');
    newSetsDiv.classList.add('new-sets');
    newSetsDiv.innerHTML = `
        <h4>Today's Workout</h4>
        <div class="new-sets-content"></div>
    `;
    return newSetsDiv;
}

function createAddSetButton(exerciseId, setsContainer) {
    const addSetButton = createButton('+ Add Set', ['btn', 'add-set-btn']);
    addSetButton.addEventListener('click', () => {
        addNewSet(setsContainer.querySelector('.new-sets-content'), exerciseId);
    });
    return addSetButton;
}
function createRemoveExerciseButton(exerciseDiv) {
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "❌ Remove Exercise";
  removeBtn.classList.add("btn", "remove-exercise-btn");

  removeBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete this exercise?")) {
      exerciseDiv.remove();
    }
  });

  return removeBtn;
}

// Autocomplete functionality
function setupExerciseAutocomplete(inputElement, datalistElement) {
    let suggestTimer;

    inputElement.addEventListener('input', async function() {
        clearTimeout(suggestTimer);
        const query = this.value.trim();
        
        if (query.length < 2) {
            datalistElement.innerHTML = '';
            return;
        }

        datalistElement.innerHTML = '<option value="">Loading...</option>';

        suggestTimer = setTimeout(async () => {
            try {
                const suggestions = await fetchSuggestions(query);
                updateDatalist(datalistElement, suggestions);
            } catch (error) {
                console.error("Error:", error);
                showDatalistError(datalistElement);
            }
        }, 300);
    });
}

async function fetchSuggestions(query) {
    try {
        const response = await fetch(`http://localhost:8000/search_exercises?query=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        throw error;
    }
}

function updateDatalist(datalistElement, suggestions) {
    datalistElement.innerHTML = '';

    if (suggestions?.length > 0) {
        suggestions.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.exercise_name;
            option.textContent = `${exercise.exercise_name} (${exercise.muscle_group})`;
            datalistElement.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No matches found";
        datalistElement.appendChild(option);
    }
}

function showDatalistError(datalistElement) {
    datalistElement.innerHTML = '<option value="">Error loading suggestions</option>';
}

// Sets management
function addNewSet(setsContent, exerciseId) {
    const setDiv = document.createElement('div');
    setDiv.classList.add('set');

    const setNumber = setsContent.children.length + 1;
    const setNumberSpan = document.createElement('span');
    setNumberSpan.textContent = `Set ${setNumber}:`;

    const repsInput = createNumberInput('reps', 'Reps', 1);
    const weightInput = createNumberInput('weight', 'Weight', 0, 0.5);

    const comparisonSpan = document.createElement('span');
    comparisonSpan.classList.add('comparison');
    comparisonSpan.id = `comparison-${exerciseId}-${setNumber}`;

    setDiv.appendChild(setNumberSpan);
    setDiv.appendChild(repsInput);
    setDiv.appendChild(document.createTextNode(' × '));
    setDiv.appendChild(weightInput);
    setDiv.appendChild(comparisonSpan);

    setsContent.appendChild(setDiv);

    [repsInput, weightInput].forEach(input => {
        input.addEventListener('input', () => updateComparison(exerciseId, setNumber));
    });
}

function createNumberInput(name, placeholder, min, step = 1) {
    const input = document.createElement('input');
    input.type = 'number';
    input.name = name;
    input.placeholder = placeholder;
    input.min = min.toString();
    if (step) input.step = step.toString();
    input.classList.add(`${name}-input`); 
    return input;
}

// Previous sets functionality
function setupPreviousSetsListener(inputElement, exerciseId) {
    inputElement.addEventListener('input', debounce(async () => {
        const exerciseName = inputElement.value.trim();
        if (exerciseName) {
            const previousSetsDiv = document.querySelector(`#${exerciseId} .previous-sets`);
            await fetchPreviousSets(exerciseName, previousSetsDiv, exerciseId);
        }
    }, 500));
}

async function fetchPreviousSets(exerciseName, previousSetsDiv, exerciseId) {
    try {
        const response = await fetch(`http://localhost:8000/previous_exercise/${encodeURIComponent(exerciseName)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const previousContent = previousSetsDiv.querySelector('.previous-content');
        
        if (response.ok) {
            const data = await response.json();
            displayPreviousSets(data, previousContent, exerciseId);
        } else {
            showPreviousSetsError(previousContent);
        }
    } catch (error) {
        console.error('Error:', error);
        showPreviousSetsError(previousSetsDiv.querySelector('.previous-content'));
    }
}

function displayPreviousSets(data, container, exerciseId) {
    if (data.sets?.length > 0) {
        const date = new Date(data.date).toLocaleDateString();
        let html = `<div class="previous-header"><strong>${date}</strong></div><div class="previous-sets-list">`;
        data.sets.forEach((set, index) => {
            html += `<div class="previous-set"><span>Set ${index + 1}:</span><span>${set.reps} reps × ${set.weight} kg</span></div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
        document.getElementById(exerciseId).dataset.previousSets = JSON.stringify(data.sets);
    } else {
        container.innerHTML = '<div class="empty-state">No previous records</div>';
    }
}

function showPreviousSetsError(container) {
    container.innerHTML = '<div class="empty-state">Error loading data</div>';
}

// Comparison functionality
function updateComparison(exerciseId, setNumber) {
    const exerciseDiv = document.getElementById(exerciseId);
    const previousSets = JSON.parse(exerciseDiv.dataset.previousSets || '[]');
    const comparisonSpan = document.getElementById(`comparison-${exerciseId}-${setNumber}`);
    
    if (!previousSets || previousSets.length < setNumber) {
        clearComparison(comparisonSpan);
        return;
    }

    const currentSetDiv = exerciseDiv.querySelector(`.new-sets-content .set:nth-child(${setNumber})`);
    const repsInput = currentSetDiv.querySelector("input[name='reps']");
    const weightInput = currentSetDiv.querySelector("input[name='weight']");

    if (!repsInput.value || !weightInput.value) {
        clearComparison(comparisonSpan);
        return;
    }

    const comparison = calculateComparison(
        parseInt(repsInput.value),
        parseFloat(weightInput.value),
        previousSets[setNumber - 1]
    );

    updateComparisonDisplay(comparisonSpan, comparison.result, comparison.class);
}

function calculateComparison(currentReps, currentWeight, previousSet) {
    if (!previousSet) return { result: '', class: '' };

    const previousVolume = previousSet.reps * previousSet.weight;
    const currentVolume = currentReps * currentWeight;

    if (currentVolume > previousVolume) {
        return {
            result: `↑ ${Math.round((currentVolume/previousVolume - 1) * 100)}%`,
            class: 'better'
        };
    } else if (currentVolume < previousVolume) {
        return {
            result: `↓ ${Math.round((1 - currentVolume/previousVolume) * 100)}%`,
            class: 'worse'
        };
    }
    return {
        result: '→ Same',
        class: 'same'
    };
}

function updateComparisonDisplay(element, text, className) {
    element.textContent = text;
    element.className = `comparison ${className}`;
}

function clearComparison(element) {
    element.textContent = '';
    element.className = 'comparison';
}

document.addEventListener("DOMContentLoaded", async () => {
  selectedWorkoutDate = new Date().toISOString().split("T")[0];
  await createWorkoutDateButtons();
  await loadWorkoutsByDate(selectedWorkoutDate);
});




async function loadWorkoutsByDate(date) {
    const response = await fetch(`http://localhost:8000/workouts_by_date?date=${date}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();
    const container = document.getElementById("workout-log-container");
    container.innerHTML = ""; // Clear previous

    if (data.exercises?.length > 0) {
        data.exercises.forEach(exercise => {
            const exBlock = document.createElement("div");
            exBlock.classList.add("exercise-log");

            const title = document.createElement("h4");
            title.textContent = exercise.exercise_name;
            exBlock.appendChild(title);

            const list = document.createElement("ul");
const deleteExerciseBtn = document.createElement("button");
deleteExerciseBtn.textContent = "Delete Exercise";
deleteExerciseBtn.classList.add("delete-exercise-btn");

deleteExerciseBtn.addEventListener("click", async () => {
    if (!confirm(`Delete entire "${exercise.exercise_name}" from this day?`)) return;

    const url = new URL("http://localhost:8000/delete_exercise");
    url.searchParams.append("exercise_name", exercise.exercise_name);
    url.searchParams.append("date", date);

    const res = await fetch(url, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (res.ok) {
  alert("Exercise deleted successfully.");

  // 1. Check if this was the last exercise
  const check = await fetch(`http://localhost:8000/workouts_by_date?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await check.json();
  const hasExercises = data.exercises && data.exercises.length > 0;

  // 🧼 Step 2: If no exercises remain, remove glow manually
  await loadWorkoutsByDate(date);

// 🔁 Refresh the logged dates AFTER UI update
await fetchWorkoutLoggedDates();
await createWorkoutDateButtons();


// ✅ Then manually update the .has-log class
const btn = document.querySelector(`.date-button[data-date="${date}"]`);
if (btn) {
  if (workoutLoggedDates.has(date)) {
    btn.classList.add("has-log");
  } else {
    btn.classList.remove("has-log");
  }
}
 // ✅ Refresh glow
}
 else {
        const err = await res.json();
        alert("Failed to delete: " + err.detail);
    }
});
            exercise.sets.forEach((set, index) => {
                const listItem = document.createElement("li");

                // Input fields (initially disabled)
                const repsInput = document.createElement("input");
                repsInput.type = "number";
                repsInput.value = set.reps;
                repsInput.disabled = true;

                const weightInput = document.createElement("input");
                weightInput.type = "number";
                weightInput.value = set.weight;
                weightInput.disabled = true;

                // Edit button
                const editBtn = document.createElement("button");
                editBtn.textContent = "Edit";
                editBtn.classList.add("edit-btn");
                editBtn.addEventListener("click", () => {
                    repsInput.disabled = false;
                    weightInput.disabled = false;
                });

                // Save button
                const saveBtn = document.createElement("button");
                saveBtn.textContent = "Save";
                saveBtn.classList.add("save-btn");
                saveBtn.addEventListener("click", async () => {
                    const newReps = parseInt(repsInput.value);
                    const newWeight = parseFloat(weightInput.value);

                    const payload = {
                        exercise_name: exercise.exercise_name,
                        set_number: index + 1,
                        new_reps: newReps,
                        new_weight: newWeight,
                        date: date
                    };

                    const updateResponse = await fetch("http://localhost:8000/update_workout_set", {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });

                    const result = await updateResponse.json();
                    if (updateResponse.ok) {
                        repsInput.disabled = true;
                        weightInput.disabled = true;
                        alert("Workout set updated!");
                    } else {
                        alert(result.detail || "Update failed");
                    }
                });

                // Append everything
                listItem.appendChild(document.createTextNode(`Set ${index + 1}: `));
                listItem.appendChild(repsInput);
                listItem.appendChild(document.createTextNode(" reps × "));
                listItem.appendChild(weightInput);
                listItem.appendChild(document.createTextNode(" kg "));
                listItem.appendChild(editBtn);
                listItem.appendChild(saveBtn);

                // Delete button
                const deleteBtn = document.createElement("button");
deleteBtn.textContent = "Delete";
deleteBtn.classList.add("delete-btn");

deleteBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to delete this set?")) return;

    const url = new URL("http://localhost:8000/delete_workout_set");
    url.searchParams.append("set_id", set.id); // ✅ Send set ID


    const res = await fetch(url, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (res.ok) {
        alert("Set deleted successfully");
        loadWorkoutsByDate(date); 
        await fetchWorkoutLoggedDates();
await createWorkoutDateButtons();
// Refresh the displayed workout data
    } else {
        const err = await res.json();
        alert("Error deleting set: " + err.detail);
    }
});


                listItem.appendChild(deleteBtn);


// Add this button to the exercise log

                list.appendChild(listItem);
            });

            exBlock.appendChild(list);
            exBlock.appendChild(deleteExerciseBtn);
            container.appendChild(exBlock);
        });
    } else {
        container.innerHTML = "<div class='empty-state'>No workouts logged on this date.</div>";
    }
}


// Form handling
async function handleFormSubmit(event) {
    event.preventDefault();

    const exercises = collectExerciseData();
    if (exercises.length === 0) {
        alert("Please add at least one exercise with sets");
        return;
    }

const date = selectedWorkoutDate;
    const payload = { date, exercises };

    const res = await fetch("http://localhost:8000/workout_sessions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert("Workout logged!");
await loadWorkoutsByDate(date);
await createWorkoutDateButtons();  // ✅ Update glow after logging
        //document.getElementById("workout-date").value = date;

    } else {
        alert("Error logging workout");
    }
}

function collectExerciseData() {
    const exercises = [];
    document.querySelectorAll(".exercise").forEach(div => {
        const exerciseName = div.querySelector("input[name='exercise_name']").value;
        const sets = collectSetsData(div);

        if (exerciseName && sets.length > 0) {
            exercises.push({
                exercise_name: exerciseName,
                sets: sets
            });
        }
    });
    return exercises;
}

function collectSetsData(exerciseDiv) {
    const sets = [];
    exerciseDiv.querySelectorAll(".set").forEach((setDiv, idx) => {
        const repsInput = setDiv.querySelector("input[name='reps']") 
                       || setDiv.querySelector(".reps-input");
        const weightInput = setDiv.querySelector("input[name='weight']") 
                         || setDiv.querySelector(".weight-input");

        if (repsInput?.value && weightInput?.value) {
            sets.push({
                set_number: idx + 1,
                reps: parseInt(repsInput.value),
                weight: parseFloat(weightInput.value)
            });
        }
    });
    return sets;
}

async function submitWorkoutData(exercises) {
    const selectedDate = document.getElementById('workout-date').value;

    const response = await fetch('http://localhost:8000/workout_sessions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            exercises: exercises,
            date: selectedDate  // <-- Use selected date from date picker
        })
    });

    const result = await response.json();
    if (response.ok) {
        showAlert("Workout saved successfully!", true);
    } else {
        showAlert(result.detail || "Error saving workout");
    }
}


// Utility functions
function createButton(text, classes = []) {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add(...classes);
    button.textContent = text;
    return button;
}

function showAlert(message, isSuccess = false) {
    alert(message); // Replace with a more sophisticated notification system if needed
    if (isSuccess) {
        location.reload();
    }
}

function redirectToLogin() {
    window.location.href = '/login';
}

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}
let workoutLoggedDates = new Set();
let selectedWorkoutDate = new Date().toISOString().split("T")[0]; // Default today

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

async function fetchWorkoutLoggedDates() {
  try {
    const res = await fetch("http://localhost:8000/workout_logged_dates", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const dates = await res.json();
      const normalized = dates.map(d => d.split(" ")[0]);
      workoutLoggedDates = new Set(normalized);
    }
  } catch (err) {
    console.error("Failed to fetch workout logged dates:", err);
  }
}

async function createWorkoutDateButtons() {
  const today = new Date();
  const dateSlider = document.getElementById("date-slider");
  const pastDays = 90;
  const futureDays = 7;
  dateSlider.innerHTML = "";

  await fetchWorkoutLoggedDates();

  let todayButton = null;

  for (let i = -pastDays; i <= futureDays; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = formatDate(date);

    const btn = document.createElement("div");
    btn.className = "date-button";
    btn.dataset.date = dateStr;
    btn.innerHTML = `
      <div>${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
      <div>${date.getDate()}</div>
    `;
    if (workoutLoggedDates.has(dateStr)) {
      btn.classList.add("has-log");
    }

    if (dateStr === selectedWorkoutDate) {
  btn.classList.add("active");
}


    btn.addEventListener("click", () => {
      document.querySelectorAll(".date-button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedWorkoutDate = dateStr;
      document.getElementById("exercises-container").innerHTML = "";
      addExercise();
      loadWorkoutsByDate(dateStr);
    });

    dateSlider.appendChild(btn);
  }

  const activeButton = document.querySelector(`.date-button[data-date="${selectedWorkoutDate}"]`);
if (activeButton) {
  setTimeout(() => {
    activeButton.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, 0);
}

}
