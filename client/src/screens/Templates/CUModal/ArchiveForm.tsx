import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { Label, Select } from "flowbite-react";
import { FiLock } from "react-icons/fi";

import t from "../../../utils/translation";
import {
  getTextInputColor,
  ValidationMessages,
  ValidationReport,
  Validator,
} from "../../../utils/forms";
import { genericSort } from "../../../utils/genericSort";
import useGlobalStore from "../../../store";
import { FormSectionComponentProps } from "../../../components/SectionedForm";
import { useFormStore } from "./store";

export type ArchiveFormChildren = "archiveId";
export type ArchiveFormValidator = Validator<ArchiveFormChildren>;

export function validateArchiveId(
  strict: boolean,
  archiveId: string | undefined
): ValidationReport | undefined {
  if (archiveId === undefined && !strict) return;
  if (archiveId === undefined || archiveId === "")
    return {
      ok: false,
      errors: [ValidationMessages.EmptyValue("Zielsystem")],
    };
  return { ok: true };
}

export interface Archive {
  id?: string;
}

export default function ArchiveForm({
  name,
  active,
}: FormSectionComponentProps) {
  const archives = useGlobalStore((state) => state.template.archives);
  const [targetArchive, setTargetArchive] = useFormStore(
    useShallow((state) => [state.targetArchive, state.setTargetArchive])
  );
  const linkedJobs = useFormStore((state) => state.linkedJobs);
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const [initialTargetArchiveUndefined, setInitialTargetArchiveUndefined] =
    useState(true);
  const [formVisited, setFormVisited] = useState(active);

  const [focus, setFocus] = useState("");

  // handle state to recognise whether target archive is already set at mount
  useEffect(
    () => setInitialTargetArchiveUndefined(targetArchive?.id === undefined),
    // eslint-disable-next-line
    []
  );

  // track visited
  useEffect(() => {
    if (active) setFormVisited(true);
  }, [active]);

  // handle validation
  // * archiveId
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        targetArchive: {
          children: {
            id: validator.children?.targetArchive?.children?.id?.validate(
              false
            ),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [targetArchive?.id]);
  // * form section
  useEffect(() => {
    if (!formVisited) return;
    if (validator.children?.targetArchive?.report?.ok === undefined && active)
      return;
    setCurrentValidationReport({
      children: {
        targetArchive: validator.children?.targetArchive?.validate(true),
      },
    });
    // eslint-disable-next-line
  }, [active, targetArchive?.id]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <div className="space-y-2">
          <Label htmlFor="targetArchiveId" value="" />
          <div className="flex flex-row space-x-2 items-center">
            <Select
              id="targetArchiveId"
              disabled={!initialTargetArchiveUndefined && (linkedJobs ?? 0) > 0}
              value={targetArchive?.id ?? ""}
              color={getTextInputColor({
                ok:
                  focus === "archiveId"
                    ? undefined
                    : validator.children.targetArchive?.children.id?.report?.ok,
              })}
              onChange={(e) => setTargetArchive({ id: e.target.value })}
              onFocus={(e) => setFocus(e.target.id)}
              onBlur={() => setFocus("")}
            >
              <option value="">{t("Bitte auswählen")}</option>
              {Object.values(archives)
                .sort(genericSort({ field: "name" }))
                .map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              {targetArchive?.id && archives[targetArchive.id] === undefined ? (
                <option value={targetArchive.id} disabled>
                  {t(
                    `Unbekanntes Zielsystem '${targetArchive.id}' (nicht mehr verfügbar)`
                  )}
                </option>
              ) : null}
            </Select>
            {!initialTargetArchiveUndefined && (linkedJobs ?? 0) > 0 && (
              <FiLock />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
