/*
This component is structured to allow dynamic usage and easy
configurability/extendability. The OperationsForm accepts the following
props
* targetField: string identifier for the field that operations will be
    performed on
* operations: array of current operations
* onChange: callback that allows the components to update current
    operations; this Dispatch<SetStateAction> is always used to
    relatively (not absolutely) change state
* onClose: optional callback that is called when the form is closed
* configuration: contains certain rules and input-configuration

Other files in this package contain
* types: various interfaces and type-definitions used thoughout the
    components
* OperationsForm: container for a single form (single field of metadata)
    that allows to configure operations with the given configuration
* XOperationInput: different input types for the individual types of
    operations

The general strategy of state management in this form can be described
as follows: All major components receive both a state for the current
input (e.g., the operations for the OperationsForm or an operation for
a single OperationInput-component) as well as a callback that can be
used to update the current (in the sense of the OperationsForm global)
state. All components use the callback such that only that data is
actually changed that is related to that component.
*/

import { useEffect, useRef, useState } from "react";
import { Button, Card, HelperText, Select } from "flowbite-react";
import { FiX } from "react-icons/fi";

import t from "../../utils/translation";
import ComplementOperationInput from "./ComplementOperationInput";
import {
  BaseOperation,
  ComplementOperation,
  OperationType,
  OperationNames,
  OperationFormConfiguration,
  OverwriteExistingOperation,
  FindAndReplaceOperation,
  FindAndReplaceLiteralOperation,
  OperationFormSelectInput,
} from "./types";
import OverwriteExistingOperationInput from "./OverwriteExistingOperationInput";
import FindAndReplaceOperationInput from "./FindAndReplaceOperationInput";
import FindAndReplaceLiteralOperationInput from "./FindAndReplaceLiteralOperationInput";

interface OperationsFormProps {
  targetField: string;
  operations: BaseOperation[];
  configuration: OperationFormConfiguration;
  onChange: React.Dispatch<React.SetStateAction<BaseOperation[]>>;
  onClose?: () => void;
}

/**
 * Checks default conditions for availablility of operations.
 * @param operation operation in question
 * @param operations current operations
 * @returns boolean for availablility
 */
export function isOperationAvailable(
  operation: OperationType,
  operations: OperationType[]
): boolean {
  if (operations.includes(operation)) return false;

  // regex and literal find&replace are exclusive
  if (
    operation === "findAndReplace" &&
    operations.includes("findAndReplaceLiteral")
  )
    return false;
  if (
    operation === "findAndReplaceLiteral" &&
    operations.includes("findAndReplace")
  )
    return false;

  // find&replace and overwriteExisting are exclusive
  if (
    (operation === "findAndReplace" || operation === "findAndReplaceLiteral") &&
    operations.includes("overwriteExisting")
  )
    return false;
  if (
    operation === "overwriteExisting" &&
    (operations.includes("findAndReplace") ||
      operations.includes("findAndReplaceLiteral"))
  )
    return false;

  return true;
}

