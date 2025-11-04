import { useState, useEffect, createContext } from "react";
import { Button, Alert } from "flowbite-react";
import { Navigate } from "react-router";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import MessageBox, {
  MessageHandler,
  useMessageHandler,
} from "../../components/MessageBox";
import CUModal from "./CUModal";
import WorkspaceDisplay from "./WorkspaceDisplay";
import { genericSort } from "../../utils/genericSort";

export const ErrorMessageContext = createContext<MessageHandler | undefined>(
  undefined
);

interface WorkspacesScreenProps {
  useACL?: boolean;
}

export default function WorkspacesScreen({
  useACL = false,
}: WorkspacesScreenProps) {
  const errorMessageHandler = useMessageHandler([]);

  const [showCUModal, setShowCUModal] = useState(false);
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
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: "fetch-user-groups",
            text: msg,
          }),
      }),
    // eslint-disable-next-line
    [useACL]
  );
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
  // * fetch all templateIds on first load
  useEffect(
    () =>
      templateStore.fetchList({
        useACL: useACL,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: "fetch-template-config-list",
            text: msg,
          }),
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
          errorMessageHandler.pushMessage({
            id: `fetch-template-config-${templateId}`,
            text: msg,
          }),
      });
    }
    // eslint-disable-next-line
  }, [templateStore.templateIds]);
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
  // * fetch all hotfolders on first load
  useEffect(
    () =>
      templateStore.fetchHotfolders({
        useACL: useACL,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: "fetch-hotfolders",
            text: msg,
          }),
      }),
    // eslint-disable-next-line
    [useACL]
  );
  // * fetch all archive configurations on first load
  useEffect(
    () =>
      templateStore.fetchArchives({
        useACL: useACL,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: "fetch-archives",
            text: msg,
          }),
      }),
    // eslint-disable-next-line
    [useACL]
  );
  // end run store-logic

  return useACL && !acl?.VIEW_SCREEN_WORKSPACES ? (
    <Navigate to="/" replace />
  ) : (
    <ErrorMessageContext.Provider value={errorMessageHandler}>
      <div className="mx-20 mt-4">
        <div className="flex justify-between items-center relative w-full mb-5">
          <h1 className="text-4xl font-bold">{t("Arbeitsbereiche")}</h1>
          {useACL && !acl?.CREATE_WORKSPACE ? null : (
            <Button onClick={() => setShowCUModal(true)}>
              {t("Arbeitsbereich erstellen")}
            </Button>
          )}
          <CUModal show={showCUModal} onClose={() => setShowCUModal(false)} />
        </div>
        <MessageBox
          messages={errorMessageHandler.messages}
          messageTitle={t("Ein Fehler ist aufgetreten:")}
          onDismiss={errorMessageHandler.clearMessages}
        />
        {useACL && !acl?.READ_WORKSPACE ? (
          <Alert className="my-2" color="warning">
            {t("Kein Lese-Zugriff auf Arbeitsbereichkonfigurationen.")}
          </Alert>
        ) : (
          <div className="relative grid grid-cols-2 py-4 gap-5">
            {Object.values(workspaceStore.workspaces)
              .sort(genericSort({ field: "name" }))
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
    </ErrorMessageContext.Provider>
  );
}
