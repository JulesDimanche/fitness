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
  
  // Auto-remove notification
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
    // Add other stats here
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
    
    // Show loading state
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
        localStorage.setItem("token", result.access_token);
        
        // Show RPG-style success notification
        showNotification("ACCESS GRANTED! Loading stats...", true);
        
        // Display stats preview (replace with actual data from your API)
        setTimeout(() => {
          document.getElementById('statsPreview').classList.remove('hidden');
          animateStats({
            strength: 75,  // Example values - replace with real data
            endurance: 60
          });
          
          // Fetch and display daily quest
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

// Daily Quest Loader (Example - implement your actual API endpoint)
async function fetchDailyQuest() {
  try {
    // Replace with your actual API call
    const response = await fetch('/api/daily-quest');
    const quest = await response.json();
    
    document.getElementById('questDescription').textContent = quest.description;
    document.getElementById('questXp').textContent = quest.xp_reward;
    document.getElementById('dailyQuest').classList.remove('hidden');
    
  } catch (err) {
    console.error("Quest loading error:", err);
  }
}