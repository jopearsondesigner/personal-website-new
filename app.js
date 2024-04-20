document.addEventListener("DOMContentLoaded", function () {
  updateCurrentYear();
  setupSmoothScrollForAnchors();
  handleWorkSectionInteractivity();
  setupContactFormSubmission();
});

function updateCurrentYear() {
  const yearElement = document.getElementById("currentYear");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

function setupSmoothScrollForAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });
}

function handleWorkSectionInteractivity() {
  const workItems = document.querySelectorAll(".work-item");
  workItems.forEach((item) => {
    item.addEventListener("mouseenter", () => item.classList.add("shadow-lg"));
    item.addEventListener("mouseleave", () =>
      item.classList.remove("shadow-lg")
    );
  });
}

function setupContactFormSubmission() {
  const form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      alert("Thank you for your message. We will get back to you shortly.");
      form.reset(); // Reset the form fields after submission
    });
  }
}
