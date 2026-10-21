const chatInput = document.getElementById('input');
const sendButton = document.getElementById('send');
const chatOutput = document.getElementById('messages');

const ollamaStatus = document.getElementById('ollamaStatus');
const githubStatus = document.getElementById('githubStatus');
const filesystemStatus = document.getElementById('filesystemStatus');

function appendMessage(sender, text, tone = 'neutral') {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}`;
  msgDiv.dataset.tone = tone;
  msgDiv.textContent = `${sender === 'user' ? 'You' : 'Agent'}: ${text}`;
  chatOutput.appendChild(msgDiv);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

async function checkStatuses() {
  // Check Ollama Local Connection
  try {
    const ollamaRes = await fetch('http://localhost:11434/api/tags', { mode: 'cors' });
    if (ollamaRes.ok && ollamaStatus) {
      ollamaStatus.textContent = 'Connected';
    }
  } catch (err) {
    if (ollamaStatus) ollamaStatus.textContent = 'Offline';
  }

  // Check Backend GitHub & API Status
  try {
    const statusRes = await fetch('/status');
    const statusData = await statusRes.json();
    const isConfigured = !!statusData?.githubConfigured;
    if (githubStatus) {
      githubStatus.textContent = isConfigured ? 'Connected' : 'Not configured';
    }
  } catch (err) {
    if (githubStatus) githubStatus.textContent = 'Error';
  }

  // Check File System / Server Health
  try {
    const fsReady = await fetch('/health');
    if (fsReady.ok && filesystemStatus) {
      filesystemStatus.textContent = 'Ready';
    }
  } catch (err) {
    if (filesystemStatus) filesystemStatus.textContent = 'Offline';
  }
}

async function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  
  appendMessage('user', text, 'neutral');
  chatInput.value = '';

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    const output = data?.response || data?.text || data?.content || JSON.stringify(data, null, 2);
    appendMessage('agent', output, 'success');
  } catch (err) {
    appendMessage('agent', `Error: ${err.message}`, 'error');
  }
}

// Event Bindings mapped to your exact index.html IDs
if (sendButton) {
  sendButton.addEventListener('click', sendChat);
}

if (chatInput) {
  chatInput.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      sendChat();
    }
  });
}

// Initialization
checkStatuses();
appendMessage('agent', 'Neon coding guru initialized. qwen2.5-coder:latest and llava-phi3:3.8b are online.', 'success');
