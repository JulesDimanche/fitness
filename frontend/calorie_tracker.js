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
let selectedServingGrams = null;  // Store the serving grams when food is selected

// Toggle between quantity and grams input based on selection
inputTypeSelect.addEventListener("change", function () {
    const selectedValue = inputTypeSelect.value;

    if (selectedValue === "quantity") {
        quantityInput.style.display = "block";
        quantityInput.disabled = false;

        gramsInput.style.display = "none";
        gramsInput.disabled = true;

        gramsInput.value = "";  // Reset grams input
    } else {
        gramsInput.style.display = "block";
        gramsInput.disabled = false;

        quantityInput.style.display = "none";
        quantityInput.disabled = true;

        quantityInput.value = "";  // Reset quantity input
    }

    updateTotalGrams();  // Keep this to refresh the display
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
        const response = await fetch(`http://localhost:8000/food-suggestions?query=${query}`, {
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

                        updateTotalGrams();  // Update the total grams immediately
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

// Update total grams when the user enters a quantity or grams
function updateTotalGrams() {
    if (selectedServingGrams === null) return;

    const quantity = parseFloat(quantityInput.value);
    const grams = parseFloat(gramsInput.value);

    if (activeInput === "quantity" && !isNaN(quantity)) {
        const total = quantity * selectedServingGrams;
        gramsInput.value = total.toFixed(2); // Update grams based on quantity
        totalGramsInfo.textContent = `Total: ${total.toFixed(2)}g`;
    } else if (activeInput === "grams" && !isNaN(grams)) {
        const quantityEquivalent = grams / selectedServingGrams;
        quantityInput.value = quantityEquivalent.toFixed(2); // Update quantity based on grams
        totalGramsInfo.textContent = `Total: ${grams.toFixed(2)}g`;
    }
}

// Listen for changes in quantity or grams and update the total grams
quantityInput.addEventListener("input", () => {
    activeInput = "quantity";
    updateTotalGrams();
});

gramsInput.addEventListener("input", () => {
    activeInput = "grams";
    updateTotalGrams();
});

// Handle form submission
document.getElementById("logFoodForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const resultText = document.getElementById("result");
    const food_name = foodInput.value;
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

    const data = {
        food_name: food_name,
        quantity: quantity
    };

    try {
        const response = await fetch("http://localhost:8000/log-food", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            resultText.textContent = "✅ " + result.message;
        } else {
            resultText.textContent = "❌ Error: " + result.detail;
        }
    } catch (err) {
        resultText.textContent = "❌ Network error or server down";
    }
});

// Load food logs for the selected date
loadLogsButton.addEventListener("click", async function (e) {
    e.preventDefault();

    const viewDate = viewDateInput.value;  // Get the selected date
    console.log("Selected Date:", viewDate);

    if (!viewDate) {
        foodLogsDisplay.innerHTML = "❌ Please select a date.";
        return;
    }

    try {
        const response = await fetch(`http://localhost:8000/food-log?log_date=${viewDate}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const logs = await response.json();

        if (response.ok && logs.length > 0) {
            foodLogsDisplay.innerHTML = logs.map(log =>
                `<div class="log-item">${log.food_name} - Quantity: ${log.quantity}g</div>`
            ).join("");
        } else {
            foodLogsDisplay.innerHTML = "No food logs found for this date.";
        }
    } catch (err) {
        foodLogsDisplay.innerHTML = "❌ Error fetching food logs.";
    }
});

// Handle "Use Today's Date" checkbox logic
useTodayCheckbox.addEventListener("change", function () {
    if (useTodayCheckbox.checked) {
        customDateInput.value = ""; // Clear custom date if "Use today's date" is checked
        customDateInput.disabled = true; // Disable custom date input
    } else {
        customDateInput.disabled = false; // Enable custom date input if unchecked
    }
});
