// workout.js - Complete Workout Tracker Application
document.addEventListener('DOMContentLoaded', function() {
    initWorkoutTracker();
});

// Global variables
let exerciseCount = 0;
const token = localStorage.getItem("token");

// Main initialization function
function initWorkoutTracker() {
    // Check authentication
    if (!token) {
        redirectToLogin();
        return;
    }

    // Create first exercise
    addExercise();

    // Add exercise button
    const addExerciseBtn = createButton('+ Add Exercise', ['btn', 'add-exercise-btn']);
    addExerciseBtn.addEventListener('click', addExercise);
    document.querySelector('form').insertBefore(
        addExerciseBtn, 
        document.getElementById('exercises-container')
    );

    // Form submission handler
    document.getElementById("workout-form").addEventListener("submit", handleFormSubmit);
}

// Exercise creation and management
function addExercise() {
    const exerciseDiv = createExerciseContainer();
    const nameGroup = createExerciseNameInput(exerciseDiv.id);
    const setsContainer = createSetsContainer();

    exerciseDiv.appendChild(nameGroup);
    exerciseDiv.appendChild(setsContainer);
    exerciseDiv.appendChild(createAddSetButton(exerciseDiv.id, setsContainer));

    document.getElementById('exercises-container').appendChild(exerciseDiv);
}

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

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("workout-date");

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().slice(0, 10);

  // Set date input default value to today
  dateInput.value = today;

  // Load workouts for today on page load
  loadWorkoutsByDate(today);

  // Listen for changes and load accordingly
  dateInput.addEventListener("change", (e) => {
    const selectedDate = e.target.value;
    if (selectedDate) {
      loadWorkoutsByDate(selectedDate);
    }
  });
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
                list.appendChild(listItem);
            });

            exBlock.appendChild(list);
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
        showAlert("Please add at least one exercise with sets");
        return;
    }

    try {
        await submitWorkoutData(exercises);
    } catch (error) {
        console.error('Error:', error);
        showAlert("Failed to save workout");
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
    exerciseDiv.querySelectorAll(".new-sets .set").forEach((setDiv, idx) => {
        const repsInput = setDiv.querySelector("input[name='reps']");
        const weightInput = setDiv.querySelector("input[name='weight']");

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