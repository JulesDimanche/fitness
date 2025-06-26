const token = localStorage.getItem("token");
const foodInput = document.getElementById("food_name");
const quantityInput = document.getElementById("quantity");
const gramsInput = document.getElementById("grams");
const suggestionsDiv = document.getElementById("suggestions");
const servingInfo = document.getElementById("serving_info");
const totalGramsInfo = document.getElementById("total_grams_info");
const inputTypeSelect = document.getElementById("input_type");
//const useTodayCheckbox = document.getElementById("use_today");
//const customDateInput = document.getElementById("custom_date");
//const viewDateInput = document.getElementById("view_date");
//const loadLogsButton = document.getElementById("load_logs");
const foodLogsDisplay = document.getElementById("food_logs_display");

let activeInput = null;
let selectedServingGrams = null;

// Initialize view date input with today's date
//viewDateInput.valueAsDate = new Date();
document.getElementById("logout-btn").addEventListener("click", () => {
  if (confirm("Logout from your session?")) {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  }
});
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
    const isEditMode = document.querySelector('.edit-btn.save-mode');
    if (isEditMode) return;
    const resultText = document.getElementById("result");
    const food_name = foodInput.value.trim();
    const mealTime = document.getElementById("meal_time").value;

    /*if (!food_name) {
        resultText.textContent = "❌ Please select a food item";
        return;
    }*/

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
    const dateToUse = selectedSliderDate;

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
                consumed_at: dateToUse,
                meal_time: mealTime
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
            
            document.querySelector("#logFoodForm button[type='submit']").textContent = "Log Food";
            await loadAndRenderLogs(selectedSliderDate);


            // Set viewDateInput to same date and auto-refresh logs
            //console.log("View Date Input: ", viewDateInput.value); // Check if the date is correct
            selectedSliderDate = dateToUse;
            //await loadAndRenderLogs(selectedSliderDate);
            const todayBtn = document.querySelector(`.date-button[data-date="${selectedSliderDate}"]`);
            //console.log("Highlighting date button:", selectedSliderDate, todayBtn);
            if (todayBtn) todayBtn.classList.add("has-log");


        }
    } catch (err) {
        resultText.textContent = "❌ Network error or server down";
    }
});


// Load logs on button click
/*loadLogsButton.addEventListener("click", function (e) {
    e.preventDefault();
    const viewDate = selectedSliderDate;
    loadFoodLog(viewDate);
});

// Load logs when view date changes
viewDateInput.addEventListener("change", function () {
    const selectedDate = viewDateInput.value;
    loadFoodLog(selectedDate);
});*/

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

    const mealOrder = ["Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack"];
    const grouped = {};

    // Group by meal time
    logs.forEach(log => {
        const meal = log.meal_time || "Other";
        if (!grouped[meal]) grouped[meal] = [];
        grouped[meal].push(log);
    });

    // Calculate totals
    const totalCalories = logs.reduce((sum, log) => sum + log.calories, 0);
    const totalProtein = logs.reduce((sum, log) => sum + log.protein, 0);
    const totalFat = logs.reduce((sum, log) => sum + log.fat, 0);
    document.getElementById("target-macros").innerHTML = `
  <div class="target-box">
    Target Calories
    <span>${currentTarget.calories} kcal</span>
  </div>
  <div class="target-box">
    Target Protein
    <span>${currentTarget.protein} g</span>
  </div>
  <div class="target-box">
    Target Fat
    <span>${currentTarget.fat} g</span>
  </div>
`;

