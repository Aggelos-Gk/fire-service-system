export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

export async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
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
