import "../styles/animated-logo.css";

export function AnimatedLogo() {
  const container = document.createElement("div");
  container.className = "animated-logo-container";

  const logo = document.createElement("div");
  logo.className = "animated-logo";

  container.appendChild(logo);

  return container;
}
