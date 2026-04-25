const STORAGE_KEY = "lottery-system-v2";

const state = {
  prizes: [],
  participants: [],
  winnersByPrize: {},
  history: [],
  snapshots: [],
};

const refs = {
  prizeName: document.getElementById("prizeName"),
  prizeCount: document.getElementById("prizeCount"),
  addPrizeBtn: document.getElementById("addPrizeBtn"),
  prizeList: document.getElementById("prizeList"),
  participantsInput: document.getElementById("participantsInput"),
  importParticipantsBtn: document.getElementById("importParticipantsBtn"),
  shuffleParticipantsBtn: document.getElementById("shuffleParticipantsBtn"),
  clearParticipantsBtn: document.getElementById("clearParticipantsBtn"),
  participantStats: document.getElementById("participantStats"),
  remainingList: document.getElementById("remainingList"),
  drawPrizeSelect: document.getElementById("drawPrizeSelect"),
  drawCount: document.getElementById("drawCount"),
  drawBtn: document.getElementById("drawBtn"),
  lotteryScreen: document.getElementById("lotteryScreen"),
  winnerList: document.getElementById("winnerList"),
  historyList: document.getElementById("historyList"),
  undoLastBtn: document.getElementById("undoLastBtn"),
  exportHistoryBtn: document.getElementById("exportHistoryBtn"),
  exportAllBtn: document.getElementById("exportAllBtn"),
  importAllInput: document.getElementById("importAllInput"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  resetAllBtn: document.getElementById("resetAllBtn"),
  prizeItemTemplate: document.getElementById("prizeItemTemplate"),
};

const clone = (obj) => JSON.parse(JSON.stringify(obj));
const uid = () => Math.random().toString(36).slice(2, 10);

function normalizeName(line) {
  return line
    .trim()
    .replace(/[，,、\t]+/g, " ")
    .replace(/\s+/g, " ");
}

function getAllWinnersSet() {
  return new Set(Object.values(state.winnersByPrize).flat());
}

function getRemainingParticipants() {
  const winnersSet = getAllWinnersSet();
  return state.participants.filter((p) => !winnersSet.has(p));
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      prizes: state.prizes,
      participants: state.participants,
      winnersByPrize: state.winnersByPrize,
      history: state.history,
    }),
  );
}

function restore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.prizes)) state.prizes = parsed.prizes;
    if (Array.isArray(parsed.participants)) state.participants = parsed.participants;
    if (parsed.winnersByPrize && typeof parsed.winnersByPrize === "object") state.winnersByPrize = parsed.winnersByPrize;
    if (Array.isArray(parsed.history)) state.history = parsed.history;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function pushSnapshot() {
  state.snapshots.push(
    clone({
      prizes: state.prizes,
      participants: state.participants,
      winnersByPrize: state.winnersByPrize,
      history: state.history,
    }),
  );
  if (state.snapshots.length > 20) state.snapshots.shift();
}

function renderPrizes() {
  refs.prizeList.innerHTML = "";
  refs.drawPrizeSelect.innerHTML = "";
  state.prizes.forEach((prize) => {
    const won = (state.winnersByPrize[prize.id] || []).length;
    const li = refs.prizeItemTemplate.content.cloneNode(true);
    li.querySelector(".meta").textContent = `${prize.name}（${won}/${prize.count}）`;
    li.querySelector(".remove").dataset.id = prize.id;
    refs.prizeList.append(li);

    const option = document.createElement("option");
    option.value = prize.id;
    option.textContent = `${prize.name}（剩余 ${Math.max(prize.count - won, 0)}）`;
    refs.drawPrizeSelect.append(option);
  });
}

function renderParticipants() {
  refs.participantStats.textContent = `当前参与者：${state.participants.length} 人`;
  refs.remainingList.innerHTML = "";
  const remaining = getRemainingParticipants();
  remaining.slice(0, 60).forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    refs.remainingList.append(li);
  });
  if (remaining.length > 60) {
    const li = document.createElement("li");
    li.textContent = `... 还有 ${remaining.length - 60} 人`;
    refs.remainingList.append(li);
  }
}

function renderWinners() {
  const prizeId = refs.drawPrizeSelect.value;
  refs.winnerList.innerHTML = "";
  if (!prizeId || !state.winnersByPrize[prizeId]) return;
  state.winnersByPrize[prizeId].forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    refs.winnerList.append(li);
  });
}

function renderHistory() {
  refs.historyList.innerHTML = "";
  state.history
    .slice()
    .reverse()
    .forEach((h) => {
      const li = document.createElement("li");
      li.textContent = `${h.time} · ${h.prize} → ${h.winners.join("、")}`;
      refs.historyList.append(li);
    });
}

function animateDraw(finalNames) {
  return new Promise((resolve) => {
    refs.lotteryScreen.classList.add("rolling");
    let tick = 0;
    const timer = setInterval(() => {
      const pool = state.participants;
      const random = pool[Math.floor(Math.random() * pool.length)] || "...";
      refs.lotteryScreen.textContent = random;
      tick += 1;
      if (tick > 18) {
        clearInterval(timer);
        refs.lotteryScreen.classList.remove("rolling");
        refs.lotteryScreen.textContent = `🎊 ${finalNames.join("、")} 🎊`;
        resolve();
      }
    }, 85);
  });
}

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function fireConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const bits = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height,
    w: 5 + Math.random() * 8,
    h: 8 + Math.random() * 14,
    v: 2 + Math.random() * 4,
    drift: (Math.random() - 0.5) * 2,
    c: `hsl(${Math.random() * 360}, 85%, 60%)`,
  }));

  let frame = 0;
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bits.forEach((b) => {
      b.y += b.v;
      b.x += b.drift;
      ctx.fillStyle = b.c;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });
    frame += 1;
    if (frame < 190) requestAnimationFrame(loop);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  loop();
}

