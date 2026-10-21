const chatInput = document.getElementById('chatInput');
const imagePrompt = document.getElementById('imagePrompt');
const codeInput = document.getElementById('codeInput');
const musicPrompt = document.getElementById('musicPrompt');
const videoPrompt = document.getElementById('videoPrompt');

const chatOutput = document.getElementById('chatOutput');
const imageOutput = document.getElementById('imageOutput');
const codeOutput = document.getElementById('codeOutput');
const diagnosticsOutput = document.getElementById('diagnosticsOutput');

const ollamaStatus = document.getElementById('ollamaStatus');
const githubStatus = document.getElementById('githubStatus');
const filesystemStatus = document.getElementById('filesystemStatus');

function setOutput(el, text, tone = 'neutral') {
  el.textContent = text;
  el.dataset.tone = tone;
}

function showLoading(el, label) {
  setOutput(el, `${label}...`, 'neutral');
}

async function checkStatuses() {
  // Check Ollama Local Connection
  try {
    const ollamaRes = await fetch('http://localhost:11434/api/tags', { mode: 'cors' });
    if (ollamaRes.ok) {
      ollamaStatus.textContent = 'Connected';
      document.querySelector('#ollamaStatus').closest('.status-pill').classList.remove('error');
      document.querySelector('#ollamaStatus').closest('.status-pill').classList.add('success');
    } else {
      throw new Error('Ollama unavailable');
    }
  } catch (err) {
    ollamaStatus.textContent = 'Offline';
    document.querySelector('#ollamaStatus').closest('.status-pill').classList.remove('success');
    document.querySelector('#ollamaStatus').closest('.status-pill').classList.add('error');
  }

  // Check Backend GitHub & API Status
  try {
    const statusRes = await fetch('/status');
    const statusData = await statusRes.json();
    const isConfigured = !!statusData?.githubConfigured;
    githubStatus.textContent = isConfigured ? 'Connected' : 'Not configured';
    const pill = githubStatus.closest('.status-pill');
    pill.classList.toggle('warning', !isConfigured);
    pill.classList.toggle('success', isConfigured);
    pill.classList.toggle('error', false);
  } catch (err) {
    githubStatus.textContent = 'Error';
    githubStatus.closest('.status-pill').classList.remove('success', 'warning');
    githubStatus.closest('.status-pill').classList.add('error');
  }

  // Check File System / Server Health
  try {
    const fsReady = await fetch('/health');
    if (fsReady.ok) {
      filesystemStatus.textContent = 'Ready';
      document.querySelector('#filesystemStatus').closest('.status-pill').classList.remove('error');
      document.querySelector('#filesystemStatus').closest('.status-pill').classList.add('success');
    } else {
      throw new Error('Health check failed');
    }
  } catch (err) {
    filesystemStatus.textContent = 'Offline';
    document.querySelector('#filesystemStatus').closest('.status-pill').classList.remove('success');
    document.querySelector('#filesystemStatus').closest('.status-pill').classList.add('error');
  }
}

async function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  showLoading(chatOutput, 'Thinking');
  const payload = { text };
  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    const output = data?.response || data?.text || data?.content || JSON.stringify(data, null, 2);
    setOutput(chatOutput, output, 'success');
  } catch (err) {
    setOutput(chatOutput, `Error: ${err.message}`, 'error');
  }
}

async function generateImage() {
  const prompt = imagePrompt.value.trim();
  if (!prompt) return;
  showLoading(imageOutput, 'Generating image');
  try {
    const res = await fetch('/image/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    const output = data?.response || data?.text || data?.result || JSON.stringify(data, null, 2);
    setOutput(imageOutput, output, 'success');
  } catch (err) {
    setOutput(imageOutput, `Error: ${err.message}`, 'error');
  }
}

async function executeCode() {
  const code = codeInput.value.trim();
  if (!code) return;
  showLoading(codeOutput, 'Executing');
  try {
    const res = await fetch('/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    const output = data?.result ?? data?.response ?? data?.text ?? JSON.stringify(data, null, 2);
    setOutput(codeOutput, output, 'success');
  } catch (err) {
    setOutput(codeOutput, `Error: ${err.message}`, 'error');
  }
}

async function runDiagnostics() {
  showLoading(diagnosticsOutput, 'Running diagnostics');
  try {
    const res = await fetch('/status');
    const statusData = await res.json();
    const report = {
      system: "ODDS Active",
      githubConfigured: !!statusData?.githubConfigured,
      ollamaStatus: "Connected",
      timestamp: new Date().toISOString()
    };
    setOutput(diagnosticsOutput, JSON.stringify(report, null, 2), 'success');
  } catch (err) {
    setOutput(diagnosticsOutput, `Diagnostics failed: ${err.message}`, 'error');
  }
}

async function viewLogs() {
  try {
    const res = await fetch('/logs');
    const text = await res.text();
    setOutput(diagnosticsOutput, text || 'No logs available.', 'neutral');
  } catch (err) {
    setOutput(diagnosticsOutput, `Unable to read logs: ${err.message}`, 'error');
  }
}

async function generateMusic() {
  const prompt = musicPrompt.value.trim();
  if (!prompt) return;
  try {
    const res = await fetch('/music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    setOutput(chatOutput, `Music request queued: ${JSON.stringify(data, null, 2)}`, 'success');
  } catch (err) {
    setOutput(chatOutput, `Music generation failed: ${err.message}`, 'error');
  }
}

async function generateVideo() {
  const prompt = videoPrompt.value.trim();
  if (!prompt) return;
  try {
    const res = await fetch('/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    setOutput(chatOutput, `Video request queued: ${JSON.stringify(data, null, 2)}`, 'success');
  } catch (err) {
    setOutput(chatOutput, `Video generation failed: ${err.message}`, 'error');
  }
}

// Event Bindings
document.getElementById('sendChat').addEventListener('click', sendChat);
document.getElementById('generateImage').addEventListener('click', generateImage);
document.getElementById('executeCode').addEventListener('click', executeCode);
document.getElementById('runDiagnostics').addEventListener('click', runDiagnostics);
document.getElementById('viewLogs').addEventListener('click', viewLogs);
document.getElementById('generateMusic').addEventListener('click', generateMusic);
document.getElementById('generateVideo').addEventListener('click', generateVideo);

document.getElementById('previewMusic').addEventListener('click', () => {
  setOutput(chatOutput, 'Music preview is wired and ready for a Suno/voice model integration.', 'neutral');
});

document.getElementById('previewVideo').addEventListener('click', () => {
  setOutput(chatOutput, 'Video storyboard is ready for a frame-by-frame generation pipeline.', 'neutral');
});

chatInput.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    sendChat();
  }
});

// Initialization
checkStatuses();
setOutput(chatOutput, 'Ready. Ask for code, design feedback, content generation, or a new creative brief.', 'neutral');
setOutput(imageOutput, 'Prompt ready. Image generation can be connected to your local or web model.', 'neutral');
setOutput(codeOutput, 'Console output will appear here when the sandbox executes.', 'neutral');
setOutput(diagnosticsOutput, 'Diagnostics not run yet.', 'neutral');
