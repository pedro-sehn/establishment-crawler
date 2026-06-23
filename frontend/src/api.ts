import type {
  Fit,
  IgCookies,
  ProcessResponse,
  ProfileResponse,
  Ratio,
} from "./types";

// Map the pasted cookies onto the request body fields the backend expects.
// Empty values are dropped so the backend can fall back to its env config.
function credBody(c: IgCookies): Record<string, string> {
  const body: Record<string, string> = {};
  if (c.sessionid) body.ig_sessionid = c.sessionid;
  if (c.csrftoken) body.ig_csrftoken = c.csrftoken;
  if (c.ds_user_id) body.ig_ds_user_id = c.ds_user_id;
  return body;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // non-JSON error body; keep the default message
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export function fetchProfile(
  url: string,
  cookies: IgCookies,
): Promise<ProfileResponse> {
  return fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, ...credBody(cookies) }),
  }).then((r) => asJson<ProfileResponse>(r));
}

export interface ProcessTarget {
  shortcode?: string;
  url?: string;
}

export function processReel(
  target: ProcessTarget,
  ratio: Ratio,
  fit: Fit,
  cookies: IgCookies,
): Promise<ProcessResponse> {
  return fetch("/api/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...target, ratio, fit, ...credBody(cookies) }),
  }).then((r) => asJson<ProcessResponse>(r));
}

export function processUpload(
  file: File,
  ratio: Ratio,
  fit: Fit,
): Promise<ProcessResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("ratio", ratio);
  form.append("fit", fit);
  return fetch("/api/process-upload", {
    method: "POST",
    body: form,
  }).then((r) => asJson<ProcessResponse>(r));
}

export function downloadUrl(jobId: string): string {
  return `/api/download/${jobId}`;
}
