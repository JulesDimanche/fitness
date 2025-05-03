const token = localStorage.getItem("token");
const foodInput = document.getElementById("food_name");  // Input field for the food name
const suggestionsDiv = document.getElementById("suggestions");  // Suggestions container

// Event listener for when the user types in the food input field
foodInput.addEventListener("input", async function () {
    const query = foodInput.value.trim();  // Remove leading/trailing whitespace

    // Don't query if the input is too short (less than 2 characters)
    if (query.length < 2) {
        suggestionsDiv.innerHTML = ""; // Clear any existing suggestions
        suggestionsDiv.style.display = "none"; // Hide suggestions div
        return;
    }

    try {
        // Send a GET request to the backend to get food suggestions
        const response = await fetch(`http://localhost:8000/food-suggestions?query=${query}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        // Check if the response is successful
        if (response.ok) {
            const suggestions = await response.json();  // Parse the JSON response

            suggestionsDiv.innerHTML = "";  // Clear any previous suggestions

            if (suggestions.length > 0) {
                suggestionsDiv.style.display = "block";  // Show the suggestions div
                // Generate HTML for each food suggestion
                suggestionsDiv.innerHTML = suggestions.map(food => 
                    `<div class="suggestion-item" data-food="${food.food_item}">${food.food_item}</div>`
                ).join("");

                // Add event listeners to suggestion items for selection
                document.querySelectorAll(".suggestion-item").forEach(item => {
                    item.addEventListener("click", function () {
                        // When a suggestion is clicked, set the input field value
                        foodInput.value = item.getAttribute("data-food");
                        suggestionsDiv.innerHTML = ""; // Clear suggestions after selection
                        suggestionsDiv.style.display = "none"; // Hide suggestions
                    });
                });
            } else {
                suggestionsDiv.style.display = "none"; // Hide suggestions if no results
            }
        } else {
            suggestionsDiv.innerHTML = "Error fetching suggestions.";
            suggestionsDiv.style.display = "none"; // Hide suggestions if there's an error
        }
    } catch (err) {
        suggestionsDiv.innerHTML = "Network error.";
        suggestionsDiv.style.display = "none"; // Hide suggestions if there's a network error
    }
});

// Handle form submission for logging food
document.getElementById("logFoodForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const food_name = document.getElementById("food_name").value;
    const quantity = parseFloat(document.getElementById("quantity").value);

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

        const resultText = document.getElementById("result");

        if (response.ok) {
            const result = await response.json();
            resultText.textContent = "✅ " + result.message;
        } else {
            const error = await response.json();
            resultText.textContent = "❌ Error: " + error.detail;
        }
    } catch (err) {
        document.getElementById("result").textContent = "❌ Network error or server down";
    }
});
