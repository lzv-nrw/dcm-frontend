import { useEffect, useRef, useState } from "react";
import { Button, Select, Textarea, TextInput, Tooltip } from "flowbite-react";
import { FiMinus } from "react-icons/fi";

import t from "../../utils/translation";
import { getTextInputColor } from "../../utils/forms";
import {
  BaseOperation,
  ComplementOperation,
  OperationFormSelectInput,
  OperationFormTextInput,
  OperationFormTextareaInput,
} from "./types";

interface ComplementOperationFormProps {
  targetField: string;
  operation: ComplementOperation;
  inputConfiguration?:
    | OperationFormSelectInput
    | OperationFormTextInput
    | OperationFormTextareaInput;
  onChange: React.Dispatch<React.SetStateAction<BaseOperation[]>>;
}

export default function ComplementOperationInput({
  targetField,
  operation,
  inputConfiguration,
  onChange,
}: ComplementOperationFormProps) {
  const [focus, setFocus] = useState("");
  const [update, setUpdate] = useState<string | undefined | null>(
    operation.value
  );
  const selectInputRef = useRef<HTMLSelectElement>(null);

  /*
  run update on operation-object
  * runs once on first render
  * runs again on every change in the input
  it is implemented this way to have a single place where values are
  updated which also supports initializing inputs with the content
  of `operation` and initialize an empty `operation` on first render
  (using the default values in the inputs)
   */
  useEffect(() => {
    if (update !== null) {
      // "Ergänzen": If the metadata field does not exist, add the given value.
      // No changes if the field already exists.
      const newOperation: ComplementOperation = {
        type: "complement",
        targetField,
        value: undefined,
      };
      switch (inputConfiguration?.type) {
        case "select":
          newOperation.value =
            update === undefined ? selectInputRef.current?.value : update;
          break;
        default: // "text" or "textarea"
          newOperation.value = update === undefined ? "" : update;
      }
      onChange((prev) => [
        ...prev.filter(
          (operation) =>
            operation.type !== "complement" ||
            operation.targetField !== targetField
        ),
        newOperation,
      ]);
      setUpdate(null);
    }
  }, [update, targetField, onChange, inputConfiguration?.type]);

  return (
    <div className="flex flex-row items-center w-full my-2">
      <div className="w-full text-sm">{t("Fehlende Felder ergänzen mit")}</div>
      <div className="flex items-center w-full justify-between">
        {inputConfiguration?.type === "select" &&
          (!operation.value ||
          inputConfiguration.options
            .map((option) => option.value)
            .includes(operation.value) ? (
            <Select
              ref={selectInputRef}
              sizing={"sm"}
              value={operation.value}
              onChange={(e) => setUpdate(e.target.value)}
            >
              {inputConfiguration.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {
                    // this is part of the application's configuration > no translation
                    option.label
                  }
                </option>
              ))}
            </Select>
          ) : (
            <Tooltip content={t(`Unbekannter Wert '${operation.value}'`)}>
              <TextInput
                disabled={true}
                color="warning"
                value={operation.value}
              />
            </Tooltip>
          ))}
        {inputConfiguration && inputConfiguration.type === "textarea" && (
          <Textarea
            id="complement-textareainput"
            className="resize-none"
            value={operation.value ?? ""}
            rows={4}
            // this is part of the application's configuration > no translation
            placeholder={inputConfiguration?.placeholder}
            color={getTextInputColor({
              ok:
                focus === "complement-textareainput"
                  ? null
                  : (operation.value ?? "") !== "",
            })}
            onChange={(e) => setUpdate(e.target.value)}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={(e) => {
              setUpdate(e.target.value.trim());
              setFocus("");
            }}
          />
        )}
        {(!inputConfiguration || inputConfiguration.type === "text") && (
          <TextInput
            id="complement-textinput"
            type="text"
            sizing={"sm"}
            // this is part of the application's configuration > no translation
            placeholder={inputConfiguration?.placeholder}
            value={operation.value ?? ""}
            color={getTextInputColor({
              ok:
                focus === "complement-textinput"
                  ? null
                  : (operation.value ?? "") !== "",
            })}
            onChange={(e) => setUpdate(e.target.value)}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={(e) => {
              setUpdate(e.target.value.trim());
              setFocus("");
            }}
          />
        )}
        <Button
          color="light"
          className="w-8 h-8 flex items-center rounded-full ml-2 p-2"
          onClick={() =>
            onChange((prev) =>
              prev.filter(
                (operation) =>
                  operation.type !== "complement" ||
                  operation.targetField !== targetField
              )
            )
          }
        >
          <FiMinus size={16} />
        </Button>
      </div>
    </div>
  );
}