export default function OperationsForm({
  targetField,
  operations,
  configuration,
  onChange,
  onClose,
}: OperationsFormProps) {
  const [operationOptions, setOperationOptions] = useState<OperationType[]>([]);
  const operationSelectRef = useRef<HTMLSelectElement>(null);
  const [complementOperation, setComplementOperation] =
    useState<ComplementOperation | null>(null);
  const [overwriteExistingOperation, setOverwriteOperation] =
    useState<OverwriteExistingOperation | null>(null);
  const [findAndReplaceOperation, setFindAndReplaceOperation] =
    useState<FindAndReplaceOperation | null>(null);
  const [findAndReplaceLiteralOperation, setFindAndReplaceLiteralOperation] =
    useState<FindAndReplaceLiteralOperation | null>(null);

  // load operation options from operations
  useEffect(() => {
    setOperationOptions(
      configuration?.operationOptionsOverride
        ? configuration.operationOptionsOverride(operations)
        : (
            configuration.availableOperationTypes ?? [
              "complement",
              "overwriteExisting",
              "findAndReplace",
              "findAndReplaceLiteral",
            ] as OperationType[]
          ).filter((operation) =>
            isOperationAvailable(
              operation,
              operations.map((o) => o.type)
            )
          )
    );
    // eslint-disable-next-line
  }, [
    complementOperation,
    overwriteExistingOperation,
    findAndReplaceOperation,
    findAndReplaceLiteralOperation,
  ]);

  // load complementOperation, ... from operations
  useEffect(() => {
    setComplementOperation(
      (operations.find(
        (operation) => operation.type === "complement"
      ) as ComplementOperation) || null
    );
    setOverwriteOperation(
      (operations.find(
        (operation) => operation.type === "overwriteExisting"
      ) as OverwriteExistingOperation) || null
    );
    setFindAndReplaceOperation(
      (operations.find(
        (operation) => operation.type === "findAndReplace"
      ) as FindAndReplaceOperation) || null
    );
    setFindAndReplaceLiteralOperation(
      (operations.find(
        (operation) => operation.type === "findAndReplaceLiteral"
      ) as FindAndReplaceLiteralOperation) || null
    );
  }, [operations]);

  return operations ? (
    <div>
      <Card className="max-w-full mb-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <h5 className="text-xl font-bold leading-none text-gray-900">
            {configuration.fieldConfiguration[targetField]?.label ??
              t(`Unbekanntes Feld '${targetField}'`)}
          </h5>
          <Button
            color="light"
            className="w-8 h-8 flex items-center rounded-full p-2"
            onClick={() => {
              // remove existing operations of this type
              onChange((prev) =>
                prev.filter(
                  (operation) => operation.targetField !== targetField
                )
              );
              // close this panel
              onClose?.();
            }}
          >
            <FiX size={16} />
          </Button>
        </div>
        <div className="flow-root">
          <ul className="divide-y divide-gray-200 pr-2">
            {overwriteExistingOperation && (
                <li>
                  <OverwriteExistingOperationInput
                    targetField={targetField}
                    operation={overwriteExistingOperation}
                    inputConfiguration={
                      configuration.fieldConfiguration[targetField]
                    }
                    onChange={onChange}
                  />
                </li>
              )}
            {findAndReplaceOperation && (
                <li>
                  <FindAndReplaceOperationInput
                    targetField={targetField}
                    operation={findAndReplaceOperation}
                    inputConfiguration={
                      configuration.fieldConfiguration[targetField]
                    }
                    onChange={onChange}
                  />
                </li>
              )}
            {findAndReplaceLiteralOperation && (
                <li>
                  <FindAndReplaceLiteralOperationInput
                    targetField={targetField}
                    operation={findAndReplaceLiteralOperation}
                    inputConfiguration={
                      configuration.fieldConfiguration[targetField]
                    }
                    onChange={onChange}
                  />
                </li>
              )}
            {complementOperation && (
                <li>
                  <ComplementOperationInput
                    targetField={targetField}
                    operation={complementOperation}
                    inputConfiguration={
                      configuration.fieldConfiguration[targetField]
                    }
                    onChange={onChange}
                  />
                </li>
              )}
          </ul>
          {operationOptions.length > 0 && (
            <div className="flex items-center border-t mt-2 py-4 space-y-2">
              <HelperText className="mr-2">
                {t("Fügen Sie eine Aktion hinzu")}
              </HelperText>
              <Select ref={operationSelectRef} className="mx-2" sizing={"sm"}>
                {operationOptions.map((o) => (
                  <option key={o} value={o}>
                    {OperationNames[o] ?? t(`Unbekannte Aktion '${o}'`)}
                  </option>
                ))}
              </Select>
              <Button
                size="xs"
                onClick={() =>
                  onChange((prev) => {
                    if (!operationSelectRef.current?.value) return prev;
                    return [
                      ...prev.filter(
                        (o) =>
                          o.type !==
                            (operationSelectRef.current
                              ?.value as OperationType) ||
                          o.targetField !== targetField
                      ),
                      {
                        type: operationSelectRef.current
                          ?.value as OperationType,
                        targetField,
                        ...(operationSelectRef.current.value ===
                        "findAndReplace"
                          ? {
                              items: [
                                {
                                  regex: "",
                                  value:
                                    configuration.fieldConfiguration[
                                      targetField
                                    ]?.type === "select"
                                      ? (
                                          configuration.fieldConfiguration[
                                            targetField
                                          ] as OperationFormSelectInput
                                        ).options[0].value
                                      : "",
                                },
                              ],
                            }
                          : {}),
                        ...(operationSelectRef.current.value ===
                        "findAndReplaceLiteral"
                          ? {
                              items: [
                                {
                                  literal: "",
                                  value:
                                    configuration.fieldConfiguration[
                                      targetField
                                    ]?.type === "select"
                                      ? (
                                          configuration.fieldConfiguration[
                                            targetField
                                          ] as OperationFormSelectInput
                                        ).options[0].value
                                      : "",
                                },
                              ],
                            }
                          : {}),
                      },
                    ];
                  })
                }
              >
                {t("Hinzufügen")}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  ) : (
    <></>
  );
}
