const token = localStorage.getItem("token");
const foodInput = document.getElementById("food_name");
const quantityInput = document.getElementById("quantity");
const gramsInput = document.getElementById("grams");
const suggestionsDiv = document.getElementById("suggestions");
const servingInfo = document.getElementById("serving_info");
const totalGramsInfo = document.getElementById("total_grams_info");
const inputTypeSelect = document.getElementById("input_type");
const useTodayCheckbox = document.getElementById("use_today");
const customDateInput = document.getElementById("custom_date");
const viewDateInput = document.getElementById("view_date");
const loadLogsButton = document.getElementById("load_logs");
const foodLogsDisplay = document.getElementById("food_logs_display");

let activeInput = null;
let selectedServingGrams = null;

// Initialize view date input with today's date
viewDateInput.valueAsDate = new Date();

// Toggle between quantity and grams input
inputTypeSelect.addEventListener("change", function () {
    const selectedValue = inputTypeSelect.value;

    if (selectedValue === "quantity") {
        quantityInput.style.display = "block";
        quantityInput.disabled = false;
        gramsInput.style.display = "none";
        gramsInput.disabled = true;
        gramsInput.value = "";
    } else {
        gramsInput.style.display = "block";
        gramsInput.disabled = false;
        quantityInput.style.display = "none";
        quantityInput.disabled = true;
        quantityInput.value = "";
    }
    updateTotalGrams();
});

