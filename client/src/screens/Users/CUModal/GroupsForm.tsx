import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import t from "../../../utils/translation";
import { Validator } from "../../../utils/forms";
import { GroupMembership } from "../../../types";
import { FormSectionComponentProps } from "../../../components/SectionedForm";
import { useFormStore } from "./store";
import GroupMembershipInput from "./GroupMembershipInput";
import useGlobalStore from "../../../store";

export type GroupsFormChildren = "memberships";
export type GroupsFormValidator = Validator<GroupsFormChildren>;

export interface Groups {
  memberships?: GroupMembership[];
}

export function GroupsForm({ name, active }: FormSectionComponentProps) {
  const workspaces = useGlobalStore((state) => state.workspace.workspaces);
  const groupsConfiguration = useGlobalStore(
    (state) => state.permission.groups
  );

  const [groups, setGroups] = useFormStore(
    useShallow((state) => [state.groups, state.setGroups])
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
    if (!formVisited) return;
    if (validator.children?.groups?.report?.ok === undefined && active) return;
    setCurrentValidationReport({
      children: {
        groups: validator.children?.groups?.validate(true),
      },
    });
    // eslint-disable-next-line
  }, [active]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        {(groups?.memberships ?? []).length === 0 ? (
          <span>{t("Noch keine Rollen hinzugefügt.")}</span>
        ) : (
          <span className="font-semibold">{t("Hinzugefügte Rollen")}</span>
        )}
        <GroupMembershipInput
          groups={groupsConfiguration ?? []}
          workspaces={Object.values(workspaces)}
          memberships={groups?.memberships ?? []}
          onChange={(memberships) => setGroups({ memberships })}
        />
      </div>
    </>
  );
}
