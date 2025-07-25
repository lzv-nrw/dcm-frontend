import { useEffect, useState } from "react";
import { TextInput, Button, Select } from "flowbite-react";

import { GroupMembership, Workspace, GroupInfo } from "../../types";
import t from "../../utils/translation";
import { truncateText } from "../../utils/forms";

interface GroupMembershipInputProps {
  groups: GroupInfo[];
  workspaces: Workspace[];
  onChange?: (memberships: GroupMembership[]) => void;
}
export default function GroupMembershipInput({
  groups,
  workspaces,
  onChange,
}: GroupMembershipInputProps) {
  const [workspaceSelectActive, setWorkspaceSelectActive] = useState(
    groups[0]?.workspaces ?? false
  );
  const [groupSelectValue, setGroupSelectValue] = useState(groups[0]?.id ?? "");
  const [workspaceSelectValue, setWorkspaceSelectValue] = useState("");
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);

  useEffect(() => {
    onChange?.(memberships);
  }, [onChange, memberships]);

  return (
    <div className="flex flex-col space-y-2">
      {memberships.map((membership, index) => (
        <div key={index} className="flex flex-row flex-grow space-x-2">
          <TextInput
            className="grow"
            disabled={true}
            value={
              groups.find((group) => group.id === membership.id)?.name ?? "?"
            }
          />
          <TextInput
            className="grow"
            disabled={true}
            value={
              workspaces.find(
                (workspace) => workspace.id === membership.workspace
              )?.name ?? "-"
            }
          />
          <Button
            className="w-28"
            color="failure"
            onClick={() =>
              setMemberships((state) => [
                ...state.slice(0, index),
                ...state.slice(index + 1),
              ])
            }
          >
            {t("Entfernen")}
          </Button>
        </div>
      ))}
      <div className="flex flex-row flex-grow space-x-2">
        <Select
          className="min-w-40 grow"
          value={groupSelectValue}
          onChange={(e) => {
            setGroupSelectValue(e.currentTarget.value);
            setWorkspaceSelectValue("");
            const groupInfo = groups.find(
              (group) => group.id === e.currentTarget.value
            );
            if (groupInfo) setWorkspaceSelectActive(groupInfo.workspaces);
            else setWorkspaceSelectActive(true);
          }}
        >
          {groups.map((group) => (
            <option
              disabled={
                memberships.find(
                  (membership) =>
                    !group.workspaces && group.id === membership.id
                ) !== undefined
              }
              key={group.id}
              value={group.id}
            >
              {group.name}
            </option>
          ))}
        </Select>
        <Select
          className="grow"
          disabled={!workspaceSelectActive}
          value={workspaceSelectValue}
          onChange={(e) => setWorkspaceSelectValue(e.target.value)}
        >
          <option
            disabled={
              memberships.find(
                (membership) =>
                  groupSelectValue === membership.id &&
                  undefined === membership.workspace
              ) !== undefined
            }
            value={""}
          >
            {t("Keine Zuordnung")}
          </option>
          {workspaces.map((workspace) => (
            <option
              disabled={
                memberships.find(
                  (membership) =>
                    groupSelectValue === membership.id &&
                    workspace.id === membership.workspace
                ) !== undefined
              }
              key={workspace.id}
              value={workspace.id}
            >
              {truncateText(workspace.name, 40)}
            </option>
          ))}
        </Select>
        <Button
          className="w-28"
          disabled={
            workspaceSelectValue
              ? memberships.find(
                  (membership) =>
                    groupSelectValue === membership.id &&
                    workspaceSelectValue === membership.workspace
                ) !== undefined
              : memberships.find(
                  (membership) =>
                    groupSelectValue === membership.id &&
                    undefined === membership.workspace
                ) !== undefined
          }
          onClick={() => {
            setMemberships((state) => {
              if (workspaceSelectValue === "")
                return [...state, { id: groupSelectValue }];
              return [
                ...state,
                {
                  id: groupSelectValue,
                  workspace: workspaceSelectValue,
                },
              ];
            });
          }}
        >
          {t("Hinzufügen")}
        </Button>
      </div>
    </div>
  );
}
