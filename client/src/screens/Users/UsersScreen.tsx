import { createContext, useEffect, useState } from "react";
import { Label, Select, Button, TextInput, Table, Alert } from "flowbite-react";
import { Navigate } from "react-router";

import t from "../../utils/translation";
import { truncateText } from "../../utils/forms";
import { User, GroupMembership } from "../../types";
import useGlobalStore from "../../store";
import MessageBox, {
  MessageHandler,
  useMessageHandler,
} from "../../components/MessageBox";
import CUModal from "./CUModal/Modal";
import {
  TableCellProps,
  LastnameCell,
  FirstnameCell,
  EMailCell,
  GroupsCell,
  UsernameCell,
  ActionsCell,
} from "./TableCells";

enum ColumnIdentifier {
  Lastname = "lastname",
  Firstname = "firstname",
  Email = "email",
  Username = "username",
  Actions = "actions",
}

interface TableColumn {
  id?: ColumnIdentifier;
  name: string;
  Cell: (user: TableCellProps) => JSX.Element;
}

const tableColumns: TableColumn[] = [
  { id: ColumnIdentifier.Lastname, name: t("Nachname"), Cell: LastnameCell },
  { id: ColumnIdentifier.Firstname, name: t("Vorname"), Cell: FirstnameCell },
  { id: ColumnIdentifier.Email, name: t("E-Mail"), Cell: EMailCell },
  { name: t("Rolle"), Cell: GroupsCell },
  {
    id: ColumnIdentifier.Username,
    name: t("Benutzername"),
    Cell: UsernameCell,
  },
  { id: ColumnIdentifier.Actions, name: t("Aktion"), Cell: ActionsCell },
];

export const ErrorMessageContext = createContext<MessageHandler | undefined>(
  undefined
);

interface UsersScreenProps {
  useACL?: boolean;
}

