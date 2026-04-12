const { FFmpeg } = window.FFmpegWASM;

let videoFile = null;
let videoFileName = "";
let segments = [];
let pendingStart = null;
let nextId = 1;
let ffmpeg = null;

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

const loader = document.getElementById("loader");
const loaderTitle = document.getElementById("loaderTitle");
const loaderText = document.getElementById("loaderText");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const exportModal = document.getElementById("exportModal");
const fastExportBtn = document.getElementById("fastExportBtn");
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

browseBtn.addEventListener("click", () => {
  videoInput.click();
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
});

video.addEventListener("timeupdate", () => {
  if (!timeline.matches(":active")) {
    timeline.value = video.currentTime;
  }
  currentTimeDisplay.textContent = formatTime(video.currentTime);
});

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

  segments.sort((a, b) => a.start - b.start);

  segmentsList.innerHTML = "";
  timelineSegments.innerHTML = "";

  segments.forEach((seg) => {
    const mark = document.createElement("div");
    mark.className = "segment-mark";
    const left = (seg.start / video.duration) * 100;
    const width = ((seg.end - seg.start) / video.duration) * 100;
    mark.style.left = `${left}%`;
    mark.style.width = `${width}%`;
    timelineSegments.appendChild(mark);

    const item = document.createElement("div");
    item.className = "segment-item";
    item.innerHTML = `
            <div class="segment-info">
                <strong>Segment #${seg.id} <span class="segment-duration">(${(seg.end - seg.start).toFixed(2)}s)</span></strong>
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

exportBtn.addEventListener("click", () => {
  if (!videoFile || segments.length === 0) return;
  exportModal.style.display = "flex";
});

cancelExportBtn.addEventListener("click", () => {
  exportModal.style.display = "none";
});

fastExportBtn.addEventListener("click", () => {
  exportModal.style.display = "none";
  performExport(false);
});

accurateExportBtn.addEventListener("click", () => {
  exportModal.style.display = "none";
  performExport(true);
});

async function performExport(accurate = true) {
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
      loaderText.textContent = accurate
        ? "Re-encoding for perfect frame accuracy..."
        : "Fast-cutting without re-encoding...";

      progressBar.style.width = "0%";
      progressText.textContent = "0%";

      const startStr = seg.start.toString();
      const durationStr = (seg.end - seg.start).toString();

      if (accurate) {
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
      } else {
        await ff.exec([
          "-ss",
          startStr,
          "-i",
          inFileName,
          "-t",
          durationStr,
          "-c",
          "copy",
          outFileName,
        ]);
      }

      const outData = await ff.readFile(outFileName);
      zip.file(`${baseName}_clip_${i + 1}.mp4`, outData.buffer);
      await ff.deleteFile(outFileName);
    }

    loaderTitle.textContent = "Zipping files...";
    loaderText.textContent = "Creating final package...";
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
    showToast("Export failed. Check console for details.", 5000);
  } finally {
    loader.style.display = "none";
  }
}

const themeToggle = document.getElementById("themeToggle");

function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    themeToggle.textContent = "THEME_LIGHT";
  } else {
    themeToggle.textContent = "THEME_DARK";
  }
}

themeToggle.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light-mode");
  localStorage.setItem("theme", isLight ? "light" : "dark");
  themeToggle.textContent = isLight ? "THEME_LIGHT" : "THEME_DARK";
  showToast(`Switched to ${isLight ? "Light" : "Dark"} Mode`);
});

window.addEventListener("DOMContentLoaded", async () => {
  initTheme();
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
