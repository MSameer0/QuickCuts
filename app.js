const { FFmpeg } = window.FFmpegWASM;

// Constants and State
let videoFile = null;
let videoFileName = "";
let segments = [];
let pendingStart = null;
let nextId = 1;
let ffmpeg = null;

// DOM Elements
const videoInput = document.getElementById("videoInput");
const video = document.getElementById("videoPlayer");
const timeline = document.getElementById("timeline");
const timelineSegments = document.getElementById("timelineSegments");
const browseBtn = document.getElementById("browseBtn");
const fileNameDisplay = document.getElementById("fileName");
const currentTimeDisplay = document.getElementById("currentTime");
const durationDisplay = document.getElementById("duration");
const playPauseBtn = document.getElementById("playPauseBtn");
const addStartBtn = document.getElementById("addStartBtn");
const addEndBtn = document.getElementById("addEndBtn");
const exportBtn = document.getElementById("exportBtn");
const segmentsList = document.getElementById("segmentsList");
const toast = document.getElementById("toast");

// Loader DOM
const loader = document.getElementById("loader");
const loaderTitle = document.getElementById("loaderTitle");
const loaderText = document.getElementById("loaderText");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

// Utils
function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  const parts = [];
  if (h > 0) parts.push(h.toString().padStart(2, "0"));
  parts.push(m.toString().padStart(2, "0"));
  parts.push(s.toString().padStart(2, "0"));

  return parts.join(":") + "." + ms.toString().padStart(2, "0");
}

function showToast(message, duration = 3000) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

// FFmpeg Initialization
async function initFFmpeg() {
  if (ffmpeg !== null) return ffmpeg;

  loader.style.display = "flex";
  loaderTitle.textContent = "Initializing Engine...";
  loaderText.textContent =
    "Loading FFmpeg WebAssembly. This depends on your internet connection and only happens once per session.";

  ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress, time }) => {
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
      workerURL: base + "ffmpeg/worker.js",
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

// File Selection
browseBtn.addEventListener("click", () => {
  videoInput.click();
});

videoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    videoFile = file;
    videoFileName = file.name;
    fileNameDisplay.textContent = videoFileName;

    // Use object URL for preview
    const fileURL = URL.createObjectURL(file);
    video.src = fileURL;
    video.load();

    segments = [];
    renderSegments();
    showToast("Video loaded successfully");
  }
});

// Video Events
video.addEventListener("loadedmetadata", () => {
  timeline.max = video.duration;
  durationDisplay.textContent = formatTime(video.duration);
});

video.addEventListener("timeupdate", () => {
  if (!timeline.matches(":active")) {
    timeline.value = video.currentTime;
  }
  currentTimeDisplay.textContent = formatTime(video.currentTime);
});

// Controls
const playIconPath = "M8 5v14l11-7z";
const pauseIconPath = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";

playPauseBtn.addEventListener("click", () => {
  const svgPath = playPauseBtn.querySelector("path");
  if (video.paused) {
    video.play();
    if (svgPath) svgPath.setAttribute("d", pauseIconPath);
    playPauseBtn.setAttribute("aria-label", "Pause");
  } else {
    video.pause();
    if (svgPath) svgPath.setAttribute("d", playIconPath);
    playPauseBtn.setAttribute("aria-label", "Play");
  }
});

timeline.addEventListener("input", () => {
  video.currentTime = timeline.value;
});

// Segment Management
addStartBtn.addEventListener("click", () => {
  pendingStart = video.currentTime;
  showToast(`Start marked at ${formatTime(pendingStart)}`);
  addEndBtn.style.boxShadow = "0 0 15px rgba(99, 102, 241, 0.8)";
});

