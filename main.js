const CODE = ["blue", "green", "red", "yellow"];
const COLORS = ["blue", "green", "red", "yellow"];
let input = [];

const screens = {
  lock: document.getElementById("screen-lock"),
  admin: document.getElementById("screen-admin"),
  play: document.getElementById("screen-play")
};

function show(screen) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[screen].classList.add("active");
}

document.querySelectorAll(".cell").forEach(cell => {
  cell.onclick = () => {
    input.push(cell.dataset.color);
    if (input.length === CODE.length) {
      if (input.join() === CODE.join()) show("admin");
      input = [];
    }
  };
});

let recordings = { good: [], bad: [] };
let recorder, chunks = [];
let playing = false;
let currentMode = null;

const goodList = document.getElementById("goodList");
const badList = document.getElementById("badList");
const nowPlaying = document.getElementById("nowPlaying");
const modeIndicator = document.getElementById("modeIndicator");

document.getElementById("recordBtn").onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recorder = new MediaRecorder(stream);
  chunks = [];

  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: "audio/webm" });
    const name = nameInput.value || "Untitled";
    const type = typeInput.value;

    recordings[type].push({ name, blob });
    render();
  };

  recorder.start();
};

document.getElementById("stopBtn").onclick = () => recorder?.stop();

function render() {
  goodList.innerHTML = "";
  badList.innerHTML = "";

  ["good", "bad"].forEach(type => {
    recordings[type].forEach((r, i) => {
      const li = document.createElement("li");
      li.textContent = r.name;
      li.onclick = () => {
        recordings[type].splice(i, 1);
        render();
      };
      (type === "good" ? goodList : badList).appendChild(li);
    });
  });
}

document.getElementById("playBtn").onclick = () => {
  show("play");
  nowPlaying.textContent = "Select mode";
};

document.getElementById("playGood").onclick = () => startLoop("good");
document.getElementById("playBad").onclick = () => startLoop("bad");

async function startLoop(mode) {
  if (!recordings[mode].length) return;

  playing = true;
  currentMode = mode;

  modeIndicator.textContent = `MODE: ${mode.toUpperCase()}`;

  while (playing && currentMode === mode) {
    const list = recordings[mode];
    const pick = list[Math.floor(Math.random() * list.length)];

    nowPlaying.classList.remove("show");
    await cooldown(200);

    nowPlaying.textContent = `"${pick.name}"`;
    nowPlaying.classList.add("show");

    const audio = new Audio(URL.createObjectURL(pick.blob));
    audio.play();

    await waitForAudio(audio);
    await cooldown(1000); // 1 second gap
  }
}


function waitForAudio(audio) {
  return new Promise(resolve => {
    audio.onended = resolve;
  });
}

function cooldown(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

document.getElementById("lockBtn").onclick = () => {
  playing = false;
  currentMode = null;
  modeIndicator.textContent = "MODE: —";
  nowPlaying.textContent = "Stopped";
  nowPlaying.classList.remove("show");

  randomizeGrid(); // 👈 important
  show("lock");
};


function blobToBase64(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(data) {
  return fetch(data).then(r => r.blob());
}

document.getElementById("importBtn").onclick = () => {
  document.getElementById("importInput").click();
};

document.getElementById("importInput").onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const data = JSON.parse(text);

  recordings = { good: [], bad: [] };

  for (const type of ["good", "bad"]) {
    for (const r of data[type]) {
      const blob = await base64ToBlob(r.audio);
      recordings[type].push({ name: r.name, blob });
    }
  }

  render();
};

document.getElementById("exportBtn").onclick = async () => {
  const data = { good: [], bad: [] };

  for (const type of ["good", "bad"]) {
    for (const r of recordings[type]) {
      data[type].push({
        name: r.name,
        audio: await blobToBase64(r.blob)
      });
    }
  }

  const file = new Blob([JSON.stringify(data)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = "plant_recordings.json";
  a.click();
};

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function randomizeGrid() {
  const cells = document.querySelectorAll(".cell");
  const pool = [];

  // guarantee at least one of each color
  COLORS.forEach(color => pool.push(color));

  // fill remaining slots randomly
  while (pool.length < cells.length) {
    pool.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
  }

  // shuffle positions
  shuffle(pool);

  // apply to grid
  cells.forEach((cell, i) => {
    cell.className = "cell " + pool[i];
    cell.dataset.color = pool[i];
  });
}

randomizeGrid();
