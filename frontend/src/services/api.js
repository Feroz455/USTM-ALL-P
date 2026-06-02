// src/services/api.js
// Relative URL — Vite dev proxy (/api → localhost:8000) ve
// Docker nginx proxy (/api/ → http://backend:8000) ile çalışır
const BASE = "/api/v1";

function getToken() {
  return localStorage.getItem("sting_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("sting_token");
    window.location.href = "/login";
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Bir hata oluştu");
  return data;
}

// --- Auth ---
export async function login(username, password) {
  const form = new URLSearchParams({ username, password });
  const res = await fetch(`${BASE}/auth/token`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Giriş başarısız");
  return data;
}

export async function register(payload) {
  return request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  return request("/auth/me");
}

// --- Tab 1: Repurposing ---
export async function runRepurposing({ ligandFile, proteinFile, topN, pairMode, sessionName }) {
  const form = new FormData();
  form.append("ligand_file", ligandFile);
  form.append("protein_file", proteinFile);
  form.append("top_n", topN);
  form.append("pair_mode", pairMode);
  form.append("session_name", sessionName);

  return request("/repurposing/predict", { method: "POST", body: form });
}

export async function getRepurposingResults(sessionId) {
  return request(`/repurposing/results/${sessionId}`);
}

export async function explainPair({ smiles, proteinSeq, method }) {
  const form = new URLSearchParams({ smiles, protein_seq: proteinSeq, method });
  return request("/repurposing/explain", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
}

export async function getSourceCode(moduleName) {
  return request(`/repurposing/code/${moduleName}`);
}

// --- Pipeline session ---
export async function getSessionStatus(sessionId) {
  return request(`/pipeline/sessions/${sessionId}/status`);
}

export async function uploadModel(modelFile) {
  const form = new FormData();
  form.append("model_file", modelFile);
  return request("/training/upload-model", { method: "POST", body: form });
}
