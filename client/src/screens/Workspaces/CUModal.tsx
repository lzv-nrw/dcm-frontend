import { useEffect, useState } from "react";
import { Label, TextInput, Button, Spinner } from "flowbite-react";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import { textInputLimit, getTextInputColor } from "../../utils/forms";
import MessageBox, { useMessageHandler } from "../../components/MessageBox";
import { host, credentialsValue } from "../../App";
import Modal from "../../components/Modal";
import { Workspace } from "../../types";

interface CUModalProps {
  show: boolean;
  workspace?: Workspace;
  onClose?: () => void;
}

export default function CUModal({ show, workspace, onClose }: CUModalProps) {
  const errorMessageHandler = useMessageHandler([]);
  const [name, setName] = useState("");
  const [nameOk, setNameOk] = useState<boolean | null>(null);
  const [sending, setSending] = useState<boolean>(true);
  const fetchWorkspaceIds = useGlobalStore(
    (state) => state.workspace.fetchList
  );

  // reset form on show/hide
  useEffect(() => {
    setName(workspace?.name ?? "");
    setNameOk(workspace?.name ? true : null);
    errorMessageHandler.clearMessages();
    setSending(false);
    // eslint-disable-next-line
  }, [show, workspace, setName, setNameOk, setSending]);

  return (
    <Modal show={show} width="xl" height="xs" onClose={onClose} dismissible>
      <Modal.Header
        title={
          t("Arbeitsbereich ") +
          (workspace?.id === undefined ? t("erstellen") : t("umbenennen"))
        }
      />
      <Modal.Body>
        <MessageBox
          className="my-1"
          messages={errorMessageHandler.messages}
          messageTitle={t("Ein Fehler ist aufgetreten:")}
          onDismiss={errorMessageHandler.clearMessages}
        />
        <div className="space-y-2 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" value={t("Titel*")} />
            <TextInput
              id="name"
              value={name}
              color={getTextInputColor({ ok: nameOk })}
              maxLength={textInputLimit.md}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setNameOk(null)}
              onBlur={(e) => {
                setNameOk(e.target?.value.trim() !== "");
                setName(e.target?.value.trim());
              }}
            />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="w-full flex flex-row space-x-2 justify-end">
          <Button onClick={onClose}>{t("Abbrechen")}</Button>
          <Button
            onClick={() => {
              errorMessageHandler.clearMessages();
              if (!nameOk) {
                setNameOk(false);
                errorMessageHandler.pushMessage({
                  id: "bad-form-generic",
                  text: t("Bitte füllen Sie alle erforderlichen Felder aus."),
                });
                return;
              }
              setSending(true);
              errorMessageHandler.removeMessage(
                "submit-workspace-config-bad-response"
              );
              errorMessageHandler.removeMessage(
                "submit-workspace-config-error"
              );
              fetch(host + "/api/admin/workspace", {
                method: workspace?.id === undefined ? "POST" : "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: credentialsValue,
                body: JSON.stringify({
                  ...(workspace?.id && { id: workspace.id }),
                  name,
                }),
              })
                .then((response) => {
                  setSending(false);
                  if (!response.ok) {
                    response.text().then((text) =>
                      errorMessageHandler?.pushMessage({
                        id: `submit-workspace-config-bad-response`,
                        text: `${t(
                          "Absenden der Konfiguration nicht erfolgreich"
                        )}: ${text}`,
                      })
                    );
                    return;
                  }
                  fetchWorkspaceIds({});
                  onClose?.();
                })
                .catch((error) => {
                  setSending(false);
                  console.error(error);
                  errorMessageHandler?.pushMessage({
                    id: `submit-workspace-config-error`,
                    text: `${t("Fehler beim Absenden der Konfiguration")}: ${
                      error.message
                    }`,
                  });
                });
            }}
          >
            {sending ? (
              <Spinner size="sm" />
            ) : workspace?.id === undefined ? (
              t("Erstellen")
            ) : (
              t("Speichern")
            )}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
