import md5 from "md5";

import { JobConfig } from "../types";

/**
 * Returns https://www.gravatar.com profile-url.
 * @param email email identifier
 * @param size image size
 * @returns url
 */
export function createGravatar(email?: string, size: number = 200): string {
  const baseUrl = "https://www.gravatar.com/avatar/";
  const queryArgs = `?s=${size}&d=identicon`;

  // temporarily hashed with md5, planned to switch to SHA256
  return email
    ? baseUrl + md5(email.trim().toLowerCase()).toString() + queryArgs
    : baseUrl + queryArgs;
}

/**
 * Formats status-string of JobConfig.
 * @param config job configuration
 * @returns String that describes the job configuration status.
 */
export function formatJobConfigStatus(config: JobConfig): string {
  if (config.status === "ok") {
    if (config.schedule?.active) return "Scheduled";
    else return "Pausiert";
  }
  return "Entwurf";
}
