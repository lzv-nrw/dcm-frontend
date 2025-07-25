import { useEffect, useState } from "react";
import { Button, Select, Textarea, TextInput, Tooltip } from "flowbite-react";
import { FiMinus } from "react-icons/fi";

import t from "../../utils/translation";
import { getTextInputColor, textInputLimit } from "../../utils/forms";
import {
  BaseOperation,
  OperationFormSelectInput,
  OperationFormTextInput,
  FindAndReplaceOperation,
  OperationFormTextareaInput,
} from "./types";

function MultiRowInput({
  items,
  inputConfiguration,
  onChange,
}: Pick<FindAndReplaceOperationInputProps, "inputConfiguration"> & {
  items: { regex: string; value: string }[];
  onChange: React.Dispatch<
    React.SetStateAction<{ regex: string; value: string }[]>
  >;
}) {
  const [focus, setFocus] = useState("");

  return (
    <div className="space-y-2 w-full">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex flex-row w-full space-x-2 items-center justify-between"
        >
          {/* left input - always text */}
          <TextInput
            id={`replace-regex-textinput-${index}`}
            className="w-1/2"
            type="text"
            sizing={"sm"}
            placeholder={t("regulärer Ausdruck")}
            value={item.regex}
            color={getTextInputColor({
              ok:
                focus === `replace-regex-textinput-${index}`
                  ? null
                  : item.regex !== "",
            })}
            maxLength={textInputLimit.unlimited}
            onChange={(e) =>
              onChange((prev) => {
                prev[index] = {
                  ...prev[index],
                  regex: e.target.value,
                };
                return [...prev];
              })
            }
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={(e) => {
              onChange((prev) => {
                prev[index] = {
                  ...prev[index],
                  regex: e.target.value.trim(),
                };
                return [...prev];
              });
              setFocus("");
            }}
          />
          <span className="text-sm">{t("mit")}</span>
          {/* right input */}
          {inputConfiguration?.type === "select" &&
            (inputConfiguration.options
              .map((option) => option.value)
              .includes(item.value) ? (
              <Select
                sizing={"sm"}
                value={item.value}
                onChange={(e) =>
                  onChange((prev) => {
                    prev[index] = {
                      ...prev[index],
                      value: e.target.value,
                    };
                    return [...prev];
                  })
                }
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
              <Tooltip content={t(`Unbekannter Wert '${item.value}'`)}>
                <TextInput disabled={true} color="warning" value={item.value} />
              </Tooltip>
            ))}
          {inputConfiguration && inputConfiguration.type === "textarea" && (
            <Textarea
              id={`replace-value-textareainput-${index}`}
              className="resize-none"
              value={item.value}
              rows={4}
              // this is part of the application's configuration > no translation
              placeholder={inputConfiguration?.placeholder}
              color={getTextInputColor({
                ok:
                  focus === `replace-value-textareainput-${index}`
                    ? null
                    : item.value !== "",
              })}
              onChange={(e) =>
                onChange((prev) => {
                  prev[index] = {
                    ...prev[index],
                    value: e.target.value,
                  };
                  return [...prev];
                })
              }
              onFocus={(e) => setFocus(e.target.id)}
              onBlur={(e) => {
                onChange((prev) => {
                  prev[index] = {
                    ...prev[index],
                    value: e.target.value.trim(),
                  };
                  return [...prev];
                });
                setFocus("");
              }}
            />
          )}
          {(!inputConfiguration || inputConfiguration.type === "text") && (
            <TextInput
              id={`replace-value-textinput-${index}`}
              type="text"
              sizing={"sm"}
              // this is part of the application's configuration > no translation
              placeholder={inputConfiguration?.placeholder}
              value={item.value}
              color={getTextInputColor({
                ok:
                  focus === `replace-value-textinput-${index}`
                    ? null
                    : item.value !== "",
              })}
              onChange={(e) =>
                onChange((prev) => {
                  prev[index] = {
                    ...prev[index],
                    value: e.target.value,
                  };
                  return [...prev];
                })
              }
              onFocus={(e) => setFocus(e.target.id)}
              onBlur={(e) => {
                onChange((prev) => {
                  prev[index] = {
                    ...prev[index],
                    value: e.target.value.trim(),
                  };
                  return [...prev];
                });
                setFocus("");
              }}
            />
          )}
          <Button
            color="light"
            className="w-8 h-8 flex items-center rounded-full ml-2 p-2"
            onClick={() => {
              onChange((prev) => prev.filter((_, i) => i !== index));
            }}
          >
            <FiMinus size={16} />
          </Button>
        </div>
      ))}
      <Button
        size="xs"
        onClick={() => {
          onChange((prev) => [
            ...prev,
            {
              regex: "",
              value:
                inputConfiguration?.type === "select"
                  ? inputConfiguration.options[0].value
                  : "",
            },
          ]);
        }}
      >
        {t("Zeile hinzufügen")}
      </Button>
    </div>
  );
}

interface FindAndReplaceOperationInputProps {
  targetField: string;
  operation: FindAndReplaceOperation;
  inputConfiguration?:
    | OperationFormSelectInput
    | OperationFormTextInput
    | OperationFormTextareaInput;
  onChange: React.Dispatch<React.SetStateAction<BaseOperation[]>>;
}

export default function FindAndReplaceOperationInput({
  targetField,
  operation,
  inputConfiguration: intputConfiguration,
  onChange,
}: FindAndReplaceOperationInputProps) {
  const [items, setItems] = useState<{ regex: string; value: string }[]>(
    // fallback should not be relevant since Input is expected to be
    // created with at least one value
    operation.items || [{ regex: "", value: "" }]
  );

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
    if (items.length !== 0) {
      /*
      "Gezielt ersetzen": If the metadata field exists and contains a
      specific old value, replace it with the new value. Otherwise, leave
      it unchanged. Supporting multiple "old value" > "new value" pairs is
      useful for handling different initial values. The UI should allow
      entering multiple such pairs.
      */
      const newOperation: FindAndReplaceOperation = {
        type: "findAndReplace",
        targetField,
        items: items,
      };
      onChange((prev) => [
        ...prev.filter(
          (operation) =>
            operation.type !== "findAndReplace" ||
            operation.targetField !== targetField
        ),
        newOperation,
      ]);
    } else {
      // clear entire operation if last action is removed
      onChange((prev) =>
        prev.filter(
          (operation) =>
            operation.type !== "findAndReplace" ||
            operation.targetField !== targetField
        )
      );
    }
  }, [items, onChange, targetField]);

  return (
    <div className="flex flex-col items-center w-full space-y-2 my-2">
      <div className="flex flex-row w-full text-sm items-center justify-between">
        {t("Gezielt Werte in Feldern via regex ersetzen")}
      </div>
      <div className="flex items-center w-full">
        <MultiRowInput
          items={items}
          onChange={setItems}
          inputConfiguration={intputConfiguration}
        />
      </div>
    </div>
  );
}
