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
async function loadStats() {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:8000/user_stats", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const stats = await response.json();

  document.querySelector('[data-stat="health"]').textContent = stats.health;
  document.querySelector('[data-stat="agility"]').textContent = stats.agility;
  document.querySelector('[data-stat="endurance"]').textContent = stats.endurance;
  document.querySelector('[data-stat="strength"]').textContent = stats.strength;
}

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

    const days = await response.json();
    list.innerHTML = "";

    if (days.length === 0) {
      list.innerHTML = "<li>No workouts yet.</li>";
      return;
    }

    days.forEach(day => {
      const header = document.createElement("li");
      header.innerHTML = `<strong>📅 ${day.date}</strong>`;
      list.appendChild(header);

      day.sessions.forEach(session => {
        const li = document.createElement("li");
        const label = session.template
          ? `<em>${session.template}</em>`  // Show template if present
          : `${session.name} - ${session.duration} min`;
        li.innerHTML = `<span>${session.emoji}</span> ${label}`;
        list.appendChild(li);
      });
    });

  } catch (err) {
    console.error("Failed to load workouts", err);
    list.innerHTML = "<li>Error loading workouts.</li>";
  }
}

// Call it
loadRecentWorkouts();
loadStats(); 
