const RAW_API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
export const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");

function buildApiUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function fetchJson(path, options = {}) {
  const response = await fetch(buildApiUrl(path), options);
  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch (error) {
      details = "";
    }
    throw new Error(`Request failed: ${response.status} ${response.statusText} ${details}`.trim());
  }
  return response.json();
}
