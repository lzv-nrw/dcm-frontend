import { useEffect, useRef, useState } from "react";
import { Label, TextInput, Button, Spinner } from "flowbite-react";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import { textInputLimit } from "../../utils/forms";
import MessageBox, { useMessageHandler } from "../../components/MessageBox";
import { host, credentialsValue } from "../../App";
import Modal from "../../components/Modal";

interface NewWorkspaceModalProps {
  show: boolean;
  onClose?: () => void;
}

export default function NewWorkspaceModal({
  show,
  onClose,
}: NewWorkspaceModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const errorMessageHandler = useMessageHandler([]);

  const [nameOk, setNameOk] = useState<boolean | null>(null);
  const [sending, setSending] = useState<boolean>(true);
  const fetchWorkspaceIds = useGlobalStore(
    (state) => state.workspace.fetchList
  );

  // reset form on show/hide
  useEffect(() => {
    setNameOk(null);
    errorMessageHandler.clearMessages();
    setSending(false);
    // eslint-disable-next-line
  }, [show, setNameOk, setSending]);

  /**
   * Returns a Flowbite input color based on status.
   *
   * @param ok - whether input status is ok
   * @returns Either `undefined` (input `null`) or a Flowbite input-color.
   */
  function getTextInputColor(
    ok: boolean | null
  ): undefined | "success" | "failure" {
    if (ok === null) return;
    if (ok) return "success";
    else return "failure";
  }

  return (
    <Modal show={show} width="5xl" height="md" onClose={onClose} dismissible>
      <Modal.Header title={t("Arbeitsbereich erstellen")} />
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
              ref={nameRef}
              color={getTextInputColor(nameOk)}
              maxLength={textInputLimit.md}
              onFocus={() => {
                setNameOk(null);
              }}
              onBlur={(e) => {
                setNameOk(e.target?.value !== "");
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
              let valid = true;
              errorMessageHandler.clearMessages();
              [{ ok: nameOk, setOk: setNameOk }].forEach(({ ok, setOk }) => {
                if (!ok) {
                  setOk?.(false);
                  valid = false;
                  errorMessageHandler.pushMessage({
                    id: "bad-form-generic",
                    text: t("Bitte füllen Sie alle erforderlichen Felder aus."),
                  });
                }
              });
              if (!valid) return;
              setSending(true);
              errorMessageHandler.removeMessage(
                "submit-workspace-config-bad-response"
              );
              errorMessageHandler.removeMessage(
                "submit-workspace-config-error"
              );
              fetch(host + "/api/admin/workspace", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: credentialsValue,
                body: JSON.stringify({
                  name: nameRef.current?.value,
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
            {sending ? <Spinner size="sm" /> : t("Erstellen")}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
