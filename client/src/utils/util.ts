import md5 from "md5";

import { JobConfig, JobInfo, JobReport } from "../types";

/**
 * Returns a random number generator that can be seeded with a string.
 * @param seed string to used as seed
 * @returns random-function which when called returns a float large or
 * equal 0 and smaller than 1.
 */
export function randomNumberGenerator(seed: string) {
  const SEED =
    0 +
    Array.from(seed)
      .map((char, index) => 10 ** index * char.charCodeAt(0))
      .reduce((a, b) => a + b, 0);
  let a = SEED | 0;
  let b = SEED | 0;

  function randInt() {
    a = (a * 67307) & 0xffff;
    b = (b * 67427) & 0xffff;
    return a ^ (b << 15);
  }

  return { randInt, randFloat: () => randInt() / 2147483648 };
}

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
 * @param info job information
 * @returns String that describes the job configuration status.
 */
export function formatJobConfigStatus(
  config: JobConfig,
  info?: JobInfo
): string {
  if (config.status === "ok") {
    if (config.issuesLatestExec && config.issuesLatestExec > 0)
      return "Fehler beim letzten Joblauf";
    if (info?.status === "queued" || info?.status === "running")
      return "wird gerade ausgeführt";
    if (info?.status === "aborted") return "abgebrochen";
    if (info?.status === "completed" && config.schedule?.repeat === undefined) return "einmalig ausgeführt";    
    return "-";
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

type ActionType =
  | "create"
  | "edit"
  | "delete"
  | "read"
  | "run"
  | "reset"
  | "download"
  | "cancel";

const ACTION_LABELS: Record<ActionType, string> = {
  create: "erstellen",
  edit: "bearbeiten",
  delete: "löschen",
  read: "ansehen",
  run: "ausführen",
  reset: "zurücksetzen",
  download: "herunterladen",
  cancel: "abbrechen",
};

/**
 * Returns a common action label for use in buttons, tooltips, or other UI elements.
 *
 * If a context is provided (e.g., "Arbeitsbereich", "Template"), it is combined with the action.
 * Otherwise, only the capitalized action verb is returned (e.g., "Löschen").
 *
 * @param action - The type of action, e.g. "create", "edit", "delete", etc.
 * @param context - Optional noun or subject the action applies to, like "Workspace" or "Template".
 * @returns A composed action title string, e.g. "Arbeitsbereich löschen" or "Löschen".
 */
export function getActionTitle(action: ActionType, context?: string): string {
  if (!context)
    return (
      ACTION_LABELS[action].charAt(0).toUpperCase() +
      ACTION_LABELS[action].slice(1)
    );

  return `${context} ${ACTION_LABELS[action]}`;
}

interface ArtifactDownloadTarget {
  path: string;
  asPath: string;
}

/**
 * Helper function to collect all artifacts for recordId to download from report.
 * @param recordId record identifier
 * @param report report
 * @returns list of targets usable in a request to build a downloadable archive
 */
export function getDownloadTargetsFromReport(
  recordId: string,
  report?: JobReport
): ArtifactDownloadTarget[] {
  const record = report?.data?.records?.[recordId];
  if (record === undefined) return [];

  const targets: (ArtifactDownloadTarget | undefined)[] = [];

  // ie
  targets.push(getImportIEsDownloadTargetFromReport(recordId, report));

  // ip (check from back to front and use first available)
  // * prepared
  const preparedIPTarget = getPrepareIPDownloadTargetFromReport(
    recordId,
    report
  );
  if (preparedIPTarget === undefined) {
    // * built/imported
    const builtIPTarget = getBuildIPDownloadTargetFromReport(recordId, report);
    if (builtIPTarget === undefined) targets.push(builtIPTarget);
    else targets.push(getImportIPsDownloadTargetFromReport(recordId, report));
  } else {
    targets.push(preparedIPTarget);
  }

  // sip
  targets.push(getBuildSIPDownloadTargetFromReport(recordId, report));

  // return filtered output
  return targets.filter(
    (target) => target !== undefined
  ) as ArtifactDownloadTarget[]; // eslint does not get the correct type here
}

/**
 * Helper function to collect the import-ies artifact-path for recordId from report.
 * @param recordId record identifier
 * @param report report
 * @returns target that is usable in a request to build a downloadable archive
 */
export function getImportIEsDownloadTargetFromReport(
  recordId: string,
  report?: JobReport
): ArtifactDownloadTarget | undefined {
  if (!report?.data?.records?.[recordId]?.stages?.import_ies?.artifact) return;
  return {
    path: report.data.records[recordId].stages.import_ies.artifact!,
    asPath: "ie",
  };
}

/**
 * Helper function to collect the import-ips artifact-path for recordId from report.
 * @param recordId record identifier
 * @param report report
 * @returns target that is usable in a request to build a downloadable archive
 */
export function getImportIPsDownloadTargetFromReport(
  recordId: string,
  report?: JobReport
): ArtifactDownloadTarget | undefined {
  if (!report?.data?.records?.[recordId]?.stages?.import_ips?.artifact) return;
  return {
    path: report.data.records[recordId].stages.import_ips.artifact!,
    asPath: "ip",
  };
}

/**
 * Helper function to collect the build-ip artifact-path for recordId from report.
 * @param recordId record identifier
 * @param report report
 * @returns target that is usable in a request to build a downloadable archive
 */
export function getBuildIPDownloadTargetFromReport(
  recordId: string,
  report?: JobReport
): ArtifactDownloadTarget | undefined {
  if (!report?.data?.records?.[recordId]?.stages?.build_ip?.artifact) return;
  return {
    path: report.data.records[recordId].stages.build_ip.artifact!,
    asPath: "ip",
  };
}

/**
 * Helper function to collect the prepare-ip artifact-path for recordId from report.
 * @param recordId record identifier
 * @param report report
 * @returns target that is usable in a request to build a downloadable archive
 */
export function getPrepareIPDownloadTargetFromReport(
  recordId: string,
  report?: JobReport
): ArtifactDownloadTarget | undefined {
  if (!report?.data?.records?.[recordId]?.stages?.prepare_ip?.artifact) return;
  return {
    path: report.data.records[recordId].stages.prepare_ip.artifact!,
    asPath: "ip",
  };
}

/**
 * Helper function to collect the build-sip artifact-path for recordId from report.
 * @param recordId record identifier
 * @param report report
 * @returns target that is usable in a request to build a downloadable archive
 */
export function getBuildSIPDownloadTargetFromReport(
  recordId: string,
  report?: JobReport
): ArtifactDownloadTarget | undefined {
  if (!report?.data?.records?.[recordId]?.stages?.build_sip?.artifact) return;
  return {
    path: report.data.records[recordId].stages.build_sip.artifact!,
    asPath: "sip",
  };
}