renderMacroCircles(
  { calories: totalCalories, protein: totalProtein, fat: totalFat },
  currentTarget
);


    let html = `
    <div class="nutrition-totals">
        <div class="total-box"><strong>Total Calories:</strong> <span>${totalCalories.toFixed(1)}</span> kcal</div>
        <div class="total-box"><strong>Total Protein:</strong> <span>${totalProtein.toFixed(1)}</span> g</div>
        <div class="total-box"><strong>Total Fat:</strong> <span>${totalFat.toFixed(1)}</span> g</div>
    </div>
`;


    // Render meals in correct order
    mealOrder.forEach(meal => {
        if (grouped[meal]) {
            html += `<h3>${meal}</h3>`;
            html += `
                <table class="log-table">
                    <thead>
                        <tr>
                            <th>Food</th>
                            <th>Quantity</th>
                            <th>Grams</th>
                            <th>Calories</th>
                            <th>Protein</th>
                            <th>Carbs</th>
                            <th>Fat</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${grouped[meal].map(log => `
                            <tr id="log-row-${log.id}">
                                <td class="editable" data-key="food_name">${log.food_name}</td>
                                <td class="editable" data-key="quantity">${log.quantity.toFixed(1)}</td>
                                <td class="editable" data-key="grams">${log.grams.toFixed(1)}</td>
                                <td>${log.calories.toFixed(1)}</td>
                                <td>${log.protein.toFixed(1)}g</td>
                                <td>${log.carbs.toFixed(1)}g</td>
                                <td>${log.fat.toFixed(1)}g</td>
                                <td><button class="edit-btn">Edit</button></td>
                                <td><button class="delete-btn">Delete</button></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            `;
        }
    });

    // Optionally render "Other" group
    if (grouped["Other"]) {
        html += `<h3>Other</h3>`;
        html += `
            <table class="log-table">
                <thead>
                    <tr>
                        <th>Food</th>
                        <th>Quantity</th>
                        <th>Grams</th>
                        <th>Calories</th>
                        <th>Protein</th>
                        <th>Carbs</th>
                        <th>Fat</th>
                        <th>Actions</th> 
                    </tr>
                </thead>
                <tbody>
                    ${grouped["Other"].map(log => `
                            <tr id="log-row-${log.id}">
                            <td class="editable" data-key="food_name">${log.food_name}</td>
                            <td class="editable" data-key="quantity">${log.quantity.toFixed(1)}</td>
                            <td class="editable" data-key="grams">${log.grams.toFixed(1)}</td>
                            <td>${log.calories.toFixed(1)}</td>
                            <td>${log.protein.toFixed(1)}g</td>
                            <td>${log.carbs.toFixed(1)}g</td>
                            <td>${log.fat.toFixed(1)}g</td>
                            <td><button class="edit-btn">Edit</button></td>
                            <td><button class="delete-btn">Delete</button></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
    }

    foodLogsDisplay.innerHTML = html;

    // Add edit functionality to each button
    document.querySelectorAll(".edit-btn").forEach(button => {
        button.addEventListener("click", function () {
            const row = this.closest("tr");
        console.log("Row ID: ", row.id);  // Check the actual ID here

        if (!row.id) {
            console.error("No row ID found!");
            return;
        }
        const logId = row.id.split('-')[2];  // Get the log ID from the row
        if (!logId) {
            console.error("Failed to extract log ID");
            return;
        }  // Debug log

            if (!logId) {
                console.error("Error: Log ID is undefined or missing.");
                alert("Error: Unable to retrieve log ID.");
                return;
            }
            // Toggle Edit/Save
            if (this.textContent === "Edit") {
                row.querySelectorAll(".editable").forEach(cell => {
                    const value = cell.textContent;
                    const key = cell.getAttribute("data-key");
                    cell.innerHTML = `<input type="text" value="${value}" data-key="${key}">`;
                });
                this.textContent = "Save";
            } else {
                // Collect edited values
                const updatedData = {};
                row.querySelectorAll("input").forEach(input => {
                    const key = input.getAttribute("data-key");
                    updatedData[key] = input.value;
                });

                console.log("Updated Data: ", updatedData);  // Debug log

                // Send the updated data to the backend
                fetch(`http://localhost:8000/update-food-log/${logId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedData)
                })
                .then(res => res.json().then(data => ({ ok: res.ok, data })))
                .then(({ ok, data }) => {
                    if (ok) {
                        // Reload logs after saving
const viewDate = selectedSliderDate;
                        loadAndRenderLogs(viewDate);
                    } else {
                        alert("❌ Update failed: " + (data.detail || "Unknown error"));
                    }
                })
                .catch(err => {
                    alert("❌ Network error while updating");
                });

                this.textContent = "Edit";  // Reset button to Edit after saving
            }
        });
    });
    
    
    // Add delete functionality
    document.querySelectorAll(".delete-btn").forEach(button => {
        button.addEventListener("click", function() {
            const row = this.closest("tr");
            const logId = row.id.split('-')[2];

            if (!logId) {
                alert("❌ Failed to identify log ID for deletion.");
                return;
            }

            if (!confirm("Are you sure you want to delete this food log?")) return;

            fetch(`http://localhost:8000/delete-food-log/${logId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(async ({ ok, data }) => {
    if (ok) {
        alert("✅ Food log deleted successfully");

        const viewDate = selectedSliderDate;
        await loadAndRenderLogs(viewDate);

        const dateBtn = document.querySelector(`.date-button[data-date="${viewDate}"]`);

        // ✅ Optimistically remove class immediately
        if (dateBtn) {
            dateBtn.classList.remove("has-log");
        }

        // 🔁 Confirm with server if any logs still exist
        const res = await fetch(`http://localhost:8000/food-log?log_date=${viewDate}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
            const logs = await res.json();
            if (logs.length > 0 && dateBtn) {
                // ✅ Still logs left → re-add glow
                dateBtn.classList.add("has-log");
            }
        }
    } else {
        alert("❌ Deletion failed: " + (data.detail || "Unknown error"));
    }
})

            .catch(err => {
                alert("❌ Network error while deleting");
            });
        });
    });
}
function renderMacroCircles(total, target) {
  const circleHTML = (label, totalVal, targetVal, color) => {
    const percent = Math.min(100, (totalVal / targetVal) * 100).toFixed(1);
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return `
      <div class="macro-circle">
        <svg width="120" height="120">
          <circle cx="60" cy="60" r="${radius}" stroke="#333" stroke-width="12" fill="none"/>
          <circle cx="60" cy="60" r="${radius}" stroke="${color}" stroke-width="12" fill="none"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" 
            stroke-linecap="round" transform="rotate(-90 60 60)" />
          <text x="60" y="60" text-anchor="middle" dy="0.3em" fill="#fff" font-size="18">
            ${percent}%
          </text>
        </svg>
        <div class="macro-label">${label}<br><span>${totalVal}/${targetVal}</span></div>
      </div>
    `;
  };

  document.getElementById("macro-circles").innerHTML = `
    ${circleHTML("Calories", total.calories, target.calories, "#0ff")}
    ${circleHTML("Protein", total.protein, target.protein, "#9f0")}
    ${circleHTML("Fat", total.fat, target.fat, "#f09")}
  `;
}

