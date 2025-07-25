import { Table, List } from "flowbite-react";

import t from "../../utils/translation";
import { User } from "../../types";
import useGlobalStore from "../../store";

export interface TableCellProps {
  user?: User;
}

export function LastnameCell({ user }: TableCellProps) {
  if (!user) return <Table.HeadCell>{t("Nachname")}</Table.HeadCell>;
  return <Table.Cell>{user.lastname ?? "-"}</Table.Cell>;
}

export function FirstnameCell({ user }: TableCellProps) {
  if (!user) return <Table.HeadCell>{t("Vorname")}</Table.HeadCell>;
  return <Table.Cell>{user.firstname ?? "-"}</Table.Cell>;
}

export function EMailCell({ user }: TableCellProps) {
  if (!user) return <Table.HeadCell>{t("E-Mail")}</Table.HeadCell>;
  return <Table.Cell>{user.email ?? "-"}</Table.Cell>;
}

export function UsernameCell({ user }: TableCellProps) {
  if (!user) return <Table.HeadCell>{t("Benutzername")}</Table.HeadCell>;
  return <Table.Cell>{user.username}</Table.Cell>;
}

export function GroupsCell({ user }: TableCellProps) {
  const workspaces = useGlobalStore((state) => state.workspace.workspaces);
  const groups = useGlobalStore((state) => state.permission.groups);
  if (!user) return <Table.HeadCell>{t("Rollen")}</Table.HeadCell>;
  return (
    <Table.Cell>
      <List>
        {
          // placeholder if no groups are assigned
        }
        {(user.groups === undefined || user.groups.length === 0) && "-"}
        {
          // list simple groups
        }
        {Array.from(
          // find all simple-group names
          new Set(
            (user.groups ?? [])
              .filter((group) => group.workspace === undefined)
              .map((group) => group.id)
          )
        ).map((name) => (
          // map into list
          <List.Item key={name + "-simple"}>
            {groups?.find((group) => group.id === name)?.name}
          </List.Item>
        ))}
        {
          // list workspace-specific groups
        }
        {Array.from(
          // find all workspace-group names
          new Set(
            (user.groups ?? [])
              .filter((group) => group.workspace !== undefined)
              .map((group) => group.id)
          )
        ).map(
          // map into list
          (name) => (
            <List.Item key={name + "-workspace"}>
              {groups?.find((group) => group.id === name)?.name +
                ": " +
                (user.groups ?? [])
                  .filter(
                    (group) =>
                      group.id === name && group.workspace !== undefined
                  )
                  .map(
                    (group) =>
                      (group.workspace && workspaces[group.workspace]?.name) ??
                      group.workspace ??
                      t("Unbekannt")
                  )
                  .sort((a, b) => a.localeCompare(b))
                  .join(", ")}
            </List.Item>
          )
        )}
      </List>
    </Table.Cell>
  );
}
