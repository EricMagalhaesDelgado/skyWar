const API_BASE = "/api";

/*---------------------------------------------------------------------------------*/
export async function fetchBattleHistory() {
  const response = await fetch(`${API_BASE}/battles`);

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar o historico de batalhas.");
  }

  return response.json();
}

/*---------------------------------------------------------------------------------*/
export async function registerBattle(payload) {
  const response = await fetch(`${API_BASE}/battles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Falha ao registrar a batalha." }));
    throw new Error(error.detail || "Falha ao registrar a batalha.");
  }

  return response.json();
}

/*---------------------------------------------------------------------------------*/
export async function clearBattleHistory() {
  const response = await fetch(`${API_BASE}/battles`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Falha ao excluir o historico de batalhas.");
  }

  return response.json();
}
