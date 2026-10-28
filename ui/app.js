// O.D.D.S. Digital Design Suite & Creative Guru UI Core

// State & Element References
let attachedFiles = [];
let mediaRecorder = null;
let recordedAudioChunks = [];
let recordStartTime = 0;
let recordTimerInterval = null;
let recordedAudioBlob = null;

// Tab Navigation Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Chat Elements
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendChat');
const chatOutput = document.getElementById('chatOutput');
const dropZone = document.getElementById('dropZone');
const dropOverlay = document.getElementById('dropOverlay');
const attachmentBar = document.getElementById('attachmentBar');
const fileAttachInput = document.getElementById('fileAttachInput');
const imageAttachInput = document.getElementById('imageAttachInput');

// Music Studio Elements
const musicStyle = document.getElementById('musicStyle');
const musicPrompt = document.getElementById('musicPrompt');
const musicLyrics = document.getElementById('musicLyrics');
const generateMusicBtn = document.getElementById('generateMusic');
const musicOutput = document.getElementById('musicOutput');
const recordLyricsBtn = document.getElementById('recordLyricsBtn');
const recBtnText = document.getElementById('recBtnText');
const recordTimer = document.getElementById('recordTimer');
const audioFileInput = document.getElementById('audioFileInput');
const audioPreviewContainer = document.getElementById('audioPreviewContainer');
const audioPreviewPlayer = document.getElementById('audioPreviewPlayer');

// Visual & Video Elements
const imagePrompt = document.getElementById('imagePrompt');
const generateImageBtn = document.getElementById('generateImage');
const imageOutput = document.getElementById('imageOutput');

const videoPrompt = document.getElementById('videoPrompt');
const generateVideoBtn = document.getElementById('generateVideo');
const videoOutput = document.getElementById('videoOutput');

// Sandbox & Diagnostics Elements
const codeInput = document.getElementById('codeInput');
const executeCodeBtn = document.getElementById('executeCode');
const codeOutput = document.getElementById('codeOutput');
const runDiagnosticsBtn = document.getElementById('runDiagnostics');
const viewLogsBtn = document.getElementById('viewLogs');
const diagnosticsOutput = document.getElementById('diagnosticsOutput');

// Status Indicators
const ollamaStatus = document.getElementById('ollamaStatus');
const githubStatus = document.getElementById('githubStatus');
const filesystemStatus = document.getElementById('filesystemStatus');

// TAB SWITCHING
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.add('hidden'));

    btn.classList.add('active');
    const targetTab = document.getElementById(btn.dataset.tab);
    if (targetTab) targetTab.classList.remove('hidden');
  });
});

// QUICK STARTER PROMPT CHIPS
document.querySelectorAll('.prompt-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const promptText = chip.dataset.prompt;
    if (chatInput) {
      chatInput.value = promptText;
      chatInput.focus();
    }
  });
});

// ATTACHMENT MANAGEMENT
function addAttachment(file) {
  if (!file) return;
  attachedFiles.push(file);
  renderAttachments();
}

function removeAttachment(index) {
  attachedFiles.splice(index, 1);
  renderAttachments();
}

function renderAttachments() {
  if (!attachmentBar) return;
  if (attachedFiles.length === 0) {
    attachmentBar.innerHTML = '';
    attachmentBar.classList.add('hidden');
    return;
  }

  attachmentBar.classList.remove('hidden');
  attachmentBar.innerHTML = attachedFiles.map((file, idx) => {
    const sizeKb = Math.round(file.size / 1024);
    const name = file.name.length > 20 ? file.name.slice(0, 17) + '...' : file.name;
    return `
      <span class="attachment-chip">
        📎 ${name} (${sizeKb}KB)
        <span class="remove-btn" onclick="removeAttachment(${idx})">×</span>
      </span>
    `;
  }).join('');
}

// DRAG & DROP & CLIPBOARD PASTE
if (dropZone) {
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
      if (dropOverlay) dropOverlay.classList.remove('hidden');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
      if (dropOverlay) dropOverlay.classList.add('hidden');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(addAttachment);
    }
  });
}

