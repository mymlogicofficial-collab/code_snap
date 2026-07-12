document.getElementById("send").onclick = async () => {
  const text = document.getElementById("input").value;

  const res = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  const data = await res.json();
  addMessage("Agent: " + data.text);
};

document.getElementById("fileUpload").onchange = async (e) => {
  const file = e.target.files[0];
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/upload", {
    method: "POST",
    body: form
  });

  const data = await res.json();
  addMessage("Agent: " + data.text);
};

function addMessage(msg) {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.textContent = msg;
  messages.appendChild(div);
}