addEndBtn.addEventListener("click", () => {
  const start = pendingStart !== null ? pendingStart : 0;
  const end = video.currentTime;

  if (end <= start) {
    showToast("End must be after start", 3000);
    return;
  }

  addSegment(start, end);
  pendingStart = null;
  addEndBtn.style.boxShadow = "";
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

  if (segments.length === 0) {
    segmentsList.innerHTML =
      '<div class="empty-state">Add segments using the timeline buttons</div>';
    timelineSegments.innerHTML = "";
    return;
  }

  // Sort segments by start time
  segments.sort((a, b) => a.start - b.start);

  segmentsList.innerHTML = "";
  timelineSegments.innerHTML = "";

  segments.forEach((seg) => {
    // Timeline mark
    const mark = document.createElement("div");
    mark.className = "segment-mark";
    const left = (seg.start / video.duration) * 100;
    const width = ((seg.end - seg.start) / video.duration) * 100;
    mark.style.left = `${left}%`;
    mark.style.width = `${width}%`;
    timelineSegments.appendChild(mark);

    // List item
    const item = document.createElement("div");
    item.className = "segment-item";
    item.innerHTML = `
            <div class="segment-info">
                <strong>Segment #${seg.id}</strong>
                <div class="segment-times">
                    <input type="text" value="${seg.start.toFixed(2)}" data-id="${seg.id}" data-type="start">
                    <span>to</span>
                    <input type="text" value="${seg.end.toFixed(2)}" data-id="${seg.id}" data-type="end">
                </div>
            </div>
            <div class="segment-actions">
                <button class="text-btn watch-btn" data-id="${seg.id}">Watch</button>
                <button class="text-btn delete-btn" data-id="${seg.id}">Remove</button>
            </div>
        `;
    segmentsList.appendChild(item);
  });

  // Add event listeners to new elements
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.onclick = () => removeSegment(parseInt(btn.dataset.id));
  });

  document.querySelectorAll(".watch-btn").forEach((btn) => {
    btn.onclick = () => {
      const seg = segments.find((s) => s.id === parseInt(btn.dataset.id));
      video.currentTime = seg.start;
      video.play();
    };
  });

  document.querySelectorAll(".segment-times input").forEach((input) => {
    input.onblur = (e) => {
      const id = parseInt(input.dataset.id);
      const type = input.dataset.type;
      const val = parseFloat(input.value);
      const seg = segments.find((s) => s.id === id);

      if (!isNaN(val)) {
        if (type === "start") {
          if (val < seg.end) seg.start = val;
          else showToast("Start must be before end");
        } else {
          if (val > seg.start) seg.end = val;
          else showToast("End must be after start");
        }
        renderSegments();
      }
    };
    input.onkeydown = (e) => {
      if (e.key === "Enter") input.blur();
    };
  });
}

// Export logic
exportBtn.addEventListener("click", async () => {
  if (!videoFile || segments.length === 0) return;

  try {
    const ff = await initFFmpeg();

    loader.style.display = "flex";
    progressContainer.style.display = "block";
    progressText.style.display = "block";
    progressBar.style.width = "0%";
    progressText.textContent = "0%";

    loaderTitle.textContent = "Preparing File...";
    loaderText.textContent = "Loading video into virtual file system...";

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

      loaderTitle.textContent = `Processing Segment ${i + 1} of ${segments.length}...`;
      loaderText.textContent =
        "Re-encoding to ensure perfect frame accuracy without artifacts. Please wait.";
      progressBar.style.width = "0%";
      progressText.textContent = "0%";

      const startStr = seg.start.toString();
      const durationStr = (seg.end - seg.start).toString();

      // Re-encoding video with ultrafast preset ensures accuracy (no first-frame glitches)
      // while minimizing processing time in the browser. Audio is copied.
      await ff.exec([
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
      ]);

      const outData = await ff.readFile(outFileName);
      zip.file(`${baseName}_clip_${i + 1}.mp4`, outData.buffer);

      // Clean up the output file from virtual FS to save memory
      await ff.deleteFile(outFileName);
    }

    loaderTitle.textContent = "Zipping files...";
    loaderText.textContent = "Creating the final download package...";
    progressContainer.style.display = "none";
    progressText.style.display = "none";

    const zipBlob = await zip.generateAsync({ type: "blob" });

    // Download Zip
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_clips.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Clean up input file
    await ff.deleteFile(inFileName);

    showToast("Export successful!");
  } catch (err) {
    console.error("Export Error:", err);
    showToast("Export failed. Check console for details.", 5000);
  } finally {
    loader.style.display = "none";
  }
});

// Initialize on page load
window.addEventListener("DOMContentLoaded", async () => {
  // Unregister any lingering coi-serviceworkers that enforce strict COEP
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
    } catch (e) {
      console.warn("Service worker cleanup failed:", e);
    }
  }

  initFFmpeg().catch((err) => {
    console.warn("Background init failed, will retry on export:", err);
  });
});
