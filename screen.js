const { loadState, saveState, getAllWinnersSet } = window.LotteryStore;

const refs = {
  prizeSelect: document.getElementById("prizeSelect"),
  quotaInfo: document.getElementById("quotaInfo"),
  roundInfo: document.getElementById("roundInfo"),
  startBtn: document.getElementById("startBtn"),
  stopBtn: document.getElementById("stopBtn"),
  rollingBox: document.getElementById("rollingBox"),
  roundResult: document.getElementById("roundResult"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  fxCanvas: document.getElementById("fxCanvas"),
};

const state = loadState();
let rollingTimer = null;
let rollingNames = [];

function getPrizeById() {
  return state.prizes.find((p) => p.id === refs.prizeSelect.value);
}

function getRemainingPool() {
  const winners = getAllWinnersSet(state);
  return state.participants.filter((p) => !winners.has(p));
}

function remainingForPrize(prize) {
  return prize.totalCount - (prize.winners || []).length;
}

function renderPrizeOptions() {
  refs.prizeSelect.innerHTML = "";
  state.prizes.forEach((prize) => {
    const option = document.createElement("option");
    option.value = prize.id;
    option.textContent = `${prize.name}（剩余 ${Math.max(remainingForPrize(prize), 0)}）`;
    refs.prizeSelect.append(option);
  });
  updatePrizeInfo();
}

function updatePrizeInfo() {
  const prize = getPrizeById();
  if (!prize) {
    refs.quotaInfo.textContent = "剩余名额：0";
    refs.roundInfo.textContent = "每轮抽取：0";
    refs.startBtn.disabled = true;
    return;
  }
  const remain = remainingForPrize(prize);
  refs.quotaInfo.textContent = `剩余名额：${Math.max(remain, 0)}`;
  refs.roundInfo.textContent = `每轮抽取：${prize.roundCount}`;
  refs.startBtn.disabled = remain <= 0 || getRemainingPool().length <= 0;
}

function randomNames(count) {
  const pool = state.participants;
  return Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)] || "...");
}

function drawWinners(prize) {
  const remainQuota = remainingForPrize(prize);
  const pool = getRemainingPool();
  const count = Math.min(prize.roundCount, remainQuota, pool.length);
  if (count <= 0) return [];

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const winners = pool.slice(0, count);
  prize.winners = [...(prize.winners || []), ...winners];
  state.history.push({
    time: new Date().toLocaleString("zh-CN", { hour12: false }),
    prizeId: prize.id,
    prizeName: prize.name,
    winners,
  });
  saveState(state);
  return winners;
}

function renderRoundResult(winners) {
  refs.roundResult.innerHTML = "";
  winners.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    refs.roundResult.append(li);
  });
}

function startRolling() {
  const prize = getPrizeById();
  if (!prize) {
    alert("请先到设置页配置奖项");
    return;
  }

  refs.startBtn.disabled = true;
  refs.stopBtn.disabled = false;
  refs.roundResult.innerHTML = "";
  refs.rollingBox.classList.add("rolling");

  rollingTimer = setInterval(() => {
    rollingNames = randomNames(prize.roundCount);
    refs.rollingBox.textContent = rollingNames.join("  ·  ");
  }, 80);
}

function stopRolling() {
  const prize = getPrizeById();
  if (!prize || !rollingTimer) return;

  clearInterval(rollingTimer);
  rollingTimer = null;
  refs.stopBtn.disabled = true;
  refs.rollingBox.classList.remove("rolling");

  const winners = drawWinners(prize);
  if (winners.length === 0) {
    refs.rollingBox.textContent = "该奖项已抽完，或无可抽人员";
    updatePrizeInfo();
    renderPrizeOptions();
    return;
  }

  refs.rollingBox.textContent = `🎉 ${winners.join("、")} 🎉`;
  renderRoundResult(winners);
  firework();

  renderPrizeOptions();
  updatePrizeInfo();
}

function firework() {
  const canvas = refs.fxCanvas;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 160 }, () => ({
    x: canvas.width * 0.5,
    y: canvas.height * 0.48,
    a: Math.random() * Math.PI * 2,
    s: 2 + Math.random() * 6,
    r: 2 + Math.random() * 3,
    c: `hsl(${Math.random() * 360}, 90%, 60%)`,
    life: 40 + Math.random() * 35,
  }));

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += Math.cos(p.a) * p.s;
      p.y += Math.sin(p.a) * p.s + 0.7;
      p.life -= 1;
      ctx.globalAlpha = Math.max(p.life / 60, 0);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    if (particles.some((p) => p.life > 0)) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  tick();
}

refs.prizeSelect.addEventListener("change", updatePrizeInfo);
refs.startBtn.addEventListener("click", startRolling);
refs.stopBtn.addEventListener("click", stopRolling);
refs.fullscreenBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});

renderPrizeOptions();
updatePrizeInfo();