// Autocomplete food suggestions
foodInput.addEventListener("input", async function () {
    const query = foodInput.value.trim();

    if (query.length < 2) {
        suggestionsDiv.innerHTML = "";
        suggestionsDiv.style.display = "none";
        servingInfo.textContent = "";
        totalGramsInfo.textContent = "";
        selectedServingGrams = null;
        return;
    }

    try {
        const response = await fetch(`http://localhost:8000/food-suggestions?query=${encodeURIComponent(query)}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            const suggestions = await response.json();
            suggestionsDiv.innerHTML = "";

            if (suggestions.length > 0) {
                suggestionsDiv.style.display = "block";
                suggestionsDiv.innerHTML = suggestions.map(food =>
                    `<div class="suggestion-item" data-food='${JSON.stringify(food)}'>${food.food_item}</div>`
                ).join("");

                document.querySelectorAll(".suggestion-item").forEach(item => {
                    item.addEventListener("click", function () {
                        const foodData = JSON.parse(item.getAttribute("data-food"));
                        foodInput.value = foodData.food_item;
                        servingInfo.textContent = `Serving: 1 ${foodData.serving_description} (${foodData.serving_grams}g)`;
                        selectedServingGrams = foodData.serving_grams;
                        updateTotalGrams();
                        suggestionsDiv.innerHTML = "";
                        suggestionsDiv.style.display = "none";
                    });
                });
            } else {
                suggestionsDiv.style.display = "none";
            }
        } else {
            suggestionsDiv.innerHTML = "❌ Error fetching suggestions.";
            suggestionsDiv.style.display = "none";
        }
    } catch (err) {
        suggestionsDiv.innerHTML = "❌ Network error.";
        suggestionsDiv.style.display = "none";
    }
});

// Update total grams calculations
function updateTotalGrams() {
    if (!selectedServingGrams) return;

    const quantity = parseFloat(quantityInput.value);
    const grams = parseFloat(gramsInput.value);

    if (activeInput === "quantity" && !isNaN(quantity)) {
        const total = quantity * selectedServingGrams;
        gramsInput.value = total.toFixed(2);
        totalGramsInfo.textContent = `Total: ${total.toFixed(2)}g`;
    } else if (activeInput === "grams" && !isNaN(grams)) {
        const quantityEquivalent = grams / selectedServingGrams;
        quantityInput.value = quantityEquivalent.toFixed(2);
        totalGramsInfo.textContent = `Total: ${grams.toFixed(2)}g`;
    }
}

quantityInput.addEventListener("input", () => {
    activeInput = "quantity";
    updateTotalGrams();
});

gramsInput.addEventListener("input", () => {
    activeInput = "grams";
    updateTotalGrams();
});

// Handle food log form submission
document.getElementById("logFoodForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    console.log("Form submitted!"); 
    const resultText = document.getElementById("result");
    const food_name = foodInput.value.trim();

    if (!food_name) {
        resultText.textContent = "❌ Please select a food item";
        return;
    }

    const quantityVal = parseFloat(quantityInput.value);
    const gramsVal = parseFloat(gramsInput.value);
    let quantity;

    if (!isNaN(quantityVal)) {
        quantity = quantityVal;
    } else if (!isNaN(gramsVal) && selectedServingGrams) {
        quantity = gramsVal / selectedServingGrams;
    } else {
        resultText.textContent = "❌ Please enter either quantity or grams.";
        return;
    }

    // Determine date to use
    const dateToUse = useTodayCheckbox.checked 
        ? new Date().toISOString().split("T")[0] 
        : customDateInput.value;

    try {
        const response = await fetch("http://localhost:8000/log-food", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                food_name: food_name,
                quantity: quantity,
                consumed_at: dateToUse
            })
        });

        const result = await response.json();
        resultText.textContent = response.ok
            ? "✅ " + result.message
            : "❌ Error: " + (result.detail || "Failed to log food");

        if (response.ok) {
            // Reset form
            foodInput.value = "";
            quantityInput.value = "";
            gramsInput.value = "";
            servingInfo.textContent = "";
            totalGramsInfo.textContent = "";
            selectedServingGrams = null;

            // Set viewDateInput to same date and auto-refresh logs
            console.log("View Date Input: ", viewDateInput.value); // Check if the date is correct
            viewDateInput.value = dateToUse;
            await loadAndRenderLogs(dateToUse);
        }
    } catch (err) {
        resultText.textContent = "❌ Network error or server down";
    }
});


// Load logs on button click
loadLogsButton.addEventListener("click", function (e) {
    e.preventDefault();
    const viewDate = viewDateInput.value;
    loadFoodLog(viewDate);
});

// Load logs when view date changes
viewDateInput.addEventListener("change", function () {
    const selectedDate = viewDateInput.value;
    loadFoodLog(selectedDate);
});

// Reusable food log loader
async function loadFoodLog(date) {
    if (!date) {
        foodLogsDisplay.innerHTML = "❌ Please select a date";
        return;
    }

    foodLogsDisplay.innerHTML = "⏳ Loading...";

    try {
        const encodedDate = encodeURIComponent(date);
        const response = await fetch(`http://localhost:8000/food-log?log_date=${encodedDate}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to fetch logs");
        }

        const logs = await response.json();
        renderFoodLogs(logs);
    } catch (err) {
        foodLogsDisplay.innerHTML = `❌ Error: ${err.message}`;
    }
}

// Render logs
function renderFoodLogs(logs) {
    if (logs.length === 0) {
        foodLogsDisplay.innerHTML = "No food entries found for this date.";
        return;
    }

    const totalCalories = logs.reduce((sum, log) => sum + log.calories, 0);
    const totalProtein = logs.reduce((sum, log) => sum + log.protein, 0);

    foodLogsDisplay.innerHTML = `
        <div class="log-summary">
            <p>Total Calories: ${totalCalories.toFixed(1)}</p>
            <p>Total Protein: ${totalProtein.toFixed(1)}g</p>
        </div>
        <table class="log-table">
            <thead>
                <tr>
                    <th>Food</th>
                    <th>Quantity</th>
                    <th>Calories</th>
                    <th>Protein</th>
                    <th>Carbs</th>
                    <th>Fat</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(log => `
                    <tr>
                        <td>${log.food_name}</td>
                        <td>${log.quantity.toFixed(1)}</td>
                        <td>${log.calories.toFixed(1)}</td>
                        <td>${log.protein.toFixed(1)}g</td>
                        <td>${log.carbs.toFixed(1)}g</td>
                        <td>${log.fat.toFixed(1)}g</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}
async function loadAndRenderLogs(date) {
    foodLogsDisplay.innerHTML = "⏳ Loading...";
    try {
        const encodedDate = encodeURIComponent(date);
        const response = await fetch(`http://localhost:8000/food-log?log_date=${encodedDate}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to fetch logs");
        }

        const logs = await response.json();
        renderFoodLogs(logs);
    } catch (err) {
        foodLogsDisplay.innerHTML = `❌ Error: ${err.message}`;
    }
}


// Handle "Use Today's Date" checkbox
useTodayCheckbox.addEventListener("change", function () {
    if (useTodayCheckbox.checked) {
        customDateInput.value = "";
        customDateInput.disabled = true;
        viewDateInput.valueAsDate = new Date();
    } else {
        customDateInput.disabled = false;
    }
});

// Load today's food log on page load
window.addEventListener("load", () => {
    const today = new Date().toISOString().split("T")[0];
    viewDateInput.value = today;
    loadAndRenderLogs(today);

});
