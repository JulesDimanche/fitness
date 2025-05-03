const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

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
        alert("Login successful!");
        window.location.href = "bmi.html";
      } else {
        alert("Login failed: " + (result.detail || "Invalid credentials"));
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Login request failed.");
    }
  });
}
