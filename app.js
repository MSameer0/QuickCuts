const { FFmpeg } = window.FFmpegWASM;

let videoFile = null;
let videoFileName = "";
let segments = [];
let pendingStart = null;
let nextId = 1;
let ffmpeg = null;

const videoInput = document.getElementById("videoInput");
const video = document.getElementById("videoPlayer");
const videoOverlay = document.getElementById("videoOverlay");
const timeline = document.getElementById("timeline");
const timelineSegments = document.getElementById("timelineSegments");
const playhead = document.getElementById("playhead");
const browseBtn = document.getElementById("browseBtn");
const fileNameDisplay = document.getElementById("fileName");
const currentTimeDisplay = document.getElementById("currentTime");
const durationDisplay = document.getElementById("duration");
const playPauseBtn = document.getElementById("playPauseBtn");
const addStartBtn = document.getElementById("addStartBtn");
const addEndBtn = document.getElementById("addEndBtn");
const exportBtn = document.getElementById("exportBtn");
const segmentsList = document.getElementById("segmentsList");
const segmentCount = document.getElementById("segmentCount");
const toast = document.getElementById("toast");

const loader = document.getElementById("loader");
const loaderTitle = document.getElementById("loaderTitle");
const loaderText = document.getElementById("loaderText");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const exportModal = document.getElementById("exportModal");
const fastExportBtn = document.getElementById("fastExportBtn");
const balancedExportBtn = document.getElementById("balancedExportBtn");
const accurateExportBtn = document.getElementById("accurateExportBtn");
const cancelExportBtn = document.getElementById("cancelExportBtn");

function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00:00.00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  return (
    [
      h.toString().padStart(2, "0"),
      m.toString().padStart(2, "0"),
      s.toString().padStart(2, "0"),
    ].join(":") +
    "." +
    ms.toString().padStart(2, "0")
  );
}

function showToast(message, duration = 3000) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

