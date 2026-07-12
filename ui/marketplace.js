const output = document.getElementById("marketOutput");
const nameEl = document.getElementById("skillName");
const descEl = document.getElementById("skillDesc");
const createBtn = document.getElementById("createSkill");

createBtn.onclick = async () => {
  const skillName = nameEl.value.trim();
  const description = descEl.value.trim();
  if (!skillName || !description) return;

  const res = await fetch("/autoskill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skillName, description })
  });

  const data = await res.json();
  output.textContent = JSON.stringify(data, null, 2);
};
