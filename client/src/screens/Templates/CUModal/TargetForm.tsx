import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { Label, Select } from "flowbite-react";

import t from "../../../utils/translation";
import {
  getTextInputColor,
  ValidationMessages,
  ValidationReport,
  Validator,
} from "../../../utils/forms";
import { FormSectionComponentProps } from "../../../components/SectionedForm";
import { useFormStore } from "./store";

export type TargetFormChildren = "targetId";
export type TargetFormValidator = Validator<TargetFormChildren>;

export function validateTargetId(
  strict: boolean,
  targetId: string | undefined
): ValidationReport | undefined {
  if (targetId === undefined && !strict) return;
  if (targetId === undefined || targetId === "")
    return {
      ok: false,
      errors: [ValidationMessages.EmptyValue("Zielsystem")],
    };
  return { ok: true };
}

export interface Target {
  // TODO: fix after adding targetId to Template-interface
  targetId?: string;
}

export default function TargetForm({
  name,
  active,
}: FormSectionComponentProps) {
  const targetSystems = {
    hbzRosetta: { id: "hbzRosetta", name: "hbz-Rosetta" },
    rosettaDummy: { id: "rosettaDummy", name: "Rosetta-Dummy" },
  };
  const [target, setTarget] = useFormStore(
    useShallow((state) => [state.target, state.setTarget])
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
  // * targetId
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        target: {
          children: {
            targetId:
              validator.children?.target?.children?.targetId?.validate(false),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [target?.targetId]);
  // * form section
  useEffect(() => {
    if (!formVisited || active) return;
    setCurrentValidationReport({
      children: {
        target: validator.children?.target?.validate(true),
      },
    });
    // eslint-disable-next-line
  }, [active]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <div className="space-y-2">
          <Label htmlFor="targetId" value="" />
          <Select
            id="targetId"
            value={target?.targetId ?? ""}
            color={getTextInputColor({
              ok:
                focus === "targetId"
                  ? undefined
                  : validator.children.target?.children.targetId?.report?.ok,
            })}
            onChange={(e) => setTarget({ targetId: e.target.value })}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={() => setFocus("")}
          >
            <option value="">{t("Bitte auswählen")}</option>
            {Object.values(targetSystems)
              .sort((a, b) =>
                a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1
              )
              .map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
          </Select>
        </div>
      </div>
    </>
  );
}