function addPrize() {
  const name = refs.prizeName.value.trim();
  const count = Number(refs.prizeCount.value);
  if (!name || !count || count < 1) {
    alert("请填写有效奖项信息");
    return;
  }

  pushSnapshot();
  state.prizes.push({ id: uid(), name, count });
  refs.prizeName.value = "";
  refs.prizeCount.value = "1";
  persist();
  renderAll();
}

function importParticipants() {
  const lines = refs.participantsInput.value
    .split("\n")
    .map(normalizeName)
    .filter(Boolean);
  const unique = Array.from(new Set(lines));
  pushSnapshot();
  state.participants = unique;
  refs.participantsInput.value = "";
  persist();
  renderParticipants();
}

function removePrize(id) {
  pushSnapshot();
  state.prizes = state.prizes.filter((p) => p.id !== id);
  delete state.winnersByPrize[id];
  persist();
  renderAll();
}

function drawBatch(prize, count) {
  const won = state.winnersByPrize[prize.id] || [];
  const remainQuota = prize.count - won.length;
  const pool = shuffle(getRemainingParticipants());
  const realCount = Math.min(count, remainQuota, pool.length);
  if (realCount <= 0) return [];

  const winners = pool.slice(0, realCount);
  state.winnersByPrize[prize.id] = [...won, ...winners];
  state.history.push({
    time: new Date().toLocaleString("zh-CN", { hour12: false }),
    prize: prize.name,
    prizeId: prize.id,
    winners,
  });
  return winners;
}

async function startDraw() {
  const prizeId = refs.drawPrizeSelect.value;
  const prize = state.prizes.find((p) => p.id === prizeId);
  const drawCount = Math.max(Number(refs.drawCount.value) || 1, 1);
  if (!prize) {
    alert("请先添加奖项");
    return;
  }

  pushSnapshot();
  const winners = drawBatch(prize, drawCount);
  if (winners.length === 0) {
    alert("该奖项已抽完，或没有可抽取的参与者");
    return;
  }

  refs.drawBtn.disabled = true;
  await animateDraw(winners);
  refs.drawBtn.disabled = false;

  persist();
  renderAll();
  fireConfetti();
}

function undoLast() {
  const snap = state.snapshots.pop();
  if (!snap) {
    alert("没有可撤销的操作");
    return;
  }
  state.prizes = snap.prizes;
  state.participants = snap.participants;
  state.winnersByPrize = snap.winnersByPrize;
  state.history = snap.history;
  persist();
  renderAll();
}

function exportFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportHistory() {
  exportFile(`lottery-history-${Date.now()}.json`, state.history);
}

function exportAll() {
  exportFile(`lottery-backup-${Date.now()}.json`, {
    prizes: state.prizes,
    participants: state.participants,
    winnersByPrize: state.winnersByPrize,
    history: state.history,
  });
}

function importAll(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (!Array.isArray(data.prizes) || !Array.isArray(data.participants)) {
        throw new Error("invalid");
      }
      pushSnapshot();
      state.prizes = data.prizes;
      state.participants = data.participants;
      state.winnersByPrize = data.winnersByPrize || {};
      state.history = data.history || [];
      persist();
      renderAll();
      alert("导入成功");
    } catch {
      alert("导入失败，文件格式不正确");
    }
  };
  reader.readAsText(file, "utf-8");
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
}

function resetAll() {
  if (!confirm("确定清空全部数据吗？")) return;
  pushSnapshot();
  state.prizes = [];
  state.participants = [];
  state.winnersByPrize = {};
  state.history = [];
  persist();
  refs.lotteryScreen.textContent = "准备就绪";
  renderAll();
}

function renderAll() {
  renderPrizes();
  renderParticipants();
  renderWinners();
  renderHistory();
}

refs.addPrizeBtn.addEventListener("click", addPrize);
refs.importParticipantsBtn.addEventListener("click", importParticipants);
refs.shuffleParticipantsBtn.addEventListener("click", () => {
  pushSnapshot();
  state.participants = shuffle(state.participants);
  persist();
  renderParticipants();
});
refs.clearParticipantsBtn.addEventListener("click", () => {
  pushSnapshot();
  state.participants = [];
  persist();
  renderParticipants();
});
refs.prizeList.addEventListener("click", (e) => {
  const btn = e.target.closest("button.remove");
  if (!btn) return;
  removePrize(btn.dataset.id);
});
refs.drawPrizeSelect.addEventListener("change", renderWinners);
refs.drawBtn.addEventListener("click", startDraw);
refs.undoLastBtn.addEventListener("click", undoLast);
refs.exportHistoryBtn.addEventListener("click", exportHistory);
refs.exportAllBtn.addEventListener("click", exportAll);
refs.importAllInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) importAll(file);
  e.target.value = "";
});
refs.fullscreenBtn.addEventListener("click", toggleFullscreen);
refs.resetAllBtn.addEventListener("click", resetAll);

restore();
renderAll();
