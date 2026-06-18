import type { Fit, ProcessResponse, ProfileResponse, Ratio } from "./types";

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

export function fetchProfile(url: string): Promise<ProfileResponse> {
  return fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
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
): Promise<ProcessResponse> {
  return fetch("/api/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...target, ratio, fit }),
  }).then((r) => asJson<ProcessResponse>(r));
}

export function downloadUrl(jobId: string): string {
  return `/api/download/${jobId}`;
}