if (chatInput) {
  chatInput.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) addAttachment(file);
      }
    }
  });
}

if (fileAttachInput) {
  fileAttachInput.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(addAttachment);
    e.target.value = '';
  });
}

if (imageAttachInput) {
  imageAttachInput.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(addAttachment);
    e.target.value = '';
  });
}

// CONVERSATION FEED & MESSAGE RENDERING
function appendMessage(sender, text, mediaObj = null) {
  if (!chatOutput) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender}`;

  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'msg-avatar';
  avatarDiv.textContent = sender === 'user' ? 'YOU' : 'O.D.D.S.';

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'msg-bubble';

  const headerDiv = document.createElement('div');
  headerDiv.className = 'msg-header';
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  headerDiv.textContent = `${sender === 'user' ? 'You' : 'Digital Design Guru'} • ${timeStr}`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'msg-content';

  // Format code blocks if present
  let formattedText = escapeHtml(text || '');
  formattedText = formattedText.replace(/```([\s\S]*?)```/g, (match, p1) => {
    return `<pre><code>${p1.trim()}</code></pre>`;
  });
  contentDiv.innerHTML = formattedText;

  bubbleDiv.appendChild(headerDiv);
  bubbleDiv.appendChild(contentDiv);

  // Render media attachments if present
  if (mediaObj) {
    if (mediaObj.master_wav || mediaObj.audio) {
      const audioPath = mediaObj.master_wav || mediaObj.audio;
      const audioPlayer = document.createElement('audio');
      audioPlayer.controls = true;
      audioPlayer.className = 'msg-media';
      audioPlayer.src = audioPath.startsWith('http') || audioPath.startsWith('/') ? audioPath : `/api/read-file?path=${encodeURIComponent(audioPath)}`;
      bubbleDiv.appendChild(audioPlayer);
    }

    if (mediaObj.output_path && mediaObj.output_path.endsWith('.mp4')) {
      const videoPlayer = document.createElement('video');
      videoPlayer.controls = true;
      videoPlayer.className = 'msg-media';
      videoPlayer.style.maxHeight = '280px';
      videoPlayer.src = mediaObj.output_path.startsWith('http') || mediaObj.output_path.startsWith('/') ? mediaObj.output_path : `/api/read-file?path=${encodeURIComponent(mediaObj.output_path)}`;
      bubbleDiv.appendChild(videoPlayer);
    }
  }

  msgDiv.appendChild(avatarDiv);
  msgDiv.appendChild(bubbleDiv);

  chatOutput.appendChild(msgDiv);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// FILE UPLOAD HELPER
async function uploadFiles(files) {
  const uploadedPaths = [];
  for (let file of files) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.ok && data.filePath) {
        uploadedPaths.push({ name: file.name, path: data.filePath });
      }
    } catch (err) {
      console.warn('File upload failed:', err);
    }
  }
  return uploadedPaths;
}

// CHAT SEND
async function sendChat() {
  const text = chatInput ? chatInput.value.trim() : '';
  if (!text && attachedFiles.length === 0) return;

  let fileNotes = '';
  if (attachedFiles.length > 0) {
    const uploaded = await uploadFiles(attachedFiles);
    if (uploaded.length > 0) {
      fileNotes = '\n[Attached files: ' + uploaded.map(u => `${u.name} -> ${u.path}`).join(', ') + ']';
    }
    attachedFiles = [];
    renderAttachments();
  }

  const fullPrompt = text + fileNotes;
  appendMessage('user', text || '[Attached Files Sent]');
  if (chatInput) chatInput.value = '';

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: fullPrompt })
    });
    const data = await res.json();
    const outputText = data?.response || data?.text || data?.content || JSON.stringify(data, null, 2);
    appendMessage('agent', outputText, data);
  } catch (err) {
    appendMessage('agent', `Error: ${err.message}`);
  }
}

if (sendButton) sendButton.addEventListener('click', sendChat);
if (chatInput) {
  chatInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      sendChat();
    }
  });
}

// VOICE & LYRICS RECORDING SUITE
if (recordLyricsBtn) {
  recordLyricsBtn.addEventListener('click', toggleVoiceRecord);
}

async function toggleVoiceRecord() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    // Stop recording
    mediaRecorder.stop();
    recordLyricsBtn.classList.remove('recording');
    recBtnText.textContent = 'Record Voice / Lyrics';
    clearInterval(recordTimerInterval);
  } else {
    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedAudioChunks = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedAudioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        recordedAudioBlob = new Blob(recordedAudioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(recordedAudioBlob);
        if (audioPreviewPlayer) audioPreviewPlayer.src = audioUrl;
        if (audioPreviewContainer) audioPreviewContainer.classList.remove('hidden');

        // Add recorded audio to chat attachments
        const recFile = new File([recordedAudioBlob], `vocal_record_${Date.now()}.wav`, { type: 'audio/wav' });
        addAttachment(recFile);
      };

      mediaRecorder.start();
      recordLyricsBtn.classList.add('recording');
      recBtnText.textContent = 'Stop Recording';

      recordStartTime = Date.now();
      recordTimerInterval = setInterval(updateRecordTimer, 500);
    } catch (err) {
      alert(`Microphone access error: ${err.message}`);
    }
  }
}

function updateRecordTimer() {
  if (!recordTimer) return;
  const elapsedSec = Math.floor((Date.now() - recordStartTime) / 1000);
  const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const secs = String(elapsedSec % 60).padStart(2, '0');
  recordTimer.textContent = `${mins}:${secs}`;
}

if (audioFileInput) {
  audioFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      addAttachment(file);
      const audioUrl = URL.createObjectURL(file);
      if (audioPreviewPlayer) audioPreviewPlayer.src = audioUrl;
      if (audioPreviewContainer) audioPreviewContainer.classList.remove('hidden');
    }
  });
}

// MUSIC GENERATION
if (generateMusicBtn) {
  generateMusicBtn.addEventListener('click', async () => {
    const promptVal = musicPrompt ? musicPrompt.value.trim() : '';
    const styleVal = musicStyle ? musicStyle.value.trim() : '';
    const lyricsVal = musicLyrics ? musicLyrics.value.trim() : '';

    const combinedPrompt = `${styleVal ? '[' + styleVal + '] ' : ''}${promptVal}${lyricsVal ? '\nLyrics: ' + lyricsVal : ''}`;

    if (musicOutput) musicOutput.textContent = '⚡ Generating audio track on local CPU...';

    try {
      const res = await fetch('/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: combinedPrompt, lyrics: lyricsVal })
      });
      const data = await res.json();

      if (musicOutput) {
        const audioSrc = data.spotify_ready_mp3 || data.master_wav;
        const specs = data.mastering_specs?.mastering_chain || [];
        musicOutput.innerHTML = `
          <div style="font-weight: 700; color: var(--accent-cyan); margin-bottom: 6px;">🎧 Studio Master (-14 LUFS / Spotify Ready)</div>
          <div>${escapeHtml(data.response || 'Studio audio track ready.')}</div>
          ${audioSrc ? `<audio controls src="/api/read-file?path=${encodeURIComponent(audioSrc)}" style="width: 100%; margin-top: 12px;"></audio>` : ''}
          ${data.spotify_ready_mp3 ? `<div style="margin-top: 10px;"><a href="/api/read-file?path=${encodeURIComponent(data.spotify_ready_mp3)}" download class="icon-action-btn" style="display: inline-block; text-decoration: none;">📥 Download Spotify-Ready 320kbps MP3</a></div>` : ''}
          ${specs.length > 0 ? `<div style="margin-top: 12px; font-size: 0.78rem; color: var(--text-muted);"><strong>DSP Chain Applied:</strong><ul style="margin: 4px 0; padding-left: 18px;">${specs.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>` : ''}
        `;
      }
    } catch (err) {
      if (musicOutput) musicOutput.textContent = `Music Generation Error: ${err.message}`;
    }
  });
}

// IMAGE GENERATION
if (generateImageBtn) {
  generateImageBtn.addEventListener('click', async () => {
    const promptVal = imagePrompt ? imagePrompt.value.trim() : '';
    if (!promptVal) return;

    if (imageOutput) imageOutput.textContent = '🎨 Rendering logo / visual asset...';

    try {
      const res = await fetch('/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptVal })
      });
      const data = await res.json();
      if (imageOutput) imageOutput.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      if (imageOutput) imageOutput.textContent = `Image Generation Error: ${err.message}`;
    }
  });
}

// VIDEO GENERATION
if (generateVideoBtn) {
  generateVideoBtn.addEventListener('click', async () => {
    const promptVal = videoPrompt ? videoPrompt.value.trim() : '';
    if (!promptVal) return;

    if (videoOutput) videoOutput.textContent = '🎬 Rendering commercial video track on CPU...';

    try {
      const res = await fetch('/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptVal })
      });
      const data = await res.json();

      if (videoOutput) {
        videoOutput.innerHTML = `
          <div>${escapeHtml(data.response || 'Video track ready.')}</div>
          ${data.output_path ? `<video controls src="/api/read-file?path=${encodeURIComponent(data.output_path)}" style="width: 100%; max-height: 280px; margin-top: 10px;"></video>` : ''}
        `;
      }
    } catch (err) {
      if (videoOutput) videoOutput.textContent = `Video Generation Error: ${err.message}`;
    }
  });
}

// SANDBOX & DIAGNOSTICS
if (executeCodeBtn) {
  executeCodeBtn.addEventListener('click', async () => {
    const code = codeInput ? codeInput.value : '';
    try {
      const res = await fetch('/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (codeOutput) codeOutput.textContent = data.result || JSON.stringify(data, null, 2);
    } catch (err) {
      if (codeOutput) codeOutput.textContent = `Execution Error: ${err.message}`;
    }
  });
}

if (runDiagnosticsBtn) {
  runDiagnosticsBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/diagnostics', { method: 'POST' });
      const data = await res.json();
      if (diagnosticsOutput) diagnosticsOutput.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      if (diagnosticsOutput) diagnosticsOutput.textContent = `Diagnostics Error: ${err.message}`;
    }
  });
}

if (viewLogsBtn) {
  viewLogsBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/logs');
      const text = await res.text();
      if (diagnosticsOutput) diagnosticsOutput.textContent = text;
    } catch (err) {
      if (diagnosticsOutput) diagnosticsOutput.textContent = `Logs Error: ${err.message}`;
    }
  });
}

// SYSTEM STATUS CHECK
async function checkStatuses() {
  try {
    const ollamaRes = await fetch('http://localhost:11434/api/tags', { mode: 'cors' });
    if (ollamaRes.ok && ollamaStatus) ollamaStatus.textContent = 'Online (CPU)';
  } catch {
    if (ollamaStatus) ollamaStatus.textContent = 'Offline';
  }

  try {
    const statusRes = await fetch('/status');
    const statusData = await statusRes.json();
    if (githubStatus) githubStatus.textContent = statusData?.githubConfigured ? 'Connected' : 'Not Configured';
  } catch {
    if (githubStatus) githubStatus.textContent = 'Error';
  }

  try {
    const fsReady = await fetch('/health');
    if (fsReady.ok && filesystemStatus) filesystemStatus.textContent = 'Active';
  } catch {
    if (filesystemStatus) filesystemStatus.textContent = 'Offline';
  }
}

// INITIALIZATION
checkStatuses();
appendMessage('agent', 'Welcome to O.D.D.S. Digital Design Suite & Creative Guru. Ready for branding, logo design, app architecture, music, video, and code sandbox engineering.');
