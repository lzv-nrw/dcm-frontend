/**
 * Returns a Flowbite input color based on status.
 *
 * @param ok - whether input status is ok
 * @param success_color - override for success; null yields undefined
 * @param failure_color - override for failure; null yields undefined
 * @returns Either `undefined` (input `null` or if overrides have been
 * used) or a Flowbite input-color.
 */
export function getTextInputColor({
  ok,
  success_color = "success",
  failure_color = "failure",
}: {
  ok: boolean | null;
  success_color?: null | string;
  failure_color?: null | string;
}): undefined | string {
  if (ok === null) return;
  if (ok) return success_color ?? undefined;
  else return failure_color ?? undefined;
}

/**
 * Truncates a string to a specified maximum length and appends an ellipsis ("…")
 * if the string exceeds that length.
 *
 * @param text - The input string to be truncated.
 * @param maxLength - The maximum allowed length of the string (default is 120 characters).
 * @returns The truncated string with an ellipsis if it was too long, otherwise the original string.
 */
export function truncateText(text: string, maxLength: number = 120): string {
  return text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text;
}

/**
 * Const for limiting characters of the TextInput elements
 * */
export const textInputLimit = {
  unlimited: undefined,
  xs: 10,
  sm: 30,
  md: 70,
  lg: 100,
  xl: 200,
};
