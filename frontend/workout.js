let exerciseCount = 0;
const token = localStorage.getItem("token");
const exercisesContainer = document.getElementById("exercises-container");

// Initialize with one exercise
addExercise();

// Add button to add new exercises
const addExerciseBtn = document.createElement('button');
addExerciseBtn.type = 'button';
addExerciseBtn.classList.add('btn', 'add-exercise-btn');
addExerciseBtn.textContent = '+ Add Exercise';
addExerciseBtn.addEventListener('click', addExercise);
document.querySelector('form').insertBefore(addExerciseBtn, exercisesContainer);

function addExercise() {
    const exerciseDiv = document.createElement('div');
    exerciseDiv.classList.add('exercise');
    exerciseDiv.id = `exercise-${exerciseCount++}`;

    // Exercise name input with autocomplete
    const exerciseNameInput = document.createElement('input');
    exerciseNameInput.type = 'text';
    exerciseNameInput.name = 'exercise_name';
    exerciseNameInput.placeholder = 'Exercise Name (e.g., Bench Press)';
    exerciseNameInput.autocomplete = 'off';
    exerciseNameInput.classList.add('exercise-name');
    exerciseDiv.appendChild(exerciseNameInput);

    // Container for sets
    const setsContainer = document.createElement('div');
    setsContainer.classList.add('sets-container');

    // Previous sets box
    const previousSetsDiv = document.createElement('div');
    previousSetsDiv.classList.add('previous-sets');
    previousSetsDiv.innerHTML = `
        <h4>Last Performance</h4>
        <div class="previous-content">
            <div class="empty-state">Enter exercise name to see previous sets</div>
        </div>
    `;

    // New sets box
    const newSetsDiv = document.createElement('div');
    newSetsDiv.classList.add('new-sets');
    newSetsDiv.innerHTML = `
        <h4>Today's Workout</h4>
        <div class="new-sets-content"></div>
    `;

    // Add set button
    const addSetButton = document.createElement('button');
    addSetButton.type = 'button';
    addSetButton.innerText = '+ Add Set';
    addSetButton.classList.add('btn', 'add-set-btn');

    // Append elements
    setsContainer.appendChild(previousSetsDiv);
    setsContainer.appendChild(newSetsDiv);
    exerciseDiv.appendChild(setsContainer);
    exerciseDiv.appendChild(addSetButton);
    exercisesContainer.appendChild(exerciseDiv);

    // Handle add set
    addSetButton.addEventListener('click', () => {
        const newSetsContent = newSetsDiv.querySelector('.new-sets-content');
        const setDiv = document.createElement('div');
        setDiv.classList.add('set');

        const setNumber = newSetsContent.children.length + 1;
        const setNumberSpan = document.createElement('span');
        setNumberSpan.textContent = `Set ${setNumber}:`;
        setNumberSpan.style.minWidth = '50px';

        const repsInput = document.createElement('input');
        repsInput.type = 'number';
        repsInput.name = 'reps';
        repsInput.placeholder = 'Reps';
        repsInput.min = '1';

        const weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.name = 'weight';
        weightInput.placeholder = 'Weight';
        weightInput.step = '0.5';
        weightInput.min = '0';

        // Add comparison placeholder
        const comparisonSpan = document.createElement('span');
        comparisonSpan.classList.add('comparison');
        comparisonSpan.id = `comparison-${exerciseDiv.id}-${setNumber}`;

        setDiv.appendChild(setNumberSpan);
        setDiv.appendChild(repsInput);
        setDiv.appendChild(document.createTextNode(' × '));
        setDiv.appendChild(weightInput);
        setDiv.appendChild(comparisonSpan);

        newSetsContent.appendChild(setDiv);

        // Add real-time comparison when values change
        [repsInput, weightInput].forEach(input => {
            input.addEventListener('input', () => updateComparison(exerciseDiv.id, setNumber));
        });
    });

    // Fetch previous sets with debounce
    let debounceTimer;
    exerciseNameInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const exerciseName = exerciseNameInput.value.trim();
            if (exerciseName) {
                await fetchPreviousSets(exerciseName, previousSetsDiv, exerciseDiv.id);
            } else {
                previousSetsDiv.querySelector('.previous-content').innerHTML = 
                    '<div class="empty-state">Enter exercise name to see previous sets</div>';
            }
        }, 500);
    });
}

