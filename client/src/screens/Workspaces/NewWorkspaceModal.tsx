import { useEffect, useRef, useState } from "react";
import {
  Label,
  TextInput,
  Alert,
  Button,
  Spinner,
} from "flowbite-react";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import { textInputLimit } from "../../utils/forms";
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
  const [nameOk, setNameOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(true);
  const fetchWorkspaceIds = useGlobalStore(
    (state) => state.workspace.fetchList
  );

  // reset form on show/hide
  useEffect(() => {
    setNameOk(null);
    setError(null);
    setSending(false);
  }, [show, setNameOk, setError, setSending]);

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
    <Modal show={show} size="sm" onClose={onClose} dismissible={true}>
      <Modal.Header>{t("Arbeitsbereich erstellen")}</Modal.Header>
      <Modal.Body>
        <div className="space-y-2">
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
          {error ? <Alert color="failure">{error}</Alert> : null}
          <div className="pt-2 flex flex-row space-x-2 justify-end">
            <Button onClick={onClose}>{t("Abbrechen")}</Button>
            <Button
              onClick={() => {
                let valid = true;
                [{ ok: nameOk, setOk: setNameOk }].forEach(({ ok, setOk }) => {
                  if (!ok) {
                    setOk?.(false);
                    valid = false;
                    setError(
                      t("Bitte füllen Sie alle erforderlichen Felder aus.")
                    );
                  }
                });
                if (!valid) return;

                setError(null);
                setSending(true);
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
                    if (response.ok) {
                      fetchWorkspaceIds({});
                      onClose?.();
                      return;
                    }
                    return response.text();
                  })
                  .then((error_text) =>
                    setError(t("Unerwartete Antwort") + ": " + error_text)
                  )
                  .catch((error) => {
                    setSending(false);
                    console.error(error);
                    setError(
                      t("Fehler beim Senden") + ": " + error?.toString()
                    );
                  });
              }}
            >
              {sending ? <Spinner size="sm" /> : t("Erstellen")}
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}
