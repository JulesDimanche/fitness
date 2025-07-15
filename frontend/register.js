registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(registerForm);
  const data = Object.fromEntries(formData.entries());

  // ✅ Password length check
  if (data.password.length < 6) {
    alert("Password must be at least 6 characters long.");
    return;
  }

  try {
    const response = await fetch("http://localhost:8000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok) {
      alert("Registered successfully. Please log in.");
    } else {
      alert("Error: " + (result.detail || "Unknown error"));
    }
  } catch (err) {
    console.error("Registration error:", err);
    alert("Registration failed.");
  }
});
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    togglePassword.textContent = isVisible ? "👁️" : "🙈"; // You can customize icons here
  });
}
