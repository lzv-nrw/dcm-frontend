import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { Label, Select, TextInput, Textarea } from "flowbite-react";

import t from "../../../utils/translation";
import { Template } from "../../../types";
import useGlobalStore from "../../../store";
import {
  getTextInputColor,
  textInputLimit,
  truncateText,
  ValidationMessages,
  ValidationReport,
  Validator,
} from "../../../utils/forms";
import {genericSort} from "../../../utils/genericSort";
import { FormSectionComponentProps } from "../../../components/SectionedForm";
import { useFormStore } from "./store";

export type DescriptionFormChildren = "name" | "workspaceId";
export type DescriptionFormValidator = Validator<DescriptionFormChildren>;

export function validateName(
  strict: boolean,
  name: string | undefined
): ValidationReport | undefined {
  if (name === undefined && !strict) return;
  if (name === undefined)
    return { ok: false, errors: [ValidationMessages.EmptyValue("Titel")] };
  if (name === "")
    return {
      ok: false,
      errors: [ValidationMessages.EmptyValue("Titel")],
    };
  return { ok: true };
}

export function validateWorkspaceId(
  strict: boolean,
  workspaceId: string | undefined
): ValidationReport | undefined {
  if (workspaceId === undefined && !strict) return;
  if (workspaceId === undefined || workspaceId === "")
    return {
      ok: false,
      errors: [ValidationMessages.EmptyValue("Arbeitsbereich")],
    };
  return { ok: true };
}

export type Description = Pick<
  Template,
  "name" | "description" | "workspaceId"
>;

export default function DescriptionForm({
  name,
  active,
}: FormSectionComponentProps) {
  const workspaces = useGlobalStore((state) => state.workspace.workspaces);
  const [description, setDescription] = useFormStore(
    useShallow((state) => [state.description, state.setDescription])
  );
  const linkedJobs = useFormStore((state) => state.linkedJobs);
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
  // * workspaceId
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        description: {
          children: {
            workspaceId:
              validator.children?.description?.children?.workspaceId?.validate(
                false
              ),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [description?.workspaceId]);
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
  }, [active, description?.name, description?.workspaceId]);

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
          <Label htmlFor="workspaceId" value={t("Arbeitsbereich*")} />
          <Select
            id="workspaceId"
            value={description?.workspaceId ?? ""}
            color={getTextInputColor({
              ok:
                focus === "workspaceId"
                  ? undefined
                  : validator.children?.description?.children?.workspaceId
                      ?.report?.ok,
            })}
            onChange={(e) => setDescription({ workspaceId: e.target.value })}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={() => setFocus("")}
          >
            <option value="">{t("Bitte auswählen")}</option>
            {Object.values(workspaces)
              .sort(genericSort({ field: "name" }))
              .map(({ id, name }) => (
                <option key={id} value={id}>
                  {truncateText(name, 70)}
                </option>
              ))}
          </Select>
          {(linkedJobs ?? 0) > 0 && (
            <span className="text-xs">
              {t(
                "Eine Änderung des Arbeitsbereichs kann dazu führen, dass Nutzer ihren Zugriff verlieren."
              )}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