export default function UsersScreen({ useACL = false }: UsersScreenProps) {
  const errorMessageHandler = useMessageHandler([]);

  const [filter, setFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>(ColumnIdentifier.Lastname);
  const [searchFor, setSearchFor] = useState<string | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const fetchGroups = useGlobalStore((state) => state.permission.fetchGroups);
  const userStore = useGlobalStore((state) => state.user);
  const workspaceStore = useGlobalStore((state) => state.workspace);
  const groups = useGlobalStore((state) => state.permission.groups);

  const acl = useGlobalStore((state) => state.session.acl);

  // run store-logic
  // * fetch existing user groups
  useEffect(
    () =>
      fetchGroups({
        useACL: useACL,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: "fetch-user-groups",
            text: msg,
          }),
      }),
    // eslint-disable-next-line
    [useACL]
  );
  // * fetch all userIds on first load
  useEffect(
    () =>
      userStore.fetchList({
        useACL: useACL,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: "fetch-user-config-list",
            text: msg,
          }),
      }),
    // eslint-disable-next-line
    [useACL]
  );
  // * fetch Users if userIds changed
  useEffect(() => {
    for (const userId of userStore.userIds) {
      userStore.fetchUser({
        userId,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: `fetch-user-config-${userId}`,
            text: msg,
          }),
      });
    }
    // eslint-disable-next-line
  }, [userStore.userIds]);
  // * fetch all workspaceIds on first load
  useEffect(
    () =>
      workspaceStore.fetchList({
        useACL: useACL,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: "fetch-workspace-config-list",
            text: msg,
          }),
      }),
    // eslint-disable-next-line
    [useACL]
  );
  // * fetch Workspaces if workspaceIds changed
  useEffect(() => {
    for (const workspaceId of workspaceStore.workspaceIds) {
      workspaceStore.fetchWorkspace({
        workspaceId,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: `fetch-workspace-config-${workspaceId}`,
            text: msg,
          }),
      });
    }
    // eslint-disable-next-line
  }, [workspaceStore.workspaceIds]);
  // end run store-logic

  /**
   * Extracts an array of unique workspace ids from given users.
   * @param users Array of users.
   * @returns An array of available workspace ids.
   */
  function findWorkspaceIds(users: User[]): string[] {
    return Array.from(
      new Set(
        users
          .map((user) => {
            const workspaces: string[] = [];
            for (const group of user.groups ?? []) {
              if (group.workspace) workspaces.push(group.workspace);
            }
            return workspaces;
          })
          .reduce((p, c) => p.concat(c), [])
      )
    );
  }

  /**
   * Helper for filtering users with respect to workspace.
   * @param groups Array of group-memberships of a user.
   * @param workspace Workspace-identifier to be filter for.
   * @returns True if user has group in workspace or workspace is empty string.
   */
  function hasWorkspace(groups: GroupMembership[], workspace: string): boolean {
    if (workspace === "") return true;
    return groups.filter((group) => group.workspace === workspace).length > 0;
  }

  return useACL && !acl?.VIEW_SCREEN_USERCONFIGS ? (
    <Navigate to="/" replace />
  ) : (
    <ErrorMessageContext.Provider value={errorMessageHandler}>
      <div className="mx-20 mt-4">
        <div className="flex justify-between items-center relative w-full mb-5">
          <h3 className="text-4xl font-bold">{t("Nutzer")}</h3>
          {useACL && !acl?.CREATE_USERCONFIG ? null : (
            <Button type="button" onClick={() => setShowNewUserModal(true)}>
              {t("Neuen Nutzer erstellen")}
            </Button>
          )}
          <CUModal
            show={showNewUserModal}
            onClose={() => setShowNewUserModal(false)}
          />
        </div>
        <MessageBox
          messages={errorMessageHandler.messages}
          messageTitle={t("Ein Fehler ist aufgetreten:")}
          onDismiss={errorMessageHandler.clearMessages}
        />
        {useACL && !acl?.READ_USERCONFIG ? (
          <Alert className="my-2" color="warning">
            {t("Kein Lese-Zugriff auf Nutzerkonfigurationen.")}
          </Alert>
        ) : (
          <>
            <div className="flex justify-between items-center relative w-full my-4">
              <div className="flex flex-row space-x-2 items-center px-2">
                <Label
                  className="min-w-20 mx-2"
                  htmlFor="workspaceFilter"
                  value={t("Filtern nach")}
                />
                <Select
                  className="min-w-32"
                  id="workspaceFilter"
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="">{t("Arbeitsbereich")}</option>
                  {findWorkspaceIds(Object.values(userStore.users))
                    .sort((a, b) =>
                      workspaceStore.workspaces[a]?.name.toLowerCase() >
                      workspaceStore.workspaces[b]?.name.toLowerCase()
                        ? 1
                        : -1
                    )
                    .map((workspace) => (
                      <option key={workspace} value={workspace}>
                        {truncateText(
                          workspaceStore.workspaces[workspace]?.name ?? "",
                          30
                        )}
                      </option>
                    ))}
                </Select>
              </div>
              <div className="flex justify-between items-center">
                <TextInput
                  className="min-w-32"
                  type="text"
                  placeholder={t("Suche nach")}
                  onChange={(e) => {
                    const text = e.target.value.trim();
                    if (text === "") setSearchFor(null);
                    else setSearchFor(text);
                  }}
                />
                <div className="flex flex-row items-center ml-2">
                  <Label
                    className="min-w-24 mx-2"
                    htmlFor="sortBy"
                    value={t("Sortieren nach")}
                  />
                  <Select
                    className="min-w-32"
                    id="sortBy"
                    onChange={(e) => {
                      if (
                        (
                          [
                            ColumnIdentifier.Lastname,
                            ColumnIdentifier.Firstname,
                            ColumnIdentifier.Email,
                            ColumnIdentifier.Username,
                          ] as string[]
                        ).includes(e.target.value)
                      )
                        setSortBy(e.target.value as ColumnIdentifier);
                      else
                        errorMessageHandler.pushMessage({
                          id: "unknown-sort-by-id",
                          text: t(
                            `Unbekannter Schlüssel '${e.target.value}' beim Sortieren.`
                          ),
                        });
                    }}
                  >
                    {tableColumns
                      .filter(
                        (item) =>
                          item.id !== undefined &&
                          [
                            ColumnIdentifier.Lastname,
                            ColumnIdentifier.Firstname,
                            ColumnIdentifier.Username,
                            ColumnIdentifier.Email,
                          ].includes(item.id)
                      )
                      .filter((item) => item.id !== undefined)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </Select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="table w-full p-1 pb-2">
                <Table hoverable>
                  <Table.Head>
                    {tableColumns.map((item) => (
                      <item.Cell key={item.name} />
                    ))}
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {Object.values(userStore.users)
                      .filter((user) => user.status !== "deleted")
                      .filter((user) => hasWorkspace(user.groups ?? [], filter))
                      .filter((user) =>
                        searchFor === null
                          ? true
                          : (
                              "" +
                              (user.lastname ?? "") +
                              (user.firstname ?? "") +
                              (user.email ?? "") +
                              user.username +
                              (user.groups ?? []).map(
                                (group) =>
                                  (groups?.find(
                                    (group_) => group_.id === group.id
                                  )?.name ?? "") +
                                  ((group.workspace &&
                                    workspaceStore.workspaces[group.workspace]
                                      ?.name) ??
                                    "")
                              )
                            )
                              .toLowerCase()
                              .includes(searchFor.toLowerCase())
                      )
                      .sort((a, b) => {
                        switch (sortBy) {
                          case "lastname":
                            return (a.lastname ?? "-").toLowerCase() <
                              (b.lastname ?? "-").toLowerCase()
                              ? -1
                              : 1;
                          case "firstname":
                            return (a.firstname ?? "-").toLowerCase() <
                              (b.firstname ?? "-").toLowerCase()
                              ? -1
                              : 1;
                          case "username":
                            return (a.username ?? "-").toLowerCase() <
                              (b.username ?? "-").toLowerCase()
                              ? -1
                              : 1;
                          case "email":
                            return (a.email ?? "-").toLowerCase() <
                              (b.email ?? "-").toLowerCase()
                              ? -1
                              : 1;
                          default:
                            return 1;
                        }
                      })
                      .map((user) => (
                        <Table.Row key={user.username}>
                          {tableColumns.map((item) => (
                            <item.Cell
                              key={user.username + item.name}
                              user={user}
                            />
                          ))}
                        </Table.Row>
                      ))}
                  </Table.Body>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>
    </ErrorMessageContext.Provider>
  );
}
