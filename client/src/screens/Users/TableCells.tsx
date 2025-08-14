import { useState } from "react";
import { Table, List, Button, Spinner } from "flowbite-react";
import { FiEdit3, FiTrash2 } from "react-icons/fi";

import t from "../../utils/translation";
import { User } from "../../types";
import useGlobalStore from "../../store";
import ConfirmModal from "../../components/ConfirmModal";
import CUModal from "./CUModal/Modal";
import { useFormStore } from "./CUModal/store";
import { credentialsValue, host } from "../../App";

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

export function ActionsCell({ user }: TableCellProps) {
  const acl = useGlobalStore((state) => state.session.acl);
  const fetchList = useGlobalStore((state) => state.user.fetchList);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showCUModal, setShowCUModal] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const initFromConfig = useFormStore((state) => state.initFromConfig);

  if (!user)
    return <Table.HeadCell className="w-1">{t("Aktion")}</Table.HeadCell>;
  return (
    <Table.Cell>
      <div className="flex flex-row space-x-1">
        {acl?.MODIFY_USERCONFIG ? (
          <>
            <Button
              className="p-0 aspect-square items-center"
              size="xs"
              onClick={() => {
                if (user === undefined) {
                  alert(
                    t(
                      "Etwas ist schief gelaufen, die Nutzerkonfiguration fehlt."
                    )
                  );
                  return;
                }
                initFromConfig(user);
                setShowCUModal(true);
              }}
            >
              <FiEdit3 size={20} />
            </Button>
            <CUModal show={showCUModal} onClose={() => setShowCUModal(false)} />
          </>
        ) : null}
        {acl?.DELETE_USERCONFIG ? (
          <>
            <Button
              className="p-0 aspect-square items-center"
              size="xs"
              disabled={loadingDelete}
              onClick={() => {
                setLoadingDelete(true);
                setShowConfirmDeleteModal(true);
              }}
            >
              {loadingDelete ? <Spinner size="sm" /> : <FiTrash2 size={20} />}
            </Button>
            <ConfirmModal
              show={showConfirmDeleteModal}
              title={t("Löschen")}
              onConfirm={() => {
                setShowConfirmDeleteModal(false);
                fetch(
                  host +
                    "/api/admin/user?" +
                    new URLSearchParams({ id: user.id }).toString(),
                  {
                    method: "DELETE",
                    credentials: credentialsValue,
                  }
                )
                  .then(async (response) => {
                    setLoadingDelete(false);
                    if (!response.ok) {
                      throw new Error(
                        `Unexpected response (${await response.text()}).`
                      );
                    }
                    fetchList({ replace: true });
                  })
                  .catch((error) => {
                    setLoadingDelete(false);
                    alert(error.message);
                    fetchList({ replace: true });
                  });
              }}
              onCancel={() => {
                setShowConfirmDeleteModal(false);
                setLoadingDelete(false);
              }}
            >
              <span>
                {user?.username
                  ? t(
                      `Nutzer-Konfiguration für Nutzer '${user.username}' löschen?`
                    )
                  : t("Nutzer-Konfiguration löschen?")}
              </span>
            </ConfirmModal>
          </>
        ) : null}
      </div>
    </Table.Cell>
  );
}