async function fetchPreviousSets(exerciseName, previousSetsDiv, exerciseId) {
    try {
        const response = await fetch(`http://localhost:8000/previous_exercise/${encodeURIComponent(exerciseName)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const previousContent = previousSetsDiv.querySelector('.previous-content');
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.sets && data.sets.length > 0) {
                const date = new Date(data.date).toLocaleDateString();
                let html = `
                    <div class="previous-header">
                        <strong>${date}</strong>
                    </div>
                    <div class="previous-sets-list">
                `;
                
                data.sets.forEach((set, index) => {
                    html += `
                        <div class="previous-set">
                            <span>Set ${index + 1}:</span>
                            <span>${set.reps} reps × ${set.weight} kg</span>
                        </div>
                    `;
                });
                
                html += `</div>`;
                previousContent.innerHTML = html;
                
                // Store previous sets data on the exercise div for comparison
                document.getElementById(exerciseId).dataset.previousSets = JSON.stringify(data.sets);
            } else {
                previousContent.innerHTML = '<div class="empty-state">No previous records for this exercise</div>';
            }
        } else {
            previousContent.innerHTML = '<div class="empty-state">No previous records found</div>';
        }
    } catch (error) {
        console.error('Error fetching previous sets:', error);
        previousSetsDiv.querySelector('.previous-content').innerHTML = 
            '<div class="empty-state">Error loading previous data</div>';
    }
}

function calculateTotalVolume(sets) {
    return sets.reduce((total, set) => total + (set.reps * set.weight), 0);
}

function updateComparison(exerciseId, setNumber) {
    const exerciseDiv = document.getElementById(exerciseId);
    const previousSets = JSON.parse(exerciseDiv.dataset.previousSets || '[]');
    const comparisonSpan = document.getElementById(`comparison-${exerciseId}-${setNumber}`);
    
    if (!previousSets || previousSets.length < setNumber) {
        comparisonSpan.textContent = '';
        comparisonSpan.className = 'comparison';
        return;
    }
    
    const currentSetDiv = exerciseDiv.querySelector(`.new-sets-content .set:nth-child(${setNumber})`);
    const repsInput = currentSetDiv.querySelector('input[name="reps"]');
    const weightInput = currentSetDiv.querySelector('input[name="weight"]');
    
    if (!repsInput.value || !weightInput.value) {
        comparisonSpan.textContent = '';
        comparisonSpan.className = 'comparison';
        return;
    }
    
    const currentReps = parseInt(repsInput.value);
    const currentWeight = parseFloat(weightInput.value);
    const previousSet = previousSets[setNumber - 1];
    
    if (!previousSet) return;
    
    const previousReps = previousSet.reps;
    const previousWeight = previousSet.weight;
    
    const currentVolume = currentReps * currentWeight;
    const previousVolume = previousReps * previousWeight;
    
    let comparisonText = '';
    let comparisonClass = '';
    
    if (currentVolume > previousVolume) {
        comparisonText = `↑ ${Math.round((currentVolume/previousVolume - 1) * 100)}%`;
        comparisonClass = 'better';
    } else if (currentVolume < previousVolume) {
        comparisonText = `↓ ${Math.round((1 - currentVolume/previousVolume) * 100)}%`;
        comparisonClass = 'worse';
    } else {
        comparisonText = '→ Same';
        comparisonClass = 'same';
    }
    
    comparisonSpan.textContent = comparisonText;
    comparisonSpan.className = `comparison ${comparisonClass}`;
}

document.getElementById("workout-form").addEventListener("submit", async function(event) {
    event.preventDefault();

    const exercises = [];
    const exerciseDivs = document.querySelectorAll(".exercise");

    exerciseDivs.forEach(div => {
        const exerciseName = div.querySelector("input[name='exercise_name']").value;
        const sets = [];
        
        div.querySelectorAll(".new-sets .set").forEach((setDiv, idx) => {
            const repsInput = setDiv.querySelector("input[name='reps']");
            const weightInput = setDiv.querySelector("input[name='weight']");
            
            if (repsInput && weightInput && repsInput.value && weightInput.value) {
                sets.push({
                    set_number: idx + 1,
                    reps: parseInt(repsInput.value),
                    weight: parseFloat(weightInput.value)
                });
            }
        });

        if (exerciseName && sets.length > 0) {
            exercises.push({
                exercise_name: exerciseName,
                sets: sets
            });
        }
    });

    if (exercises.length === 0) {
        alert("Please add at least one exercise with sets");
        return;
    }

    const workoutData = {
        exercises: exercises,
        date: new Date().toISOString()
    };

    try {
        const response = await fetch('http://localhost:8000/workout_sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(workoutData)
        });

        const result = await response.json();
        if (response.ok) {
            alert("Workout saved successfully!");
            location.reload();
        } else {
            alert(result.detail || "Error saving workout");
        }
    } catch (error) {
        console.error('Error:', error);
        alert("Failed to save workout");
    }
});