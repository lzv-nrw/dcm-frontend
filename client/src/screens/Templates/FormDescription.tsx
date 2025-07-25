import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { Label, Select, TextInput, Textarea } from "flowbite-react";

import t from "../../utils/translation";
import { Template } from "../../types";
import useGlobalStore from "../../store";
import {
  getTextInputColor,
  textInputLimit,
  truncateText,
} from "../../utils/forms";
import { FormSectionComponentProps } from "../../components/SectionedForm";
import { useNewTemplateFormStore } from "./NewTemplateModal";

export type Description = Pick<
  Template,
  "name" | "description" | "workspaceId"
>;

export default function DescriptionForm({
  name,
  setOk,
}: FormSectionComponentProps) {
  const workspaces = useGlobalStore((state) => state.workspace.workspaces);
  const [description, setDescription] = useNewTemplateFormStore(
    useShallow((state) => [state.description, state.setDescription])
  );

  const [focus, setFocus] = useState("");
  const [title, setTitle] = useState<string | null>(description?.name ?? null);
  const [titleOk, setTitleOk] = useState<boolean | null>(null);
  const [descriptionValue, setDescriptionValue] = useState<string | null>(
    description?.description ?? null
  );
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    description?.workspaceId ?? null
  );
  const [workspaceIdOk, setWorkspaceIdOk] = useState<boolean | null>(null);

  // handle validation
  // * title
  useEffect(() => {
    setTitleOk(title === null ? null : title !== "");
    // eslint-disable-next-line
  }, [title]);
  // * workspaceId
  useEffect(() => {
    setWorkspaceIdOk(
      workspaceId === null ? null : workspaces[workspaceId] !== undefined
    );
    // eslint-disable-next-line
  }, [workspaceId]);
  // * form section
  useEffect(() => {
    if (titleOk !== null || workspaceIdOk !== null)
      setOk?.((titleOk ?? false) && (workspaceIdOk ?? false));
    else setOk?.(null);
  }, [titleOk, workspaceIdOk, setOk]);

  // update store when changing form data
  useEffect(() => {
    if (titleOk && title !== null) {
      setDescription({ ...description, name: title });
    }
    // eslint-disable-next-line
  }, [title, titleOk]);
  useEffect(() => {
    if (descriptionValue !== null)
      setDescription({ ...description, description: descriptionValue });
    // eslint-disable-next-line
  }, [descriptionValue]);
  useEffect(() => {
    if (workspaceIdOk && workspaceId !== null) {
      setDescription({ ...description, workspaceId });
    }
    // eslint-disable-next-line
  }, [workspaceId, workspaceIdOk]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <div className="space-y-2">
          <Label htmlFor="title" value={t("Titel*")} />
          <TextInput
            id="title"
            value={title ?? ""}
            color={getTextInputColor({
              ok: focus === "title" ? null : titleOk,
            })}
            maxLength={textInputLimit.md}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={(e) => {
              setFocus("");
              setTitle(e.target.value.trim());
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" value={t("Beschreibung")} />
          <Textarea
            id="description"
            value={descriptionValue ?? ""}
            onChange={(e) => setDescriptionValue(e.target.value)}
            onBlur={(e) => setDescriptionValue(e.target.value.trim())}
            className="resize-none"
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workspaceId" value={t("Arbeitsbereich*")} />
          <Select
            id="workspaceId"
            color={getTextInputColor({
              ok: focus === "workspaceId" ? null : workspaceIdOk,
            })}
            onChange={(e) => setWorkspaceId(e.target.value)}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={() => setFocus("")}
          >
            <option value="">{t("Bitte auswählen")}</option>
            {Object.values(workspaces)
              .sort((a, b) =>
                a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1
              )
              .map(({ id, name }) => (
                <option key={id} value={id}>
                  {truncateText(name, 70)}
                </option>
              ))}
          </Select>
        </div>
      </div>
    </>
  );
}
