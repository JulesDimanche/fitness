const form = document.getElementById("bmiForm");
const resultDiv = document.getElementById("result");
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    alert("You have been logged out.");
    window.location.href = "login.html";
  });
}

if (form) {
  const goalSelect = document.querySelector('select[name="goal"]');
  const paceContainer = document.getElementById("pace-container");
  const paceSelect = document.getElementById("pace");

  if (goalSelect) {
    goalSelect.addEventListener("change", () => {
      if (goalSelect.value === "gain" || goalSelect.value === "lose") {
        paceContainer.style.display = "block";
        paceSelect.required = true;
      } else {
        paceContainer.style.display = "none";
        paceSelect.required = false;
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in first.");
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    data.weight = parseFloat(data.weight);
    data.height = parseFloat(data.height);
    data.age = parseInt(data.age);
    data.target_weight = parseFloat(data.target_weight);
    data.target_duration = parseFloat(data.target_duration);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error("Server error");

      const result = await response.json();

      const calorieDiff = Math.abs(result.required_calories - result.Maintanence_calories);
      let warningMsg = "";
      if (calorieDiff > 700) {
        if (result.required_calories > result.Maintanence_calories) {
          warningMsg = `<p style="color: #ff4d4d; font-weight: bold; text-shadow: 0 0 5px #ff1a1a;">
            ⚠️ Your surplus is high — gaining too fast may increase fat gain. Consider reducing pace.
          </p>`;
        } else {
          warningMsg = `<p style="color: #ff4d4d; font-weight: bold; text-shadow: 0 0 5px #ff1a1a;">
            ⚠️ Your deficit is high — losing too fast may affect muscle mass. Consider slowing down.
          </p>`;
        }
      }

      resultDiv.innerHTML = `
        <h3>Your Result</h3>
        <p><strong>BMI:</strong> ${result.bmi}</p>
        <p><strong>Status:</strong> ${result.status}</p>
        <p><strong>Maintenance Calories:</strong> ${result.Maintanence_calories} kcal/day</p>
        <p><strong>Recommended Calories:</strong> ${result.required_calories} kcal/day</p>
        ${warningMsg}
        <p><strong>Suggestion:</strong> ${result.suggestion}</p>
        <p><strong>Weekly Change:</strong> ${result.weekly_change} kg/week</p>
      `;

      if (result.weekly_progress?.length > 0) {
        resultDiv.innerHTML += "<h4>Weekly Progress</h4>";
        result.weekly_progress.forEach(entry => {
          resultDiv.innerHTML += `<p>Week ${entry.week}: ${entry.weight} kg , ${entry.required_calories} kcal/day</p>`;
        });
      }

      // Add Save to Profile Button
      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Save to Profile";
      saveBtn.className = "btn btn-save";
      saveBtn.style.marginTop = "1rem";
const payload = {
  weekly_progress: result.weekly_progress,
  start_weight: parseFloat(data.weight),
  target_weight: parseFloat(data.target_weight),
};

      saveBtn.addEventListener("click", async () => {
        try {
          const saveResponse = await fetch("http://localhost:8000/save_analysis", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          if (!saveResponse.ok) throw new Error("Failed to save result.");
          alert("Your analysis has been saved.");
        } catch (err) {
          alert("Error saving result: " + err.message);
        }
      });

      resultDiv.appendChild(saveBtn);

    } catch (err) {
      resultDiv.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
    }
  });
}
