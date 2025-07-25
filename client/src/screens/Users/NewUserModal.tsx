import { useEffect, useRef, useState } from "react";
import {
  Label,
  TextInput,
  Alert,
  Button,
  Spinner,
} from "flowbite-react";

import t from "../../utils/translation";
import { GroupMembership } from "../../types";
import { getTextInputColor, textInputLimit } from "../../utils/forms";
import useGlobalStore from "../../store";
import { host, credentialsValue } from "../../App";
import Modal from "../../components/Modal";
import GroupMembershipInput from "./GroupMembershipInput";

interface NewUserModalProps {
  show: boolean;
  onClose?: () => void;
}

export default function NewUserModal({ show, onClose }: NewUserModalProps) {
  const userIdRef = useRef<HTMLInputElement>(null);
  const [userIdOk, setUserIdOk] = useState<boolean | null>(null);
  const firstnameRef = useRef<HTMLInputElement>(null);
  const [firstnameOk, setFirstnameOk] = useState<boolean | null>(null);
  const lastnameRef = useRef<HTMLInputElement>(null);
  const [lastnameOk, setLastnameOk] = useState<boolean | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [emailOk, setEmailOk] = useState<boolean | null>(null);
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(true);
  const fetchUserList = useGlobalStore((state) => state.user.fetchList);
  const workspaces = useGlobalStore((state) => state.workspace.workspaces);
  const groups = useGlobalStore((state) => state.permission.groups);

  // reset form on show/hide
  useEffect(() => {
    setUserIdOk(null);
    setFirstnameOk(null);
    setLastnameOk(null);
    setEmailOk(null);
    setError(null);
    setSending(false);
  }, [
    show,
    setUserIdOk,
    setFirstnameOk,
    setLastnameOk,
    setEmailOk,
    setError,
    setSending,
  ]);

  return (
    <Modal show={show} onClose={onClose} dismissible={true}>
      <Modal.Header>{t("Neuen Nutzer anlegen")}</Modal.Header>
      <Modal.Body>
        <div className="space-y-2">
          <div className="space-y-2">
            <Label htmlFor="userId" value={t("Benutzername*")} />
            <TextInput
              id="userId"
              ref={userIdRef}
              color={getTextInputColor({ ok: userIdOk })}
              maxLength={textInputLimit.sm}
              onFocus={() => {
                setUserIdOk(null);
              }}
              onBlur={(e) => {
                setUserIdOk(e.target?.value.trim() !== "");
              }}
            />
          </div>
          <div className="flex flex-row space-x-4">
            <div className="space-y-2 grow">
              <Label htmlFor="firstname" value={t("Vorname*")} />
              <TextInput
                id="firstname"
                ref={firstnameRef}
                color={getTextInputColor({ ok: firstnameOk })}
                maxLength={textInputLimit.sm}
                onFocus={() => {
                  setFirstnameOk(null);
                }}
                onBlur={(e) => {
                  setFirstnameOk(e.target?.value.trim() !== "");
                }}
              />
            </div>
            <div className="space-y-2 grow">
              <Label htmlFor="lastname" value={t("Nachname*")} />
              <TextInput
                id="lastname"
                ref={lastnameRef}
                color={getTextInputColor({ ok: lastnameOk })}
                maxLength={textInputLimit.sm}
                onFocus={() => {
                  setLastnameOk(null);
                }}
                onBlur={(e) => {
                  setLastnameOk(e.target?.value.trim() !== "");
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="userEmail" value={t("E-Mail*")} />
            <TextInput
              id="userEmail"
              ref={emailRef}
              color={getTextInputColor({ ok: emailOk })}
              maxLength={textInputLimit.md}
              onFocus={() => {
                setEmailOk(null);
              }}
              onBlur={(e) => {
                setEmailOk(e.target?.value.trim() !== "");
              }}
            />
          </div>
          <div className="space-y-2">
            <Label value={t("Rollen")} />
            <GroupMembershipInput
              groups={groups ?? []}
              workspaces={Object.values(workspaces)}
              onChange={setMemberships}
            />
          </div>
          {error ? <Alert color="failure">{error}</Alert> : null}
          <div className="pt-2 flex flex-row space-x-2 justify-end">
            <Button onClick={onClose}>{t("Abbrechen")}</Button>
            <Button
              onClick={() => {
                let valid = true;
                [
                  { ok: userIdOk, setOk: setUserIdOk },
                  { ok: firstnameOk, setOk: setFirstnameOk },
                  { ok: lastnameOk, setOk: setLastnameOk },
                  { ok: emailOk, setOk: setEmailOk },
                ].forEach(({ ok, setOk }) => {
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
                fetch(host + "/api/admin/user", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  credentials: credentialsValue,
                  body: JSON.stringify({
                    username: userIdRef.current?.value,
                    firstname: firstnameRef.current?.value,
                    lastname: lastnameRef.current?.value,
                    email: emailRef.current?.value,
                    groups: memberships,
                  }),
                })
                  .then((response) => {
                    setSending(false);
                    if (response.ok) {
                      fetchUserList({});
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
              {sending ? <Spinner size="sm" /> : t("Anlegen")}
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}
