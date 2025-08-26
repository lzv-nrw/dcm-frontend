import t from "./translation";
import { host, credentialsValue } from "../App";

/**
 * Helper for unified calls to fetch.
 * @param query query string to fetch
 * @param resourceName name for the resource that is being fetched
 * @param callback callback after response-JSON has been parsed
 * @param onSuccess callback after successful fetch
 * @param onFail callback after failed fetch
 */
export function defaultJSONFetch(
  query: string,
  resourceName: string,
  callback?: (json: any) => void,
  onSuccess?: (json: any) => void,
  onFail?: (error: string) => void
) {
  fetch(host + query, { credentials: credentialsValue })
    .then(async (response) => {
      if (!response.ok) {
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
      callback?.(json);
      onSuccess?.(json);
    })
    .catch((error) => {
      console.error(error);
      onFail?.(error.message);
    });
}
