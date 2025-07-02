// RPG Notification System
const showNotification = (message, isSuccess) => {
  const notification = document.createElement('div');
  notification.className = `rpg-notification ${isSuccess ? 'success' : 'error'}`;

  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${isSuccess ? '✓' : '✗'}</span>
      <p>${message}</p>
      ${isSuccess ? '<div class="progress-bar"><div class="progress-fill"></div></div>' : ''}
    </div>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, isSuccess ? 3000 : 5000);
};

// Stats Animation System
const animateStats = (stats) => {
  const statElements = {
    strength: document.querySelector('[data-stat="strength"]'),
    endurance: document.querySelector('[data-stat="endurance"]'),
  };

  Object.entries(stats).forEach(([stat, value]) => {
    if (statElements[stat]) {
      let current = 0;
      const interval = setInterval(() => {
        if (current >= value) clearInterval(interval);
        statElements[stat].style.width = `${current}%`;
        current++;
      }, 20);
    }
  });
};

// Enhanced Login Handler
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'AUTHENTICATING...';
    submitBtn.disabled = true;

    const data = Object.fromEntries(new FormData(loginForm).entries());

    try {
      const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.access_token) {
        // 🔑 Save token
        localStorage.setItem("token", result.access_token);
        // 🔑 Save username (new)
        if (result.username) {
          localStorage.setItem("username", result.username);
          console.log("Username stored:", result.username);
        }

        showNotification("ACCESS GRANTED! Loading stats...", true);

        // Show stats preview if the element exists
        setTimeout(() => {
          const statsPreview = document.getElementById('statsPreview');
          if (statsPreview) statsPreview.classList.remove('hidden');

          animateStats({ strength: 75, endurance: 60 }); // demo values
          fetchDailyQuest();
        }, 1500);

        // Redirect after delay
        setTimeout(() => {
          window.location.href = "profile.html";
        }, 5000);
      } else {
        showNotification(`ACCESS DENIED: ${result.detail || "Invalid credentials"}`, false);
      }
    } catch (err) {
      console.error("Login error:", err);
      showNotification("CONNECTION FAILED: Try again later", false);
    } finally {
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
    }
  });
}

// Daily Quest Loader
async function fetchDailyQuest() {
  try {
    const response = await fetch('/api/daily-quest');
    const quest = await response.json();

    const desc = document.getElementById('questDescription');
    const xp   = document.getElementById('questXp');
    const box  = document.getElementById('dailyQuest');

    if (desc) desc.textContent = quest.description;
    if (xp)   xp.textContent   = quest.xp_reward;
    if (box)  box.classList.remove('hidden');

  } catch (err) {
    console.error("Quest loading error:", err);
  }
}
