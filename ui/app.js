document.getElementById("demoBtn").addEventListener("click", async () => {
  const res = await fetch("/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "execute", code: "startDemo()" })
  });
  const data = await res.json();
  alert(JSON.stringify(data, null, 2));
});