import { useEffect, useState, createContext, useContext } from "react";
import { Card, Popover, Select, Spinner } from "flowbite-react";
import { FiMoreHorizontal, FiTrash2 } from "react-icons/fi";

import t from "../../utils/translation";
import { Template, User, Workspace } from "../../types";
import useGlobalStore from "../../store";
import { host, credentialsValue } from "../../App";
import UserDisplay from "../../components/UserDisplay";
import ContextMenu from "../../components/ContextMenu";
import ConfirmModal from "../../components/ConfirmModal";
import TemplateDisplay from "./TemplateDisplay";
import AddUserModal from "./AddUserModal";
import { ErrorMessageContext } from "./WorkspacesScreen";

export const WorkspaceContext = createContext<Workspace | null>(null);

interface WorkspaceDisplayProps {
  workspace: Workspace;
  useACL?: boolean;
}

export default function WorkspaceDisplay({
  workspace,
  useACL = false,
}: WorkspaceDisplayProps) {
  const errorHandler = useContext(ErrorMessageContext);

  const [loading, setLoading] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [openAddUserModal, setOpenAddUserModal] = useState(false);
  const [openAddTemplate, setOpenAddTemplate] = useState(false);
  const groups = useGlobalStore((state) => state.permission.groups);
  const users = useGlobalStore((state) => state.user.users);
  const fetchUser = useGlobalStore((state) => state.user.fetchUser);
  const workspaces = useGlobalStore((state) => state.workspace.workspaces);
  const templates = useGlobalStore((state) => state.template.templates);
  const fetchTemplate = useGlobalStore((state) => state.template.fetchTemplate);
  const fetchWorkspace = useGlobalStore(
    (state) => state.workspace.fetchWorkspace
  );
  const [unassignedTemplates, setUnassignedTemplates] = useState<Template[]>(
    []
  );
  const [unassignedUsers, setUnassignedUsers] = useState<User[]>([]);

  const acl = useGlobalStore((state) => state.session.acl);
  const fetchList = useGlobalStore((state) => state.workspace.fetchList);

  // find templates that are not yet assigned to a workspace
  // and filter out template-drafts
  useEffect(() => {
    setUnassignedTemplates(
      Object.values(templates)
        .sort((a, b) =>
          a.name && b.name && a.name.toLowerCase() > b.name.toLowerCase()
            ? 1
            : -1
        )
        .filter(
          (template) =>
            template.id !== undefined &&
            !Object.values(workspaces)
              .map((ws) => ws.templates ?? [])
              .reduce((prev, current) => prev.concat(current), [])
              .includes(template.id)
        )
        .filter((template) => template.status === "ok")
    );
  }, [templates, workspaces]);
  // find users that are not yet assigned to this workspace
  useEffect(() => {
    setUnassignedUsers(
      Object.values(users)
        .sort((a, b) =>
          a.firstname &&
          a.lastname &&
          b.firstname &&
          b.lastname &&
          a.firstname.toLowerCase() + a.lastname.toLocaleLowerCase() >
            b.firstname.toLowerCase() + b.lastname.toLocaleLowerCase()
            ? 1
            : -1
        )
        .filter((user) => !(workspace.users ?? []).includes(user.id))
    );
  }, [users, workspace]);

  /**
   * Updates template via API and reloads corresponding template and
   * workspace after a response has been received. Does not provide
   * HTTP-status-code handling.
   * @param template updated template data
   */
  function putTemplate(template: Template) {
    if (useACL && !acl?.MODIFY_TEMPLATE) return;
    fetch(host + "/api/admin/template", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: credentialsValue,
      body: JSON.stringify(template),
    })
      .then((response) => {
        setLoading(false);
        if (!response.ok) {
          response.text().then((text) =>
            errorHandler?.pushMessage({
              id: `put-template-${template.id}`,
              text: `${t(
                `Aktualisierung des Arbeitsbereichs '${
                  workspace.name ?? workspace.id
                }' nicht erfolgreich`
              )}: ${text}`,
            })
          );
          return;
        }
        fetchWorkspace({ workspaceId: workspace.id });
        if (template.id) fetchTemplate({ templateId: template.id });
      })
      .catch((error) => {
        setLoading(false);
        errorHandler?.pushMessage({
          id: `put-template-${template.id}`,
          text: `${t(
            `Fehler bei der Aktualisierung des Arbeitsbereichs '${
              workspace.name ?? workspace.id
            }'`
          )}: ${error.message}`,
        });
      });
  }

  /**
   * Updates user via API and reloads corresponding user and
   * workspace after a response has been received. Does not provide
   * HTTP-status-code handling.
   * @param user updated user data
   */
  function putUser(user: User) {
    if (useACL && !acl?.MODIFY_USERCONFIG) return;
    fetch(host + "/api/admin/user", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: credentialsValue,
      body: JSON.stringify(user),
    })
      .then((response) => {
        setLoading(false);
        if (!response.ok) {
          response.text().then((text) =>
            errorHandler?.pushMessage({
              id: `put-user-${user.id}`,
              text: `${t(
                `Aktualisierung des Arbeitsbereichs '${
                  workspace.name ?? workspace.id
                }' nicht erfolgreich`
              )}: ${text}`,
            })
          );
          return;
        }
        fetchWorkspace({ workspaceId: workspace.id });
        fetchUser({ userId: user.id });
      })
      .catch((error) => {
        setLoading(false);
        errorHandler?.pushMessage({
          id: `put-user-${user.id}`,
          text: `${t(
            `Fehler bei der Aktualisierung des Arbeitsbereichs '${
              workspace.name ?? workspace.id
            }'`
          )}: ${error.message}`,
        });
      });
  }

  return (
    <WorkspaceContext.Provider value={workspace}>
      <AddUserModal
        show={openAddUserModal}
        onClose={() => setOpenAddUserModal(false)}
        users={unassignedUsers}
      />
      <div onClick={() => setOpenAddTemplate(false)}>
        <Card>
          <div className="flex flex-row justify-between">
            <h3 className="font-bold text-lg dcm-clamp-text">
              {workspace.name}
              {loading && <Spinner className="mx-2" size="xs" />}
            </h3>
            <ContextMenu
              items={[
                { children: t("Umbenennen"), onClick: () => alert("tbd") },
                {
                  children: (
                    <div className="flex flex-row space-x-2 items-center">
                      {loadingDelete && <Spinner size="sm" />}
                      <span>{t("Löschen")}</span>
                    </div>
                  ),
                  onClick: loadingDelete
                    ? undefined
                    : () => {
                        setLoadingDelete(true);
                        setShowConfirmDeleteModal(true);
                      },
                },
              ]}
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-full border border-gray-200 hover:cursor-pointer hover:bg-gray-100">
                <FiMoreHorizontal size="18" />
              </div>
            </ContextMenu>
            <ConfirmModal
              show={showConfirmDeleteModal}
              title={t("Arbeitsbereich löschen")}
              confirmText={t("Arbeitsbereich löschen")}
              onConfirm={() => {
                setShowConfirmDeleteModal(false);
                fetch(
                  host +
                    "/api/admin/workspace?" +
                    new URLSearchParams({
                      id: workspace.id ?? "",
                    }).toString(),
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
                {t(
                  `Wollen Sie den Arbeitsbereich '${workspace.name}' unwiderruflich löschen?`
                )}
                {((workspace.templates ?? []).length > 0 ||
                  (workspace.users ?? []).length > 0) &&
                  t(
                    " Zugewiesene Nutzer verlieren dadurch den Zugriff auf Templates und damit erstellte Jobs in diesem Arbeitsbereich."
                  )}
              </span>
            </ConfirmModal>
          </div>
          <h5 className="font-semibold">{t("Templates")}</h5>
          <div className="p-2 my-2 grid grid-cols-2 gap-4 overflow-y-auto max-h-64">
            {(
              workspace.templates?.filter(
                (template) => templates[template]?.status === "ok"
              ) ?? []
            ).map((template) => (
              <div
                key={template}
                className="flex items-start p-2 rounded-lg border border-gray-200 bg-white shadow-md select-none"
              >
                <TemplateDisplay
                  template={templates[template]}
                  onTrash={(e) => {
                    e.stopPropagation();
                    if (loading || !workspace.templates?.includes(template))
                      return;
                    setLoading(true);
                    delete templates[template].workspaceId;
                    putTemplate(templates[template]);
                  }}
                />
              </div>
            ))}
            {(useACL && !acl?.MODIFY_TEMPLATE) ||
            unassignedTemplates.length === 0 ? null : (
              <Popover
                open={openAddTemplate}
                placement="top"
                content={
                  <div className="w-80 bg-white select-none">
                    <h3
                      id="default-popover"
                      className="font-semibold bg-gray-100 px-2 py-3"
                    >
                      Template hinzufügen
                    </h3>
                    {unassignedTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="hover:bg-gray-100 hover:cursor-pointer dcm-clamp-text"
                      >
                        <TemplateDisplay
                          template={template}
                          onClick={() => {
                            setOpenAddTemplate(false);
                            if (
                              loading ||
                              template.id === undefined ||
                              workspace.templates?.includes(template.id)
                            )
                              return;
                            setLoading(true);
                            putTemplate({
                              ...template,
                              workspaceId: workspace.id,
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                }
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onOpenChange={setOpenAddTemplate}
              >
                <div>
                  <Card
                    className="flex justify-center items-center bg-white hover:bg-gray-100 transition duration-200 ease-in-out hover:cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenAddTemplate(true);
                    }}
                  >
                    <span className="font-bold text-5xl select-none">+</span>
                  </Card>
                </div>
              </Popover>
            )}
          </div>
          <hr className="h-px my-4 bg-gray-400 border-0" />
          <h5 className="font-semibold">{t("Nutzer")}</h5>
          <div className="p-2 my-2 grid grid-cols-2 gap-4 overflow-y-auto max-h-64">
            {(workspace.users ?? [])
              .sort((a, b) => (users[a]?.id > users[b]?.id ? 1 : -1))
              .map((user) => (
                <div
                  key={user}
                  className="flex flex-col items-start p-1 rounded-lg border border-gray-200 bg-white shadow-md select-none"
                >
                  <UserDisplay
                    className="w-full"
                    userInfo={users[user]}
                    badges={(users[user]?.groups ?? [])
                      .filter((group) => group.workspace === undefined)
                      .map((group) => ({
                        title:
                          groups?.find((g) => g.id === group.id)?.name ?? "?",
                      }))}
                    icon={
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (loading || !workspace.users?.includes(user))
                            return;
                          setLoading(true);
                          putUser({
                            ...users[user],
                            groups: users[user].groups?.filter(
                              (group) => group.workspace !== workspace.id
                            ),
                          });
                        }}
                        className="right-0 top-0 absolute p-1 rounded-full text-gray-500 hover:text-black hover:bg-gray-200 hover:cursor-pointer"
                      >
                        <FiTrash2 size="20" />
                      </div>
                    }
                  />
                  <Select
                    className="p-2 w-64"
                    id={users[user]?.id + workspace.id + "-group-select"}
                    value={
                      users[user]?.groups?.find(
                        (group) => group.workspace === workspace.id
                      )?.id
                    }
                    onChange={(e) =>
                      putUser({
                        ...users[user],
                        groups: [
                          ...(users[user].groups ?? []).filter(
                            (group) => group.workspace !== workspace.id
                          ),
                          {
                            id: e.target.value,
                            workspace: workspace.id,
                          },
                        ],
                      })
                    }
                  >
                    {(groups ?? [])
                      .filter((group) => group.workspaces)
                      .map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                  </Select>
                </div>
              ))}
            {(useACL && !acl?.MODIFY_USERCONFIG) ||
            unassignedUsers.length === 0 ? null : (
              <div>
                <Card
                  className="flex justify-center items-center bg-white hover:bg-gray-100 transition duration-200 ease-in-out hover:cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenAddTemplate(false);
                    setOpenAddUserModal(true);
                  }}
                >
                  <span className="font-bold text-5xl select-none">+</span>
                </Card>
              </div>
            )}
          </div>
        </Card>
      </div>
    </WorkspaceContext.Provider>
  );
}
