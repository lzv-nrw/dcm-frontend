type SortDirection = "asc" | "desc";

interface SortOptions<T> {
  field: keyof T | string;
  direction?: SortDirection;
  getValue?: (item: T) => any;
  fallbackValue?: any;
  caseInsensitive?: boolean;
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
 *   - caseInsensitive: Enables case-insensitive string comparison (only applies to strings).
 *
 * @returns A comparator function compatible with Array.prototype.sort.
 */
export function genericSort<T>(
  options: SortOptions<T>
): (a: T, b: T) => number {
  const {
    field,
    direction = "asc",
    getValue,
    fallbackValue = "",
    caseInsensitive = false,
  } = options;

  return (a: T, b: T) => {
    const valueA = getValue ? getValue(a) : (a as any)[field] ?? fallbackValue;
    const valueB = getValue ? getValue(b) : (b as any)[field] ?? fallbackValue;

    let processedA = valueA;
    let processedB = valueB;

    if (
      caseInsensitive &&
      typeof valueA === "string" &&
      typeof valueB === "string"
    ) {
      processedA = valueA.toLowerCase();
      processedB = valueB.toLowerCase();
    }

    if (typeof processedA === "string" && typeof processedB === "string") {
      const comparison = processedA.localeCompare(processedB);
      return direction === "asc" ? comparison : -comparison;
    }

    if (typeof processedA === "number" && typeof processedB === "number") {
      return direction === "asc"
        ? processedA - processedB
        : processedB - processedA;
    }

    // Fallback for other types
    if (processedA < processedB) return direction === "asc" ? -1 : 1;
    if (processedA > processedB) return direction === "asc" ? 1 : -1;
    return 0;
  };
}
