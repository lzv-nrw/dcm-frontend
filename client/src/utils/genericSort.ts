type SortDirection = "asc" | "desc";

interface SortOptions<T> {
  field?: keyof T | string;
  direction?: SortDirection;
  getValue?: (item: T) => any;
  fallbackValue?: any;
}

/**
 * Creates a comparator function for sorting arrays of objects by a specified field or extracted value.
 *
 * @template T The type of objects being sorted.
 * @param options Sorting options:
 *   - field: The key to sort by (ignored if getValue is provided),
 *   - direction: Sort direction, "asc" is default,
 *   - getValue: Function to extract the value to sort by,
 *   - fallbackValue: Used if the value is missing,
 *
 * @returns A comparator function compatible with Array.prototype.sort.
 */
export function genericSort<T>(
  options: SortOptions<T>
): (a: T, b: T) => number {
  const { field, direction = "asc", getValue, fallbackValue = "" } = options;

  return (a: T, b: T) => {
    const valueA = getValue ? getValue(a) : (a as any)[field] ?? fallbackValue;
    const valueB = getValue ? getValue(b) : (b as any)[field] ?? fallbackValue;

    const comparison = compareValues(valueA, valueB);
    return direction === "asc" ? comparison : -comparison;
  };
}
function compareValues(a: any, b: any): number {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, undefined, {
      sensitivity: "case",
      numeric: true,
    });
  }
  // Handling of null/undefined
  if (a == null && b != null) return -1;
  if (a != null && b == null) return 1;
  if (a == null && b == null) return 0;

  // Fallback for other comparable types
  try {
    if (a === b) return 0;
    if (a > b) return 1;
    if (a < b) return -1;
  } catch {
    return 0;
  }

  return 0;
}
