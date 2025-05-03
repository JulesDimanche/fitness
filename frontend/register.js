console.log("register.js loaded");

const registerForm = document.getElementById("registerForm");

if (registerForm) {
  console.log("Register form found"); // Add this to check
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Register form submitted");
  
    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData.entries());
    console.log("Sending data:", data); // Log the form data
  
    try {
      const response = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
  
      const result = await response.json();
      console.log("Response from server:", result); // Log server response
  
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
  
}
