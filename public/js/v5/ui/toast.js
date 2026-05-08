export function toast(message) {
  const existing = document.getElementById("strato-toast");
  existing?.remove();
  const node = document.createElement("div");
  node.id = "strato-toast";
  node.className = "strato-toast";
  node.textContent = message;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 2400);
}
