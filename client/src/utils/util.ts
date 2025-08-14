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

/**
 * Deeply compares b to a (properties are only compared in one direction).
 * Supports only objects (including null and arrays).
 * @param a object a (compared to)
 * @param b objects b (compared)
 * @param laxArrayOrder whether to respect array element order
 * @returns whether objects are deeply equal.
 */
function compareToObject(
  a: object,
  b: object,
  laxArrayOrder: boolean = false
): boolean {
  // check primitive
  if (a === b) return true;

  // check null
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (laxArrayOrder && Array.isArray(a) && Array.isArray(b)) {
    const valuesB: any[] = [];
    for (const valueA of a) {
      const filtered = b.filter((valueB) =>
        valuesB.indexOf(valueB) < 0 && typeof valueA === typeof valueB
          ? typeof valueA === "object"
            ? compareObjects(valueA, valueB)
            : valueA === valueB
          : false
      );
      if (filtered.length === 0) return false;
      valuesB.push(filtered[0]);
    }
    if (a.length !== valuesB.length) return false;
  } else {
    for (const [keyA, valueA] of Object.entries<any>(a)) {
      const valueB = (b as any)[keyA];
      // key of a does not exist in b
      if (valueA && !valueB) return false;

      // compare child-value
      if (typeof valueA !== typeof valueB) return false;

      if (typeof valueA === "object") {
        if (!compareObjects(valueA, valueB)) return false;
      } else if (valueA !== valueB) return false;
    }
  }

  return true;
}

/**
 * Deeply compares a and b (properties are compared in both directions).
 * Supports only objects (including null and arrays).
 * @param a object a
 * @param b objects b
 * @param laxArrayOrder whether to respect array element order
 * @returns whether objects are deeply equal.
 */
export function compareObjects(
  a: object,
  b: object,
  laxArrayOrder: boolean = false
): boolean {
  return (
    compareToObject(a, b, laxArrayOrder) && compareToObject(b, a, laxArrayOrder)
  );
}
