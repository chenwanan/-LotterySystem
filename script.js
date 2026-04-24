const STORAGE_KEY = "lottery-system-v1";

const state = {
  prizes: [],
  participants: [],
  winnersByPrize: {},
  history: [],
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
  drawPrizeSelect: document.getElementById("drawPrizeSelect"),
  drawBtn: document.getElementById("drawBtn"),
  lotteryScreen: document.getElementById("lotteryScreen"),
  winnerList: document.getElementById("winnerList"),
  historyList: document.getElementById("historyList"),
  exportHistoryBtn: document.getElementById("exportHistoryBtn"),
  resetAllBtn: document.getElementById("resetAllBtn"),
  prizeItemTemplate: document.getElementById("prizeItemTemplate"),
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeName(line) {
  return line
    .trim()
    .replace(/[，,、\t]+/g, " ")
    .replace(/\s+/g, " ");
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function restore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.prizes)) state.prizes = parsed.prizes;
    if (Array.isArray(parsed.participants)) state.participants = parsed.participants;
    if (parsed.winnersByPrize && typeof parsed.winnersByPrize === "object") {
      state.winnersByPrize = parsed.winnersByPrize;
    }
    if (Array.isArray(parsed.history)) state.history = parsed.history;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
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
      li.textContent = `${h.time} · ${h.prize} → ${h.winner}`;
      refs.historyList.append(li);
    });
}

function drawOne(prize) {
  const won = state.winnersByPrize[prize.id] || [];
  if (won.length >= prize.count) {
    alert("该奖项已抽完");
    return null;
  }

  const pool = state.participants.filter((p) => !Object.values(state.winnersByPrize).flat().includes(p));
  if (pool.length === 0) {
    alert("没有可抽取的参与者");
    return null;
  }

  const winner = pool[Math.floor(Math.random() * pool.length)];
  state.winnersByPrize[prize.id] = [...won, winner];
  state.history.push({
    time: new Date().toLocaleString("zh-CN", { hour12: false }),
    prize: prize.name,
    winner,
  });
  persist();
  return winner;
}

function animateDraw(finalName) {
  return new Promise((resolve) => {
    refs.lotteryScreen.classList.add("rolling");
    let tick = 0;
    const timer = setInterval(() => {
      const random = state.participants[Math.floor(Math.random() * state.participants.length)] || "...";
      refs.lotteryScreen.textContent = random;
      tick += 1;
      if (tick > 16) {
        clearInterval(timer);
        refs.lotteryScreen.classList.remove("rolling");
        refs.lotteryScreen.textContent = `🎊 ${finalName} 🎊`;
        resolve();
      }
    }, 90);
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

  const bits = Array.from({ length: 120 }, () => ({
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
    if (frame < 180) requestAnimationFrame(loop);
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

  state.prizes.push({ id: uid(), name, count });
  refs.prizeName.value = "";
  refs.prizeCount.value = "1";
  persist();
  renderPrizes();
  renderWinners();
}

function importParticipants() {
  const lines = refs.participantsInput.value
    .split("\n")
    .map(normalizeName)
    .filter(Boolean);
  const unique = Array.from(new Set(lines));
  state.participants = unique;
  refs.participantsInput.value = "";
  persist();
  renderParticipants();
}

function removePrize(id) {
  state.prizes = state.prizes.filter((p) => p.id !== id);
  delete state.winnersByPrize[id];
  persist();
  renderPrizes();
  renderWinners();
  renderHistory();
}

async function startDraw() {
  const prizeId = refs.drawPrizeSelect.value;
  const prize = state.prizes.find((p) => p.id === prizeId);
  if (!prize) {
    alert("请先添加奖项");
    return;
  }

  const winner = drawOne(prize);
  if (!winner) return;

  refs.drawBtn.disabled = true;
  await animateDraw(winner);
  refs.drawBtn.disabled = false;

  renderPrizes();
  renderWinners();
  renderHistory();
  fireConfetti();
}

function exportHistory() {
  const blob = new Blob([JSON.stringify(state.history, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `lottery-history-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function resetAll() {
  if (!confirm("确定清空全部数据吗？")) return;
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
  state.participants = shuffle(state.participants);
  persist();
  renderParticipants();
});
refs.clearParticipantsBtn.addEventListener("click", () => {
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
refs.exportHistoryBtn.addEventListener("click", exportHistory);
refs.resetAllBtn.addEventListener("click", resetAll);

restore();
renderAll();
