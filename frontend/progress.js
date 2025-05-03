const token = localStorage.getItem("token");
const progressForm = document.getElementById("progressForm");
const feedbackContainer = document.getElementById("feedbackContainer");


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
        document.getElementById("feedback").innerText =
          `Week ${result.week} - Expected: ${result.expected_weight}kg, ` +
          `You entered: ${result.actual_weight}kg\n` +
          `=> Suggestion: ${result.suggestion}`;
      } else {
        alert("Error: " + (result.detail || "Something went wrong"));
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("Request failed.");
    }
  });
}