let currentTarget = { calories: 0, protein: 0, fat: 0 };

async function fetchTodayTarget() {
  try {
    const res = await fetch("http://localhost:8000/today-target", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      currentTarget = {
        calories: data.calories || 0,
        protein: data.protein || 0,
        fat: data.fat || 0
      };
    } else if (res.status === 404) {
      currentTarget = { calories: 0, protein: 0, fat: 0 };
    }
  } catch (err) {
    console.error("Failed to fetch today's target:", err);
  }
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
        await fetchTodayTarget();
        renderFoodLogs(logs);
    } catch (err) {
        foodLogsDisplay.innerHTML = `❌ Error: ${err.message}`;
    }
}
let loggedDates = new Set();

async function fetchLoggedDates() {
  try {
    const res = await fetch("http://localhost:8000/logged-dates", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const dates = await res.json();
      const normalized = dates.map(d => d.split(" ")[0]);

      loggedDates = new Set(normalized); // store for use in the slider
    } else {
      console.warn("Failed to fetch logged dates");
    }
  } catch (err) {
    console.error("Error fetching logged dates:", err);
  }
}

function editFoodLog(logId) {
    const row = document.getElementById(`log-row-${logId}`);
    const cells = row.querySelectorAll("td");

    // Get current values
    const food = cells[0].textContent;
    const quantity = parseFloat(cells[1].textContent);
    const grams = parseFloat(cells[2].textContent);

    // Replace with input fields
    cells[0].innerHTML = `<input type="text" value="${food}" id="edit-food-${logId}">`;
    cells[1].innerHTML = `<input type="number" value="${quantity}" step="0.1" id="edit-qty-${logId}">`;
    cells[2].innerHTML = `<input type="number" value="${grams}" step="0.1" id="edit-grams-${logId}">`;

    // Keep other cells (calories, protein, carbs, fat) as-is for now

    // Replace Edit button with Save
    cells[7].innerHTML = `<button onclick="saveFoodLog(${logId})">Save</button>`;
}

async function saveFoodLog(logId) {
    const food = document.getElementById(`edit-food-${logId}`).value;
    const quantity = parseFloat(document.getElementById(`edit-qty-${logId}`).value);
    const grams = parseFloat(document.getElementById(`edit-grams-${logId}`).value);

    console.log("Saving log", logId, food, quantity, grams);

    // TODO: send PATCH or PUT request to your server
    // Example:
    await fetch(`http://localhost:8000/update-food-log/${logId}`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            food_name: food,
            quantity: quantity,
            grams: grams
        })
    });
    

    // Reload log after saving
    const viewDate = document.getElementById("view_date").value;
    await loadAndRenderLogs(viewDate);
}



// Handle "Use Today's Date" checkbox
/*useTodayCheckbox.addEventListener("change", function () {
    if (useTodayCheckbox.checked) {
        customDateInput.value = "";
        customDateInput.disabled = true;
        viewDateInput.valueAsDate = new Date();
    } else {
        customDateInput.disabled = false;
    }
});*/
 const dateSlider = document.getElementById("date-slider");
  let selectedSliderDate = new Date().toISOString().split("T")[0]; // Default today

  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  async function createDateButtons() {
  const today = new Date();
  const dateSlider = document.getElementById("date-slider");

  const pastDays = 90;   // approx 3 months
  const futureDays = 7;  // optional future scroll
  
  let todayButton = null;
  await fetchLoggedDates();
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
    if (loggedDates.has(dateStr)) {
      btn.classList.add("has-log");
    }

    if (i === 0) {btn.classList.add("active");
        todayButton = btn;
    }

    btn.addEventListener("click", () => {
      document.querySelectorAll(".date-button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedSliderDate = dateStr;
      loadAndRenderLogs(dateStr);
    });

    dateSlider.appendChild(btn);
  }
  if (todayButton) {
    setTimeout(() => {
      todayButton.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, 0);
  }
}


  createDateButtons();

// Load today's food log on page load
window.addEventListener("load",async () => {
    const today = new Date().toISOString().split("T")[0];
    selectedSliderDate = today;
    await createDateButtons();
await loadAndRenderLogs(selectedSliderDate);


});
 