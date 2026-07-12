const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const fileUploadEl = document.getElementById("fileUpload");
const voiceToggleBtn = document.getElementById("voiceToggle");

let recognizing = false;
let recognition = null;

// Add message to UI
function addMessage(text, role = "agent") {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Send text to /chat
sendBtn.onclick = async () => {
  const text = inputEl.value.trim();
  if (!text) return;

  addMessage(text, "user");
  inputEl.value = "";

  const res = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  const data = await res.json();
  const reply = data.text || JSON.stringify(data);
  addMessage(reply, "agent");
};

// File upload (drag & drop / manual)
fileUploadEl.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const form = new FormData();
  form.append("file", file);

  addMessage(`Uploaded: ${file.name}`, "user");

  const res = await fetch("/upload", {
    method: "POST",
    body: form
  });

  const data = await res.json();
  const reply = data.text || JSON.stringify(data);
  addMessage(reply, "agent");
};

// Hands-free voice mode (browser STT)
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    addMessage(transcript, "user");
    inputEl.value = transcript;
  };

  recognition.onend = () => {
    recognizing = false;
    voiceToggleBtn.textContent = "🎙 Hands-free";
  };

  voiceToggleBtn.onclick = () => {
    if (!recognizing) {
      recognition.start();
      recognizing = true;
      voiceToggleBtn.textContent = "⏹ Stop";
    } else {
      recognition.stop();
      recognizing = false;
      voiceToggleBtn.textContent = "🎙 Hands-free";
    }
  };
} else {
  voiceToggleBtn.disabled = true;
  voiceToggleBtn.textContent = "🎙 Not supported";
}
