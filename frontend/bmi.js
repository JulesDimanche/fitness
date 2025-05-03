const form = document.getElementById("bmiForm");
const resultDiv = document.getElementById("result");

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

      resultDiv.innerHTML = `
        <h3>Your Result</h3>
        <p><strong>BMI:</strong> ${result.bmi}</p>
        <p><strong>Status:</strong> ${result.status}</p>
        <p><strong>Maintenance Calories:</strong> ${result.Maintanence_calories} kcal/day</p>
        <p><strong>Recommended Calories:</strong> ${result.required_calories} kcal/day</p>
        <p><strong>Suggestion:</strong> ${result.suggestion}</p>
        <p><strong>Weekly Change:</strong> ${result.weekly_change} kg/week</p>
      `;

      if (result.weekly_progress?.length > 0) {
        resultDiv.innerHTML += "<h4>Weekly Progress</h4>";
        result.weekly_progress.forEach(entry => {
          resultDiv.innerHTML += `<p>Week ${entry.week}: ${entry.weight} kg , ${entry.required_calories} kcal/day</p>`;
        });
      }

    } catch (err) {
      resultDiv.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
    }
  });
}
