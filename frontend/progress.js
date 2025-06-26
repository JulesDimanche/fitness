const token = localStorage.getItem("token");
const progressForm = document.getElementById("progressForm");
const feedbackContainer = document.getElementById("feedbackContainer");

document.getElementById("logout-btn").addEventListener("click", () => {
  if (confirm("Logout from your session?")) {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  }
});
if (progressForm) {
  progressForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in first.");
      return;
    }

    const data = {
      week: parseInt(document.getElementById("week").value),
      actual_weight: parseFloat(document.getElementById("actual_weight").value)
    };

    try {
      const response = await fetch("http://localhost:8000/submit-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (response.ok) {
  // Show feedback first
  const feedbackText =
    `Week ${result.week} - Expected: ${result.expected_weight}kg, ` +
    `You entered: ${result.actual_weight}kg\n` +
    `=> Suggestion: ${result.suggestion}`;

  document.getElementById("feedback").innerText = feedbackText;

  // 🔄 Then refresh the weekly plan table
  await loadWeeklyPlan();

  // ✅ Optionally re-set feedback to make sure it's not overridden
  document.getElementById("feedback").innerText = feedbackText;
}
 else {
        alert("Error: " + (result.detail || "Something went wrong"));
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("Request failed.");
    }
  });
}
async function loadWeeklyPlan() {
  const res = await fetch("http://localhost:8000/weekly-plan", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (res.ok) {
    const plan = await res.json();
    const tbody = document.getElementById("plan-table-body");
    tbody.innerHTML = "";

    plan.forEach(p => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>Week ${p.week}</td>
        <td>${p.target_weight.toFixed(1)} kg</td>
        <td>${p.calories} kcal</td>
        <td>${p.protein} g</td>
        <td>${p.fat} g</td>
      `;
      tbody.appendChild(row);
    });
  } else {
    console.error("Failed to load weekly plan");
  }
}
window.addEventListener("load", async() => {
  await loadWeeklyPlan();
});

