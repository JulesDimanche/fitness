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
  document.getElementById("hp-value").textContent = `${stats.current_hp}/1000`;
  document.getElementById("sp-value").textContent = `${stats.current_sp}/500`;
  document.getElementById("hp-bar").style.width = `${(stats.current_hp / 1000) * 100}%`;
  document.getElementById("sp-bar").style.width = `${(stats.current_sp / 500) * 100}%`;
  document.getElementById("level-value").textContent = stats.level;
  document.getElementById("title-value").textContent = stats.title;
  document.getElementById("fatigue-value").textContent = `${stats.fatigue}%`;
  
console.log("Stats received:", stats);
console.log("Level element:", document.getElementById("level-value"));

  
}

async function loadRecentWorkouts() {
  const container = document.getElementById("recent-workouts");
  container.innerHTML = "<p>Loading...</p>";

  try {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:8000/recent_workouts", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const days = await response.json();
    container.innerHTML = "";

    if (days.length === 0) {
      container.innerHTML = "<p>No workouts yet.</p>";
      return;
    }

    days.forEach(day => {
      const dayDiv = document.createElement("div");
      dayDiv.classList.add("day-log");

      const header = document.createElement("h3");
      header.innerHTML = `📅 ${day.date}`;
      dayDiv.appendChild(header);

      const ul = document.createElement("ul");

      day.sessions.forEach(session => {
        const li = document.createElement("li");
        const label = session.template
          ? `<em>${session.template}</em>`
          : `${session.name} - ${session.duration} min`;
        li.innerHTML = `<span>${session.emoji}</span> ${label}`;
        ul.appendChild(li);
      });

      dayDiv.appendChild(ul);
      container.appendChild(dayDiv);
    });

  } catch (err) {
    console.error("Failed to load workouts", err);
    container.innerHTML = "<p>Error loading workouts.</p>";
  }
}
// Call it
loadRecentWorkouts();
loadStats(); 
