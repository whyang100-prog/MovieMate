let accessToken = null;
let memberId = null;
let refreshing = null;
export function setApiMember(id) {
  memberId = id;
  if (id == null) accessToken = null;
}
function expired() {
  accessToken = null;
  window.dispatchEvent(new Event("moviemate:unauthorized"));
}
async function read(response) {
  let data = {};
  try {
    data = await response.json();
  } catch {}
  if (!response.ok) {
    const error = new Error(data.message || `요청 실패 (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}
async function raw(path, method = "GET", body, token = null) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (method !== "GET") {
    const csrf = await read(
      await fetch("/api/auth/csrf", {
        credentials: "include",
        cache: "no-store",
      }),
    );
    headers[csrf.headerName] = csrf.token;
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return read(
    await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      cache: "no-store",
    }),
  );
}
async function renew() {
  if (!refreshing) {
    const work = () => raw("/api/auth/refresh", "POST");
    refreshing = (
      navigator.locks
        ? navigator.locks.request("moviemate-refresh", work)
        : work()
    )
      .then((data) => {
        if (memberId != null && memberId !== data.user.id) {
          throw Object.assign(
            new Error("다른 계정으로 변경됐어요. 다시 로그인해 주세요."),
            { status: 401 },
          );
        }
        accessToken = data.accessToken;
        return data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}
export async function api(path, options = {}) {
  const method = options.method || "GET";
  if (path === "/api/auth/login") {
    const data = await raw(path, "POST", options.body);
    accessToken = data.accessToken;
    return data;
  }
  if (path === "/api/auth/register") return raw(path, "POST", options.body);
  if (path === "/api/auth/logout") {
    try {
      try {
        return await raw(path, "POST", undefined, accessToken);
      } catch (error) {
        if (error.status !== 401) throw error;
        return await raw(path, "POST");
      }
    } finally {
      accessToken = null;
    }
  }

  try {
    if (!accessToken) await renew();
    try {
      return await raw(path, method, options.body, accessToken);
    } catch (error) {
      if (error.status !== 401) throw error;
      await renew();
      return await raw(path, method, options.body, accessToken);
    }
  } catch (error) {
    if (error.status === 401) expired();
    throw error;
  }
}
export const movieNumber = (id) => {
  if (!/^db-\d+$/.test(String(id)))
    throw new Error("서버 영화 ID를 확인하세요.");
  return String(id).slice(3);
};
