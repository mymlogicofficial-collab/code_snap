
const output = document.getElementById("output");

document.getElementById("runDiagnostics").onclick = async () => {
  const res = await fetch("/diagnostics", { method: "POST" });
  const data = await res.json();
  output.textContent = JSON.stringify(data, null, 2);
};

document.getElementById("viewLogs").onclick = async () => {
  const res = await fetch("/logs", { method: "GET" });
  const text = await res.text();
  output.textContent = text;
};
