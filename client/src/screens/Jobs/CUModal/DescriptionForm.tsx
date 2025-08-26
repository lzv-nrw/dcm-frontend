import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { Label, TextInput, Textarea } from "flowbite-react";

import t from "../../../utils/translation";
import {
  ValidationMessages,
  ValidationReport,
  Validator,
  getTextInputColor,
  textInputLimit,
} from "../../../utils/forms";
import { FormSectionComponentProps } from "../../../components/SectionedForm";
import { useFormStore } from "./store";

export type DescriptionFormChildren = "name";
export type DescriptionFormValidator = Validator<DescriptionFormChildren>;

export function validateName(
  strict: boolean,
  name: string | undefined
): ValidationReport | undefined {
  if (name === undefined && !strict) return;
  if (name === undefined)
    return { ok: false, errors: [ValidationMessages.EmptyValue("Name")] };
  if (name === "")
    return {
      ok: false,
      errors: [ValidationMessages.EmptyValue("Name")],
    };
  return { ok: true };
}

export interface Description {
  name?: string;
  description?: string;
  contactInfo?: string;
}

export function DescriptionForm({ name, active }: FormSectionComponentProps) {
  const [description, setDescription] = useFormStore(
    useShallow((state) => [state.description, state.setDescription])
  );
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const [formVisited, setFormVisited] = useState(active);

  const [focus, setFocus] = useState("");

  // track visited
  useEffect(() => {
    if (active) setFormVisited(true);
  }, [active]);

  // handle validation
  // * name
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        description: {
          children: {
            name: validator.children?.description?.children?.name?.validate(
              false
            ),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [description?.name]);
  // * form section
  useEffect(() => {
    if (!formVisited) return;
    if (validator.children?.description?.report?.ok === undefined && active)
      return;
    setCurrentValidationReport({
      children: {
        description: validator.children?.description?.validate(true),
      },
    });
    // eslint-disable-next-line
  }, [active, description?.name]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <div className="space-y-2">
          <Label htmlFor="name" value={t("Titel*")} />
          <TextInput
            id="name"
            value={description?.name ?? ""}
            color={getTextInputColor({
              ok:
                focus === "name"
                  ? undefined
                  : validator.children?.description?.children?.name?.report?.ok,
            })}
            maxLength={textInputLimit.md}
            onChange={(e) => setDescription({ name: e.target.value })}
            onBlur={(e) => {
              setFocus("");
              setDescription({ name: e.target.value.trim() });
            }}
            onFocus={(e) => setFocus(e.target.id)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" value={t("Beschreibung")} />
          <Textarea
            id="description"
            value={description?.description ?? ""}
            onChange={(e) => setDescription({ description: e.target.value })}
            onBlur={(e) =>
              setDescription({ description: e.target.value.trim() })
            }
            rows={4}
            className="resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="contactPerson"
            value={t("Ansprechpartner für Quellsystem")}
          />
          <TextInput
            id="contactPerson"
            value={description?.contactInfo ?? ""}
            maxLength={textInputLimit.md}
            onChange={(e) => setDescription({ contactInfo: e.target.value })}
            onBlur={(e) =>
              setDescription({ contactInfo: e.target.value.trim() })
            }
          />
        </div>
      </div>
    </>
  );
}
