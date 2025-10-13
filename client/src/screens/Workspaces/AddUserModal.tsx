import { useContext, useEffect, useState } from "react";
import {
  Button,
  ListGroup,
  ListGroupItem,
  Select,
  Spinner,
} from "flowbite-react";

import t from "../../utils/translation";
import { User } from "../../types";
import useGlobalStore from "../../store";
import { host, credentialsValue } from "../../App";
import UserDisplay from "../../components/UserDisplay";
import Modal from "../../components/Modal";
import MessageBox, { useMessageHandler } from "../../components/MessageBox";
import { WorkspaceContext } from "./WorkspaceDisplay";

interface AddUserModalProps {
  show: boolean;
  users: User[];
  onClose?: () => void;
}

export default function AddUserModal({
  show,
  onClose,
  users,
}: AddUserModalProps) {
  const workspace = useContext(WorkspaceContext);
  const [userSelection, setUserSelection] = useState<User | null>(null);

  const errorMessageHandler = useMessageHandler([]);

  const [sending, setSending] = useState<boolean>(true);
  const groups = useGlobalStore((state) => state.permission.groups);
  const fetchWorkspace = useGlobalStore(
    (state) => state.workspace.fetchWorkspace
  );

  // reset form on show/hide
  useEffect(() => {
    setUserSelection(null);
    errorMessageHandler.clearMessages();
    setSending(false);
    // eslint-disable-next-line
  }, [show, users, setSending]);

  return (
    <Modal show={show} width="2xl" height="md" onClose={onClose} dismissible>
      <Modal.Header title={t("Nutzer hinzufügen")} />
      <Modal.Body>
        <MessageBox
          className="my-1"
          messages={errorMessageHandler.messages}
          messageTitle={t("Ein Fehler ist aufgetreten:")}
          onDismiss={errorMessageHandler.clearMessages}
        />
        <div className="p-2">
          <ListGroup>
            {Object.values(users)
              .filter((user) => user.status !== "deleted")
              .map((user) => (
                <ListGroupItem
                  theme={{
                    link: {
                      active: {
                        // fix default style which creates high-contrast background
                        on: "outline-none ring-2 ring-cyan-700 bg-gray-100 text-cyan-700",
                      },
                    },
                  }}
                  key={user.id}
                  active={
                    userSelection !== null && user.id === userSelection.id
                  }
                  onClick={() => setUserSelection(user)}
                >
                  <div className="flex flex-col w-full space-y-2">
                    <UserDisplay userInfo={user} />
                    <Select id={user.id + "-group-select"}>
                      {(groups ?? [])
                        .filter((group) => group.workspaces)
                        .map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                    </Select>
                  </div>
                </ListGroupItem>
              ))}
          </ListGroup>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="w-full flex flex-row space-x-2 justify-end">
          <Button onClick={onClose}>{t("Abbrechen")}</Button>
          <Button
            disabled={userSelection === null}
            onClick={() => {
              if (userSelection === null || workspace === null) return;
              setSending(true);
              errorMessageHandler?.removeMessage(
                "add-user-to-workspace-bad-response"
              );
              errorMessageHandler?.removeMessage("add-user-to-workspace-error");
              fetch(host + "/api/admin/user", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: credentialsValue,
                body: JSON.stringify({
                  ...userSelection,
                  groups: [
                    ...(userSelection.groups ?? []).filter(
                      (group) => group.workspace !== workspace.id
                    ),
                    {
                      id: (
                        document.getElementById(
                          userSelection.id + "-group-select"
                        ) as HTMLSelectElement
                      )?.value,
                      workspace: workspace.id,
                    },
                  ],
                }),
              })
                .then((response) => {
                  setSending(false);
                  if (!response.ok) {
                    response.text().then((text) =>
                      errorMessageHandler?.pushMessage({
                        id: `add-user-to-workspace-bad-response`,
                        text: `${t(
                          "Hinzufügen eines Nutzers fehlgeschlagen"
                        )}: ${text}`,
                      })
                    );
                    return;
                  }
                  fetchWorkspace({ workspaceId: workspace.id });
                  onClose?.();
                })
                .catch((error) => {
                  console.error(error);
                  errorMessageHandler?.pushMessage({
                    id: `add-user-to-workspace-error`,
                    text: `${t("Hinzufügen eines Nutzers fehlgeschlagen")}: ${
                      error.message
                    }`,
                  });
                });
            }}
          >
            {sending ? <Spinner size="sm" /> : t("Hinzufügen")}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
