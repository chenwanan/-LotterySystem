const STORAGE_KEY = "lottery-system-v3";

function defaultState() {
  return {
    prizes: [],
    participants: [],
    history: [],
    updatedAt: new Date().toISOString(),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      prizes: Array.isArray(parsed.prizes) ? parsed.prizes : [],
      participants: Array.isArray(parsed.participants) ? parsed.participants : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeName(line) {
  return line
    .trim()
    .replace(/[，,、\t]+/g, " ")
    .replace(/\s+/g, " ");
}

function getAllWinnersSet(state) {
  return new Set(state.prizes.flatMap((p) => p.winners || []));
}

window.LotteryStore = {
  STORAGE_KEY,
  loadState,
  saveState,
  uid,
  normalizeName,
  getAllWinnersSet,
};
