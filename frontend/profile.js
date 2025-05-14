const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token"); // Clear the auth token
    alert("You have been logged out.");
    window.location.href = "login.html"; // Redirect to login page
  });
}
