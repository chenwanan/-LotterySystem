const {
  loadState,
  saveState,
  uid,
  normalizeName,
  getAllWinnersSet,
} = window.LotteryStore;

const refs = {
  prizeName: document.getElementById("prizeName"),
  prizeTotal: document.getElementById("prizeTotal"),
  prizeRound: document.getElementById("prizeRound"),
  addPrizeBtn: document.getElementById("addPrizeBtn"),
  prizeList: document.getElementById("prizeList"),
  participantsInput: document.getElementById("participantsInput"),
  importBtn: document.getElementById("importBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  clearBtn: document.getElementById("clearBtn"),
  stats: document.getElementById("stats"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  resetBtn: document.getElementById("resetBtn"),
};

const state = loadState();

function renderPrizes() {
  refs.prizeList.innerHTML = "";
  state.prizes.forEach((prize) => {
    const li = document.createElement("li");
    li.className = "list-item";
    const used = (prize.winners || []).length;
    li.innerHTML = `
      <span>${prize.name}｜总名额 ${prize.totalCount}｜每轮 ${prize.roundCount}｜已抽 ${used}</span>
      <button class="btn btn-danger btn-sm" data-id="${prize.id}">删除</button>
    `;
    refs.prizeList.append(li);
  });
}

function renderParticipants() {
  const winnerSet = getAllWinnersSet(state);
  refs.stats.textContent = `当前人数：${state.participants.length}，已中奖：${winnerSet.size}`;
}

function saveAndRender() {
  saveState(state);
  renderPrizes();
  renderParticipants();
}

function addPrize() {
  const name = refs.prizeName.value.trim();
  const totalCount = Number(refs.prizeTotal.value);
  const roundCount = Number(refs.prizeRound.value);
  if (!name || totalCount < 1 || roundCount < 1) {
    alert("请填写有效奖项信息");
    return;
  }
  state.prizes.push({ id: uid(), name, totalCount, roundCount, winners: [] });
  refs.prizeName.value = "";
  saveAndRender();
}

function importParticipants() {
  const names = refs.participantsInput.value
    .split("\n")
    .map(normalizeName)
    .filter(Boolean);
  state.participants = Array.from(new Set(names));
  refs.participantsInput.value = "";
  saveAndRender();
}

function shuffleParticipants() {
  for (let i = state.participants.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.participants[i], state.participants[j]] = [state.participants[j], state.participants[i]];
  }
  saveAndRender();
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `lottery-settings-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (!Array.isArray(data.prizes) || !Array.isArray(data.participants)) {
        throw new Error("invalid data");
      }
      state.prizes = data.prizes.map((p) => ({
        ...p,
        winners: Array.isArray(p.winners) ? p.winners : [],
      }));
      state.participants = data.participants;
      state.history = Array.isArray(data.history) ? data.history : [];
      saveAndRender();
      alert("导入成功");
    } catch {
      alert("导入失败，文件格式错误");
    }
  };
  reader.readAsText(file, "utf-8");
}

refs.addPrizeBtn.addEventListener("click", addPrize);
refs.importBtn.addEventListener("click", importParticipants);
refs.shuffleBtn.addEventListener("click", shuffleParticipants);
refs.clearBtn.addEventListener("click", () => {
  state.participants = [];
  saveAndRender();
});
refs.prizeList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  const id = btn.dataset.id;
  state.prizes = state.prizes.filter((p) => p.id !== id);
  state.history = state.history.filter((h) => h.prizeId !== id);
  saveAndRender();
});
refs.exportBtn.addEventListener("click", exportBackup);
refs.importFile.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) importBackup(file);
  e.target.value = "";
});
refs.resetBtn.addEventListener("click", () => {
  if (!confirm("确定重置全部数据？")) return;
  state.prizes = [];
  state.participants = [];
  state.history = [];
  saveAndRender();
});

renderPrizes();
renderParticipants();
