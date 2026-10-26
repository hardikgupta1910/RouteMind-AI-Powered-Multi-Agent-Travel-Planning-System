async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(path, options);
  } catch {
    throw new Error(
      "Cannot reach the backend. Check that FastAPI is running."
    );
  }

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid server response (${response.status}).`);
  }

  if (!response.ok || data.success === false) {
    const detail = data.error ?? data.detail;

    throw new Error(
      typeof detail === "string"
        ? detail
        : detail
          ? JSON.stringify(detail)
          : `Request failed (${response.status}).`
    );
  }

  return data;
}

function post(path, body) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const api = {
  health: () => request("/health"),

  plan: (message, threadId) =>
    post("/api/travel", {
      message,
      thread_id: threadId || null,
    }),

  review: (threadId, approved, feedback) =>
    post("/api/travel/approve", {
      thread_id: threadId,
      approved,
      feedback,
    }),

  ask: (question) => post("/rag/ask", { question }),

  upload(file) {
    const body = new FormData();
    body.append("file", file);

    return request("/rag/upload", {
      method: "POST",
      body,
    });
  },
};