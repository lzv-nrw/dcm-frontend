export type OperationType =
  | "complement"
  | "overwriteExisting"
  | "findAndReplace"
  | "findAndReplaceLiteral";
export const OperationNames: Record<OperationType, string> = {
  complement: "Ergänzen",
  overwriteExisting: "Überschreiben",
  findAndReplace: "Ersetzen (regex)",
  findAndReplaceLiteral: "Ersetzen",
};
export const operationTypeOrder = [
  "overwriteExisting",
  "findAndReplace",
  "findAndReplaceLiteral",
  "complement",
];

// Operation definitions
// * common operation-interfaces
export interface BaseOperation {
  type: OperationType;
  targetField: string;
}
// * specific operations
export interface ComplementOperation extends BaseOperation {
  type: "complement";
  value?: string;
}
export interface OverwriteExistingOperation extends BaseOperation {
  type: "overwriteExisting";
  value?: string;
}
export interface FindAndReplaceOperation extends BaseOperation {
  type: "findAndReplace";
  items?: { regex: string; value: string }[];
}
export interface FindAndReplaceLiteralOperation extends BaseOperation {
  type: "findAndReplaceLiteral";
  items?: { literal: string; value: string }[];
}

// OperationsForm-definitions
export interface OperationFormInput {
  type: "select" | "text" | "textarea";
}

export interface OperationFormSelectInput extends OperationFormInput {
  type: "select";
  options: { value: string; label: string }[];
}

export interface OperationFormTextInput extends OperationFormInput {
  type: "text";
  placeholder?: string;
}

export interface OperationFormTextareaInput extends OperationFormInput {
  type: "textarea";
  placeholder?: string;
}

export type FieldConfiguration = Record<
  string,
  { label: string } & (
    | OperationFormSelectInput
    | OperationFormTextInput
    | OperationFormTextareaInput
  )
>;

export interface OperationFormConfiguration {
  // can be used to limit the available operation types
  availableOperationTypes?: OperationType[];
  // maps field name to field/input configuration
  fieldConfiguration: FieldConfiguration;
  // override for determining available options based on current operations
  // this can be used to adjust the rules under which operations are
  // available; e.g., mutual exclusivity can be implemented with this
  operationOptionsOverride?: (operations: BaseOperation[]) => OperationType[];
}
