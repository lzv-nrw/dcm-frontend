import { useEffect, useRef, useState } from "react";
import { Alert, Button } from "flowbite-react";
import md5 from "md5";

import t from "../../utils/translation";
import { User } from "../../types";
import ConfirmModal from "../../components/ConfirmModal";
import PasswordInput from "../../components/PasswordInput";

export interface ActivationInfo {
  secret: string;
  requiresActivation: boolean;
}

interface ActivationInfoModalProps {
  mode: "reset" | "new";
  info: ActivationInfo;
  user: User;
  show: boolean;
  title?: string;
  onConfirm: () => void;
}

export default function ActivationInfoModal({
  mode,
  info,
  user,
  show,
  title,
  onConfirm,
}: ActivationInfoModalProps) {
  const [copied, setCopied] = useState(false);
  const secretRef = useRef<HTMLInputElement>(null);

  // reset modal state
  useEffect(() => {
    setCopied(false);
  }, [info]);

  return (
    <ConfirmModal
      show={show}
      title={title}
      onConfirm={onConfirm}
      confirmText={t("Schließen")}
    >
      <p>
        {mode === "reset"
          ? t(
              `Das Passwort${
                info.requiresActivation ? " sowie der Aktivierungsstatus" : ""
              }${user?.username ? " für Nutzer '" + user.username + "'" : ""} ${
                info.requiresActivation ? "wurden" : "wurde"
              } zurückgesetzt.`
            )
          : t(`Das Nutzerkonto '${user.username}' wurde erfolgreich angelegt.`)}
      </p>
      <p>
        {info.requiresActivation
          ? t(
              "Übermitteln Sie dem entsprechenden Nutzer nun die folgende URL zur Aktivierung des Kontos:"
            )
          : t(
              "Übermitteln Sie dem entsprechenden Nutzer nun das folgende Passwort:"
            )}
      </p>
      <div className="w-full flex flex-col items-center my-5">
        <div className="flex flex-row space-x-1 w-3/4">
          <div className="relative w-3/4">
            <PasswordInput
              ref={secretRef}
              readOnly
              value={
                info.requiresActivation
                  ? window.location.origin +
                    "/activate?" +
                    new URLSearchParams({
                      user: user.username ?? "unknown",
                      pwd: md5(info.secret).toString(),
                    }).toString()
                  : info.secret
              }
            />
          </div>
          <Button
            onClick={() =>
              navigator.clipboard
                .writeText(secretRef.current?.value ?? "")
                .then(() => setCopied(true))
            }
          >
            {copied ? t("Kopiert!") : t("Kopieren")}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Alert color="info">
          {t(
            "Bitte beachten Sie, dass die obige Information nach dem Schließen dieses Fensters nicht erneut angezeigt werden kann."
          )}
        </Alert>
        {user.username === undefined && info.requiresActivation && (
          <Alert color="failure">
            {t(
              "Es konnte kein Nutzername gelesen werden, die URL zur Aktivierung ist wahrscheinlich ungültig."
            )}
          </Alert>
        )}
      </div>
    </ConfirmModal>
  );
}
