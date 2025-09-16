import t from "./translation";
import { host, credentialsValue } from "../App";

/**
 * Helper for unified calls to fetch.
 * @param query query string to fetch
 * @param resourceName name for the resource that is being fetched
 * @param callback callback after response-JSON has been parsed
 * @param onSuccess callback after successful fetch
 * @param onFail callback after failed fetch
 * @param maxRetries maximum number of retries on 503 errors (default: 3)
 * @param retryInterval delay in milliseconds between retries (default: 50ms)
 */
export function defaultJSONFetch(
  query: string,
  resourceName: string,
  callback?: (json: any) => void,
  onSuccess?: (json: any) => void,
  onFail?: (error: string) => void,
  maxRetries: number = 3,
  retryInterval: number = 50
) {
  function tryFetch(attempt: number = 0) {
    fetch(host + query, { credentials: credentialsValue })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 503 && attempt < maxRetries) {
            console.warn(
              `Attempt ${
                attempt + 1
              } for '${resourceName}': Server responded with 503. Retry in ${retryInterval}ms...`
            );
            setTimeout(() => tryFetch(attempt + 1), retryInterval);
            return;
          }

          if (response.status === 403)
            throw new Error(
              t(
                `Zugriff auf ${resourceName} verweigert. Vermutlich haben sich Ihre Berechtigungen geändert, bitte laden Sie die Seite neu.`
              )
            );
          throw new Error(
            `${t(
              "Unerwartete Antwort vom Server beim Abruf von"
            )} ${resourceName}: ${await response.text()}`
          );
        }
        return response.json();
      })
      .then((json) => {
        // prevent callbacks on undefined JSON (e.g. when retrying after 503 error)
        if (json === undefined) return;
        callback?.(json);
        onSuccess?.(json);
      })
      .catch((error) => {
        console.error(error);
        onFail?.(error.message);
      });
  }

  tryFetch();
}
