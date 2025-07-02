document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("username");
  const nameSpan = document.getElementById("user-name");
  if (nameSpan) nameSpan.textContent = username || "Unknown User";

  // correct logout button ID
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      alert("You have been logged out.");
      window.location.href = "login.html";
    });
  }
});
async function loadRecentWorkouts() {
  const list = document.getElementById("recent-workouts");
  list.innerHTML = "<li>Loading...</li>";

  try {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:8000/recent_workouts", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const workouts = await response.json();
    list.innerHTML = "";

    if (workouts.length === 0) {
      list.innerHTML = "<li>No workouts yet.</li>";
      return;
    }

    workouts.forEach(workout => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${workout.emoji}</span> ${workout.name} - ${workout.duration} min`;
      list.appendChild(li);
    });

  } catch (err) {
    console.error("Failed to load workouts", err);
    list.innerHTML = "<li>Error loading workouts.</li>";
  }
}

// Call it
loadRecentWorkouts();
