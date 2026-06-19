// Instagram session cookies are pasted by the user and persisted in this
// website's own browser cookies (document.cookie) — no backend env needed.
import type { IgCookies } from "./types";

const EMPTY: IgCookies = { sessionid: "", csrftoken: "", ds_user_id: "" };

// How long the saved cookies survive (90 days, like an IG session).
const MAX_AGE = 60 * 60 * 24 * 90;

// Which IG cookie names we care about, mapped onto our storage keys.
const FIELDS: Record<keyof IgCookies, string> = {
  sessionid: "ig_sessionid",
  csrftoken: "ig_csrftoken",
  ds_user_id: "ig_ds_user_id",
};

function readJar(): Record<string, string> {
  const jar: Record<string, string> = {};
  for (const part of document.cookie.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    jar[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return jar;
}

/** Pull sessionid/csrftoken/ds_user_id out of a pasted cookie string. */
export function parseCookieString(raw: string): IgCookies {
  const out: IgCookies = { ...EMPTY };
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const val = part.slice(eq + 1).trim();
    if (key === "sessionid") out.sessionid = val;
    else if (key === "csrftoken") out.csrftoken = val;
    else if (key === "ds_user_id") out.ds_user_id = val;
  }
  return out;
}

/** Persist the cookies in this site's browser cookies. */
export function saveCookies(c: IgCookies): void {
  for (const field of Object.keys(FIELDS) as (keyof IgCookies)[]) {
    const name = FIELDS[field];
    const value = encodeURIComponent(c[field]);
    document.cookie = `${name}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Strict`;
  }
}

/** Read back any previously saved cookies. */
export function loadCookies(): IgCookies {
  const jar = readJar();
  return {
    sessionid: jar.ig_sessionid || "",
    csrftoken: jar.ig_csrftoken || "",
    ds_user_id: jar.ig_ds_user_id || "",
  };
}

export function hasSession(c: IgCookies): boolean {
  return c.sessionid.trim().length > 0;
}
