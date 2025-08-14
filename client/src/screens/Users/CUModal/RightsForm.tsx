import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import t from "../../../utils/translation";
import { Validator } from "../../../utils/forms";
import { GroupMembership } from "../../../types";
import { FormSectionComponentProps } from "../../../components/SectionedForm";
import { useFormStore } from "./store";
import GroupMembershipInput from "./GroupMembershipInput";
import useGlobalStore from "../../../store";

export type RightsFormChildren = "memberships";
export type RightsFormValidator = Validator<RightsFormChildren>;

export interface Rights {
  memberships?: GroupMembership[];
}

export function RightsForm({ name, active }: FormSectionComponentProps) {
  const workspaces = useGlobalStore((state) => state.workspace.workspaces);
  const groups = useGlobalStore((state) => state.permission.groups);

  const [rights, setRights] = useFormStore(
    useShallow((state) => [state.rights, state.setRights])
  );
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const [formVisited, setFormVisited] = useState(active);

  // track visited
  useEffect(() => {
    if (active) setFormVisited(true);
  }, [active]);

  // handle validation
  // * form section
  useEffect(() => {
    if (!formVisited || active) return;
    setCurrentValidationReport({
      children: {
        rights: validator.children?.rights?.validate(true),
      },
    });
    // eslint-disable-next-line
  }, [active]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        {(rights?.memberships ?? []).length === 0 ? (
          <span>
            {t("Noch keine Rollen hinzugefügt.")}
          </span>
        ) : (
          <span className="font-semibold">{t("Hinzugefügte Rollen")}</span>
        )}
        <GroupMembershipInput
          groups={groups ?? []}
          workspaces={Object.values(workspaces)}
          memberships={rights?.memberships ?? []}
          onChange={(memberships) => setRights({ memberships })}
        />
      </div>
    </>
  );
}
