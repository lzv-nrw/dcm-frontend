import { useEffect, useState } from "react";
import { Button, Select } from "flowbite-react";
import { FiX } from "react-icons/fi";

import { GroupMembership, Workspace, GroupInfo } from "../../../types";
import t from "../../../utils/translation";
import { truncateText } from "../../../utils/forms";

interface GroupMembershipInputProps {
  groups: GroupInfo[];
  workspaces: Workspace[];
  memberships: GroupMembership[];
  onChange?: (memberships: GroupMembership[]) => void;
}
export default function GroupMembershipInput({
  groups,
  workspaces,
  memberships,
  onChange,
}: GroupMembershipInputProps) {
  const [groupSelectOptions, setGroupSelectOptions] = useState<string[]>([]);
  const [workspaceSelectOptions, setWorkspaceSelectOptions] = useState<
    string[] | undefined
  >(undefined);

  const [groupSelectValue, setGroupSelectValue] = useState("");
  const [workspaceSelectValue, setWorkspaceSelectValue] = useState("");

  // update select-options depending on configuration and input
  // * only allow groups that do not appear with workspace-association yet
  useEffect(() => {
    const allowedGroups: string[] = [];
    for (const group of groups) {
      // group has not been added at all
      if (!memberships.find((membership) => membership.id === group.id))
        allowedGroups.push(group.id);

      if (!group.workspaces) continue;

      // group is only allowed
      if (
        // if no membership without workspace
        !memberships.find(
          (membership) =>
            membership.id === group.id && membership.workspace === undefined
        ) ||
        // or if there are uncovered workspaces
        memberships
          .map((membership) => membership.workspace)
          .filter((workspaceId) => workspaceId !== undefined).length <
          workspaces.length
      )
        allowedGroups.push(group.id);
    }
    setGroupSelectOptions(allowedGroups);
  }, [groups, workspaces, memberships]);
  // * only allow workspaces that are not yet added for any workspace-related group
  useEffect(() => {
    // workspace is not applicable without group/group that supports workspaces
    if (!groupSelectValue) {
      setWorkspaceSelectOptions(undefined);
      return;
    }
    const group = groups.find((group) => group.id === groupSelectValue);
    if (!group || !group.workspaces) {
      setWorkspaceSelectOptions(undefined);
      return;
    }

    // filter for workspaces that do not exist yet
    const currentMembershipWorkspaces = memberships
      .map((membership) => membership.workspace)
      .filter((workspaceId) => workspaceId !== undefined);
    setWorkspaceSelectOptions(
      workspaces
        .filter(
          (workspace) => !currentMembershipWorkspaces.includes(workspace.id)
        )
        .map((workspace) => workspace.id)
    );
    // eslint-disable-next-line
  }, [groups, workspaces, groupSelectValue]);

  // handle resetting workspace-select-input on changed conditions
  useEffect(() => {
    if (
      (workspaceSelectValue === "" &&
        !memberships.find(
          (membership) =>
            membership.id === groupSelectValue &&
            membership.workspace === undefined
        )) ||
      workspaceSelectOptions?.includes(workspaceSelectValue)
    )
      return;
    setWorkspaceSelectValue(workspaceSelectOptions?.[0] ?? "");
    // eslint-disable-next-line
  }, [workspaceSelectOptions, setWorkspaceSelectValue]);

  return (
    <div className="flex flex-col space-y-2">
      {memberships.map((membership, index) => (
        <div
          key={index}
          className="flex flex-row justify-between bg-gray-50 border border-gray-200 p-3 rounded-lg shadow-md"
        >
          <div className="flex flex-row flex-grow items-center space-x-2">
            <span className="font-bold">
              {groups.find((group) => group.id === membership.id)?.name ?? "?"}
            </span>
            {membership.workspace !== undefined && (
              <>
                <span>{t("in Arbeitsbereich")}</span>
                <span className="font-bold">
                  {workspaces.find(
                    (workspace) => workspace.id === membership.workspace
                  )?.name ?? "-"}
                </span>
              </>
            )}
          </div>
          <Button
            color="light"
            className="w-8 h-8 flex items-center rounded-full p-2"
            onClick={() =>
              onChange?.([
                ...memberships.slice(0, index),
                ...memberships.slice(index + 1),
              ])
            }
          >
            <FiX size={16} />
          </Button>
        </div>
      ))}
      {memberships.length < workspaces.length + groups.length && (
        <div className="flex flex-row flex-grow items-center space-x-2">
          <Select
            className="w-48"
            value={groupSelectValue}
            onChange={(e) => setGroupSelectValue(e.currentTarget.value)}
          >
            <option value="">{t("Bitte auswählen")}</option>
            {groups
              .filter((group) => groupSelectOptions.includes(group.id))
              .map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
          </Select>
          {workspaceSelectOptions !== undefined ? (
            <>
              <span>{t("in Arbeitsbereich")}</span>
              <Select
                className="w-48"
                value={workspaceSelectValue}
                onChange={(e) => setWorkspaceSelectValue(e.target.value)}
              >
                {memberships.find(
                  (membership) =>
                    membership.id === groupSelectValue &&
                    (membership.workspace ?? "") === ""
                ) ? null : (
                  <option value="">{t("Bitte auswählen")}</option>
                )}
                {workspaceSelectOptions
                  .map(
                    (workspaceId) =>
                      workspaces.find(
                        (workspace) => workspace.id === workspaceId
                      ) ?? {
                        id: workspaceId,
                        name: t("Unbekannter Arbeitsbereich"),
                      }
                  )
                  .sort((a, b) => (a.name > b.name ? 1 : -1))
                  .map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {truncateText(workspace.name, 40)}
                    </option>
                  ))}
              </Select>
            </>
          ) : null}
          <Button
            disabled={groupSelectValue === ""}
            onClick={() => {
              if (!onChange) return;
              if (workspaceSelectValue === "")
                return onChange([...memberships, { id: groupSelectValue }]);
              return onChange([
                ...memberships,
                {
                  id: groupSelectValue,
                  workspace: workspaceSelectValue,
                },
              ]);
            }}
          >
            {t("Hinzufügen")}
          </Button>
        </div>
      )}
    </div>
  );
}
