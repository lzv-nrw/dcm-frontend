import { useState, useEffect } from "react";
import { Button, Alert } from "flowbite-react";
import { Navigate } from "react-router";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import NewWorkspaceModal from "./NewWorkspaceModal";
import WorkspaceDisplay from "./WorkspaceDisplay";

interface WorkspacesScreenProps {
  useACL?: boolean;
}

export default function WorkspacesScreen({
  useACL = false,
}: WorkspacesScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const fetchGroups = useGlobalStore((state) => state.permission.fetchGroups);
  const workspaceStore = useGlobalStore((state) => state.workspace);
  const templateStore = useGlobalStore((state) => state.template);
  const userStore = useGlobalStore((state) => state.user);

  const acl = useGlobalStore((state) => state.session.acl);

  // run store-logic
  // * fetch existing user groups
  useEffect(
    () =>
      fetchGroups({
        useACL: useACL,
        onFail: (msg) => setError(`Unable to list user ids: ${msg}`),
      }),
    // eslint-disable-next-line
    [useACL]
  );
  // * fetch all workspaceIds on first load
  useEffect(
    () =>
      workspaceStore.fetchList({
        useACL: useACL,
        onFail: (msg) => setError(`Unable to list workspace ids: ${msg}`),
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
          setError(
            `Unable to load workspace configuration (${workspaceId}): ${msg}`
          ),
      });
    }
    // eslint-disable-next-line
  }, [workspaceStore.workspaceIds]);
  // * fetch all templateIds on first load
  useEffect(
    () =>
      templateStore.fetchList({
        useACL: useACL,
        onFail: (msg) => setError(`Unable to list template ids: ${msg}`),
      }),
    // eslint-disable-next-line
    [useACL]
  );
  // * fetch Templates if templateIds changed
  useEffect(() => {
    for (const templateId of templateStore.templateIds) {
      templateStore.fetchTemplate({
        templateId,
        onFail: (msg) =>
          setError(
            `Unable to load template configuration (${templateId}): ${msg}`
          ),
      });
    }
    // eslint-disable-next-line
  }, [templateStore.templateIds]);
  // * fetch all userIds on first load
  useEffect(
    () =>
      userStore.fetchList({
        useACL: useACL,
        onFail: (msg) => setError(`Unable to list user ids: ${msg}`),
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
          setError(`Unable to load user configuration (${userId}): ${msg}`),
      });
    }
    // eslint-disable-next-line
  }, [userStore.userIds]);
  // end run store-logic

  return useACL && !acl?.VIEW_SCREEN_WORKSPACES ? (
    <Navigate to="/" replace />
  ) : (
    <div className="mx-20 mt-4">
      <div className="flex justify-between items-center relative w-full mb-10">
        <h1 className="text-4xl font-bold">{t("Arbeitsbereiche")}</h1>
        {useACL && !acl?.CREATE_WORKSPACE ? null : (
          <Button onClick={() => setShowNewWorkspaceModal(true)}>
            {t("Arbeitsbereich erstellen")}
          </Button>
        )}
        <NewWorkspaceModal
          show={showNewWorkspaceModal}
          onClose={() => setShowNewWorkspaceModal(false)}
        />
      </div>
      {error ? (
        <Alert color="failure" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {useACL && !acl?.READ_WORKSPACE ? (
        <Alert className="my-2" color="warning">
          {t("Kein Lese-Zugriff auf Arbeitsbereichkonfigurationen.")}
        </Alert>
      ) : (
        <div className="relative grid grid-cols-2 gap-10">
          {Object.values(workspaceStore.workspaces)
            .sort((a, b) => (a.name > b.name ? 1 : -1))
            .map((workspace) => (
              <WorkspaceDisplay
                key={workspace.id}
                workspace={workspace}
                useACL={useACL}
              />
            ))}
        </div>
      )}
    </div>
  );
}