async function initFFmpeg() {
  if (ffmpeg !== null) return ffmpeg;

  loader.style.display = "flex";
  loaderTitle.textContent = "INITIALIZING_ENGINE";
  loaderText.textContent =
    "Loading FFmpeg WebAssembly. This only happens once per session.";

  ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress }) => {
    if (progressContainer.style.display !== "none") {
      const percent = Math.round(progress * 100);
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${percent}%`;
    }
  });

  try {
    const base = new URL(".", window.location.href).href;
    await ffmpeg.load({
      coreURL: base + "ffmpeg/ffmpeg-core.js",
      wasmURL: base + "ffmpeg/ffmpeg-core.wasm",
    });
    loader.style.display = "none";
    return ffmpeg;
  } catch (err) {
    console.error("FFmpeg load failed:", err);
    loaderTitle.textContent = "Engine Load Failed";
    loaderText.textContent = `Error: ${err.message || err}. Please try refreshing.`;
    throw err;
  }
}

const mobileUploadBtn = document.getElementById("mobileUploadBtn");
const mobileExportBtn = document.getElementById("mobileExportBtn");
const timelineRuler = document.getElementById("timelineRuler");

const timelineView = document.getElementById("timelineView");
const timelineTrack = timelineSegments.parentElement;

let isLongPressing = false;

browseBtn.addEventListener("click", () => videoInput.click());
if (mobileUploadBtn)
  mobileUploadBtn.addEventListener("click", () => videoInput.click());

const mobileSegmentsBtn = document.getElementById("mobileSegmentsBtn");
const segmentsModal = document.getElementById("segmentsModal");
const closeSegmentsBtn = document.getElementById("closeSegmentsBtn");
const mobileSegmentsList = document.getElementById("mobileSegmentsList");

if (mobileSegmentsBtn) {
  mobileSegmentsBtn.onclick = () => {
    segmentsModal.style.display = "flex";
    renderSegments();
  };
}

if (closeSegmentsBtn) {
  closeSegmentsBtn.onclick = () => {
    segmentsModal.style.display = "none";
  };
}

timelineView.addEventListener("click", (e) => {
  if (!video.duration) return;

  const rect = timelineTrack.getBoundingClientRect();
  const clickX = e.clientX - rect.left;

  const percent = Math.max(0, Math.min(1, clickX / rect.width));
  video.currentTime = percent * video.duration;
  timeline.value = video.currentTime;
  updatePlayhead();
});

videoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    videoFile = file;
    videoFileName = file.name;
    fileNameDisplay.textContent = videoFileName;

    const fileURL = URL.createObjectURL(file);
    video.src = fileURL;
    video.load();

    segments = [];
    renderSegments();
    showToast("Video loaded successfully");
  }
});

video.addEventListener("loadedmetadata", () => {
  timeline.max = video.duration;
  durationDisplay.textContent = formatTime(video.duration);

  // Timeline always fits to width
  if (timelineRuler) timelineRuler.style.width = "100%";
  if (timelineSegments.parentElement)
    timelineSegments.parentElement.style.width = "100%";
  if (timeline) timeline.style.width = "100%";

  updatePlayhead();
});

video.addEventListener("timeupdate", () => {
  if (!timeline.matches(":active")) {
    timeline.value = video.currentTime;
    updatePlayhead();
  }
  currentTimeDisplay.textContent = formatTime(video.currentTime);
});

const playIconPath = "M8 5v14l11-7z";
const pauseIconPath = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";

function togglePlay() {
  const playIcon = document.getElementById("playIcon");
  const playIconOverlay = document.getElementById("playIconOverlay");

  if (video.paused) {
    video.play();
    const path = `<path d="${pauseIconPath}"/>`;
    if (playIcon) playIcon.innerHTML = path;
    if (playIconOverlay) playIconOverlay.innerHTML = path;
    videoOverlay.style.opacity = "0";
  } else {
    video.pause();
    const path = `<path d="${playIconPath}"/>`;
    if (playIcon) playIcon.innerHTML = path;
    if (playIconOverlay) playIconOverlay.innerHTML = path;
    videoOverlay.style.opacity = "1";
  }
}

playPauseBtn.addEventListener("click", togglePlay);
videoOverlay.addEventListener("click", togglePlay);

timeline.addEventListener("input", () => {
  video.currentTime = timeline.value;
  updatePlayhead();
});

function updatePlayhead() {
  const percent = (video.currentTime / video.duration) * 100;
  if (playhead) playhead.style.left = `${percent}%`;
}

addStartBtn.addEventListener("click", () => {
  pendingStart = video.currentTime;
  showToast(`Start marked at ${formatTime(pendingStart)}`);
  addStartBtn.classList.add("primary");
});

addEndBtn.addEventListener("click", () => {
  const start = pendingStart !== null ? pendingStart : 0;
  const end = video.currentTime;

  if (end <= start) {
    showToast("End must be after start");
    return;
  }

  addSegment(start, end);
  pendingStart = null;
  addStartBtn.classList.remove("primary");
});

function addSegment(start, end) {
  segments.push({
    id: nextId++,
    start: start,
    end: end,
  });
  renderSegments();
}

function removeSegment(id) {
  segments = segments.filter((s) => s.id !== id);
  renderSegments();
}

function renderSegments() {
  exportBtn.disabled = segments.length === 0;
  segmentCount.textContent = segments.length;

  const emptyState = `
        <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <p>No segments yet</p>
            <p style="font-size: 0.75rem; margin-top: 0.5rem; opacity: 0.6;">Use the timeline to mark segments</p>
        </div>
    `;

  if (segments.length === 0) {
    segmentsList.innerHTML = emptyState;
    if (mobileSegmentsList) mobileSegmentsList.innerHTML = emptyState;
    timelineSegments.innerHTML = "";
    return;
  }

  segments.sort((a, b) => a.start - b.start);

  segmentsList.innerHTML = "";
  if (mobileSegmentsList) mobileSegmentsList.innerHTML = "";
  timelineSegments.innerHTML = "";

  segments.forEach((seg) => {
    const clip = document.createElement("div");
    clip.className = "clip-block";
    const left = (seg.start / video.duration) * 100;
    const width = ((seg.end - seg.start) / video.duration) * 100;
    clip.style.left = `${left}%`;
    clip.style.width = `${width}%`;
    clip.textContent = `Clip ${seg.id}`;
    clip.style.pointerEvents = "none";
    timelineSegments.appendChild(clip);

    const cardHTML = `
            <div class="segment-card">
                <div class="segment-card-header">
                    <span class="segment-name">Clip ${seg.id}</span>
                    <span style="font-size: 0.7rem; color: var(--accent);">${(seg.end - seg.start).toFixed(2)}s</span>
                </div>
                <div class="segment-time-inputs">
                    <div class="time-input-group">
                        <label>Start</label>
                        <input type="text" value="${seg.start.toFixed(2)}" data-id="${seg.id}" data-type="start">
                    </div>
                    <div class="time-input-group">
                        <label>End</label>
                        <input type="text" value="${seg.end.toFixed(2)}" data-id="${seg.id}" data-type="end">
                    </div>
                </div>
                <div class="segment-actions">
                    <button class="small-btn watch-btn" data-id="${seg.id}">Watch</button>
                    <button class="small-btn delete-btn" data-id="${seg.id}">Delete</button>
                </div>
            </div>
        `;

    const desktopCard = document.createElement("div");
    desktopCard.innerHTML = cardHTML;
    segmentsList.appendChild(desktopCard.firstElementChild);

    if (mobileSegmentsList) {
      const mobileCard = document.createElement("div");
      mobileCard.innerHTML = cardHTML;
      mobileSegmentsList.appendChild(mobileCard.firstElementChild);
    }
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.onclick = () => {
      removeSegment(parseInt(btn.dataset.id));
      if (segments.length === 0 && segmentsModal)
        segmentsModal.style.display = "none";
    };
  });

  document.querySelectorAll(".watch-btn").forEach((btn) => {
    btn.onclick = () => {
      const seg = segments.find((s) => s.id === parseInt(btn.dataset.id));
      video.currentTime = seg.start;
      video.play();
      updatePlayhead();
      if (window.innerWidth <= 768 && segmentsModal)
        segmentsModal.style.display = "none";
    };
  });

  document.querySelectorAll(".segment-time-inputs input").forEach((input) => {
    input.onblur = (e) => {
      const id = parseInt(input.dataset.id);
      const type = input.dataset.type;
      const val = parseFloat(input.value);
      const seg = segments.find((s) => s.id === id);

      if (!isNaN(val)) {
        if (type === "start") {
          if (val < seg.end && val >= 0) seg.start = val;
          else showToast("Invalid start time");
        } else {
          if (val > seg.start && val <= video.duration) seg.end = val;
          else showToast("Invalid end time");
        }
        renderSegments();
      }
    };
    input.onkeydown = (e) => {
      if (e.key === "Enter") input.blur();
    };
  });
}

exportBtn.addEventListener("click", () => {
  if (!videoFile || segments.length === 0) return;
  exportModal.style.display = "flex";
});
if (mobileExportBtn)
  mobileExportBtn.addEventListener("click", () => {
    if (!videoFile || segments.length === 0) {
      showToast("Add segments first");
      return;
    }
    exportModal.style.display = "flex";
  });

cancelExportBtn.addEventListener("click", () => {
  exportModal.style.display = "none";
});

fastExportBtn.addEventListener("click", () => {
  exportModal.style.display = "none";
  performExport("fast");
});

balancedExportBtn.addEventListener("click", () => {
  exportModal.style.display = "none";
  performExport("balanced");
});

accurateExportBtn.addEventListener("click", () => {
  exportModal.style.display = "none";
  performExport("accurate");
});

async function performExport(mode = "accurate") {
  try {
    const ff = await initFFmpeg();

    loader.style.display = "flex";
    progressContainer.style.display = "block";
    progressText.style.display = "block";
    progressBar.style.width = "0%";
    progressText.textContent = "0%";

    loaderTitle.textContent = "PREPARING_FILES";
    loaderText.textContent = "Loading video into memory...";

    const inFileName = "input_video.mp4";
    const fileData = new Uint8Array(await videoFile.arrayBuffer());
    await ff.writeFile(inFileName, fileData);

    const zip = new JSZip();
    const baseName =
      videoFileName.substring(0, videoFileName.lastIndexOf(".")) ||
      videoFileName;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const outFileName = `clip_${i + 1}.mp4`;

      loaderTitle.textContent = `EXPORTING_${i + 1}/${segments.length}`;

      let modeText = "Re-encoding...";
      if (mode === "fast") modeText = "Fast cutting...";
      if (mode === "balanced") modeText = "Balanced re-encoding (720p)...";
      loaderText.textContent = modeText;

      const startStr = seg.start.toString();
      const durationStr = (seg.end - seg.start).toString();

      let args = [];
      if (mode === "fast") {
        args = [
          "-ss",
          startStr,
          "-i",
          inFileName,
          "-t",
          durationStr,
          "-c",
          "copy",
          outFileName,
        ];
      } else if (mode === "balanced") {
        args = [
          "-ss",
          startStr,
          "-i",
          inFileName,
          "-t",
          durationStr,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "28",
          "-vf",
          "scale=-2:min(720\\,ih)",
          "-c:a",
          "copy",
          outFileName,
        ];
      } else {
        args = [
          "-ss",
          startStr,
          "-i",
          inFileName,
          "-t",
          durationStr,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "22",
          "-c:a",
          "copy",
          outFileName,
        ];
      }

      await ff.exec(args);

      const outData = await ff.readFile(outFileName);
      zip.file(`${baseName}_clip_${i + 1}.mp4`, outData.buffer);
      await ff.deleteFile(outFileName);
    }

    loaderTitle.textContent = "PACKAGING";
    loaderText.textContent = "Creating ZIP archive...";
    progressContainer.style.display = "none";
    progressText.style.display = "none";

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_clips.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    await ff.deleteFile(inFileName);
    showToast("Export successful!");
  } catch (err) {
    console.error("Export Error:", err);
    showToast("Export failed.");
  } finally {
    loader.style.display = "none";
  }
}

const themeToggle = document.getElementById("themeToggle");

function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
  }
}

themeToggle.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light-mode");
  localStorage.setItem("theme", isLight ? "light" : "dark");
  showToast(`Switched to ${isLight ? "Light" : "Dark"} Mode`);
});

window.addEventListener("DOMContentLoaded", () => {
  initTheme();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((e) => console.error(e));
  }

  initFFmpeg().catch(() => {});
});
