import { MessageHandler } from "../components/MessageBox";
import t from "./translation";

/**
 * ====================== Form validation ======================
 */

export interface ValidationReport {
  ok?: boolean;
  errors?: string[];
  warnings?: string[];
  info?: string[];
  datetime?: Date;
}

export interface ValidationReportWithChildren<
  ChildrenType extends string | number | symbol = string
> extends ValidationReport {
  children?: Partial<
    Record<ChildrenType, ValidationReportWithChildren | undefined>
  >;
}

export interface Validator<
  ChildrenType extends string | number | symbol = string
> {
  children: Partial<Record<ChildrenType, Validator>>;
  validate: (
    force: boolean
  ) => ValidationReportWithChildren<ChildrenType> | undefined;
  report?: ValidationReport;
}

/**
 * Returns validate-callable which run validation on parent as well as
 * children. Merges result into single ValidationResultWithChildren.
 * @param getValidator getter for parent validator
 * @param validate parent-specific validation
 * @returns validation result including children
 */
export function createValidateWithChildren<
  ChildrenType extends string | number | symbol = string
>(
  getValidator: () => Validator<ChildrenType> | undefined,
  validate?: (strict: boolean) => ValidationReport
): (strict: boolean) => ValidationReportWithChildren<ChildrenType> {
  return (strict: boolean) => {
    const validator = getValidator();
    if (!validator) return {};
    let result: ValidationReportWithChildren<ChildrenType> = {
      ...validate?.(strict),
      datetime: new Date(),
    };

    result = {
      ...result,
      children: {} as Record<ChildrenType, ValidationReportWithChildren>,
    };

    // break recursion
    if (!validator.children) return result;

    // iterate children
    let ok = result.ok;
    for (const [childId, child] of Object.entries<Validator>(
      validator.children as Record<ChildrenType, Validator>
    )) {
      let report = child.validate(strict);

      // add to result
      if (report !== undefined)
        (result.children as Record<ChildrenType, ValidationReportWithChildren>)[
          childId as ChildrenType
        ] = report;

      // also consider all children for parent (if conclusive)
      if (report?.ok !== undefined) ok = (ok ?? report.ok) && report.ok;
    }
    result.ok = strict && ok === undefined ? false : ok;
    return result;
  };
}

/**
 * Returns a copy of the object (or the object itself) without key "children".
 * @param obj object where key "children" should be stripped
 * @returns object without key "children"
 */
function stripChildren(obj: object): object {
  if (!Object.keys(obj).includes("children")) return obj;
  const { children, ...nonChildren } = obj as { children: any };
  return { ...nonChildren };
}

/**
 * Returns a copy of the given validator populated with the given report.
 * @param validator base-validator
 * @param report validation report with children
 * @returns copy of validator populated with report-data
 */
export function mergeValidationReportIntoChildren<
  ChildrenType extends string | number | symbol = string
>(
  validator?: Validator<ChildrenType>,
  report?: ValidationReportWithChildren<ChildrenType>
): Validator<ChildrenType> | undefined {
  // stop recursion
  if (!validator || !report) return undefined;

  // build response
  let result = { ...validator };

  // copy parent-report
  if (Object.keys(stripChildren(report)).length > 0)
    result = {
      ...result,
      report: stripChildren(report),
    };

  // copy children
  if (report.children) {
    result = {
      ...result,
      children: { ...validator.children } as Record<ChildrenType, Validator>,
    };

    for (const childId of Object.keys(report.children)) {
      // skip non-existing or undefined
      if (
        !validator.children?.[childId as ChildrenType] ||
        !report.children[childId as ChildrenType]
      )
        continue;

      // copy child-report into validator-children
      result.children = {
        ...result.children,
        [childId]: mergeValidationReportIntoChildren(
          validator.children[childId as ChildrenType],
          report.children[childId as ChildrenType]
        ),
      } as Record<ChildrenType, Validator>;
    }
  }

  return result;
}

export const ValidationMessages = {
  GenericBadForm: () =>
    t("Das Formular enthält ungültige oder unvollständige Eingaben."),
  GenericEmptyValue: () => t(`Feld darf nicht leer sein.`),
  EmptyValue: (name: string) => t(`${name} darf nicht leer sein.`),
};

/**
 * Processes report with children over two nested layers (top, section, input).
 * Only pushes new messages.
 * @param report report to be processed
 * @param handler handler for pushing messages
 */
export function applyReportToMessageHandler(
  report: ValidationReportWithChildren,
  handler: MessageHandler
) {
  if (report.ok) return;
  handler.pushMessage({
    id: "bad-form-generic",
    text: ValidationMessages.GenericBadForm(),
  });
  // iterate all children to list problems
  for (const [sname, section] of Object.entries(report.children ?? {})) {
    // section-level messages
    for (const msg of section?.errors ?? []) {
      handler.pushMessage({
        id: `bad-form-${sname}`,
        text: msg,
      });
    }
    for (const [iname, input] of Object.entries(section?.children ?? {})) {
      // input-level messages
      for (const msg of input?.errors ?? []) {
        handler.pushMessage({
          id: `bad-form-${sname}-${iname}`,
          text: msg,
        });
      }
    }
  }
}

/**
 * ==================== Form validation end ====================
 */

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
  ok: boolean | null | undefined;
  success_color?: null | string;
  failure_color?: null | string;
}): undefined | string {
  if (ok === null || ok === undefined) return;
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

/**
 * Checks whether a given string is a valid regular expression
 */
export function isValidRegex(userString: string): boolean {
  try {
    new RegExp(userString);
    return true;
  } catch {
    return false;
  }
}
