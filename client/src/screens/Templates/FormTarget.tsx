import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { Label, Select } from "flowbite-react";

import t from "../../utils/translation";
import { getTextInputColor } from "../../utils/forms";
import { FormSectionComponentProps } from "../../components/SectionedForm";
import { useNewTemplateFormStore } from "./NewTemplateModal";

export interface Target {
  // TODO: fix after adding targetId to Template-interface
  targetId?: string;
}

export default function TargetForm({ name, setOk }: FormSectionComponentProps) {
  const targetSystems = {
    hbzRosetta: { id: "hbzRosetta", name: "hbz-Rosetta" },
    rosettaDummy: { id: "rosettaDummy", name: "Rosetta-Dummy" },
  };
  const [target, setTarget] = useNewTemplateFormStore(
    useShallow((state) => [state.target, state.setTarget])
  );

  const [focus, setFocus] = useState("");
  const [targetId, setTargetId] = useState<string | null>(
    target?.targetId ?? null
  );
  const [targetIdOk, setTargetIdOk] = useState<boolean | null>(null);

  // handle validation
  // * targetId
  useEffect(() => {
    setTargetIdOk(targetId === null ? null : targetId !== "");
    // eslint-disable-next-line
  }, [targetId]);
  // * form section
  useEffect(() => setOk?.(targetIdOk), [targetIdOk, setOk]);

  // update store when changing form data
  useEffect(() => {
    if (targetIdOk && targetId !== null) {
      setTarget({ ...target, targetId });
    }
    // eslint-disable-next-line
  }, [targetId, targetIdOk]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <div className="space-y-2">
          <Label htmlFor="targetId" value="" />
          <Select
            id="targetId"
            color={getTextInputColor({
              ok: focus === "targetId" ? null : targetIdOk,
            })}
            onChange={(e) => setTargetId(e.target.value)}
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
