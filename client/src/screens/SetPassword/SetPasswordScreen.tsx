import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router";
import { Label, TextInput, Button, Alert, Spinner } from "flowbite-react";
import md5 from "md5";

import t from "../../utils/translation";
import { getTextInputColor, textInputLimit } from "../../utils/forms";
import { credentialsValue, host } from "../../App";
import useGlobalStore from "../../store";
import PasswordInput from "../../components/PasswordInput";

interface SetPasswordScreenProps {
  mode: "activate" | "update";
  onPasswordSet?: () => void;
}

export default function SetPasswordScreen({
  mode,
  onPasswordSet,
}: SetPasswordScreenProps) {
  const me = useGlobalStore((state) => state.session.me);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isActivateMode = mode === "activate";
  const pwd = queryParams.get("pwd");
  const user = queryParams.get("user");

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [passwordOk, setPasswordOk] = useState<boolean | null>(null);

  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [newPasswordsOk, setNewPasswordsOk] = useState<boolean | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(false);

  useEffect(() => {
    if (user && pwd && usernameRef.current && passwordRef.current) {
      passwordRef.current.value = pwd;
      usernameRef.current.value = user;
      setPasswordOk(true);
    }
    // eslint-disable-next-line
  }, [user, pwd]);

  function submit() {
    setError(null);
    setSending(true);
    fetch(host + "/api/auth/password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: credentialsValue,
      body: JSON.stringify({
        username: user ?? me?.username,
        password: pwd
          ? passwordRef.current!.value
          : md5(passwordRef.current!.value).toString(),
        newPassword: md5(newPasswordRef.current!.value).toString(),
      }),
    })
      .then((response) => {
        setSending(false);
        if (response.ok) {
          onPasswordSet?.();
          return;
        }
        if (response.status === 401) {
          setPasswordOk(false);
          setError(
            t(
              "Bitte überprüfen Sie Ihr aktuelles Passwort und versuchen Sie es erneut."
            )
          );
          return;
        }
        return response.text();
      })
      .then((error_text) => {
        if (error_text) setError(t("Unerwartete Antwort") + ": " + error_text);
      })
      .catch((error) => {
        setSending(false);
        console.error(error);
        setError(t("Fehler beim Senden") + ": " + error?.toString());
      });
  }

  return (
    <div className="py-10 flex w-full justify-center items-center">
      <form
        className="flex flex-col space-y-4 w-64"
        name="update-passwort-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const password = passwordRef.current?.value.trim();
          const newPassword = newPasswordRef.current?.value.trim();
          const confirmPassword = confirmPasswordRef.current?.value.trim();
          // validate form data
          let valid = true;
          if (!password || !newPassword || !confirmPassword) {
            if (!password) setPasswordOk(false);
            if (!newPassword || !confirmPassword) setNewPasswordsOk(false);

            valid = false;
            setError(t("Bitte füllen Sie alle erforderlichen Felder aus."));
          } else if (newPassword !== confirmPassword) {
            setNewPasswordsOk(false);
            setError(t("Die neuen Passwörter stimmen nicht überein."));
            valid = false;
          } else {
            setPasswordOk(true);
            setNewPasswordsOk(true);
          }

          if (!valid) return;
          submit();
        }}
      >
        <div className={me?.username ? "invisible h-0" : "space-y-2"}>
          <Label
            className="font-bold"
            htmlFor="username"
            value={t("Benutzername")}
          />
          <TextInput id="username" ref={usernameRef} disabled />
        </div>
        <div className={isActivateMode ? "invisible h-0" : "space-y-2"}>
          <Label
            className="font-bold"
            htmlFor="password"
            value={t("Passwort")}
          />
          <PasswordInput
            id="password"
            ref={passwordRef}
            color={getTextInputColor({
              ok: passwordOk,
              success_color: null,
            })}
            maxLength={textInputLimit.md}
            onFocus={() => setPasswordOk(null)}
            onChange={(e) => setPasswordOk(e.target?.value.trim() !== "")}
            onBlur={(e) => setPasswordOk(e.target?.value.trim() !== "")}
          />
        </div>

        <div className="space-y-2">
          <Label
            className="font-bold"
            htmlFor="newPassword"
            value={t("Neues Passwort")}
          />
          <PasswordInput
            id="newPassword"
            ref={newPasswordRef}
            color={getTextInputColor({
              ok: newPasswordsOk,
              success_color: null,
            })}
            maxLength={textInputLimit.md}
            onFocus={() => setNewPasswordsOk(null)}
            onChange={() => setNewPasswordsOk(null)}
          />
        </div>
        <div className="space-y-2">
          <Label
            className="font-bold"
            htmlFor="confirmPassword"
            value={t("Neues Passwort wiederholen")}
          />
          <PasswordInput
            id="confirmPassword"
            ref={confirmPasswordRef}
            color={getTextInputColor({
              ok: newPasswordsOk,
              success_color: null,
            })}
            maxLength={textInputLimit.md}
            onFocus={() => setNewPasswordsOk(null)}
            onChange={() => setNewPasswordsOk(null)}
          />
        </div>

        {error ? <Alert color="failure">{error}</Alert> : null}
        <Button type="submit" disabled={sending}>
          {sending ? (
            <Spinner size="sm" />
          ) : isActivateMode ? (
            t("Nutzerkonto aktivieren")
          ) : (
            t("Passwort ändern")
          )}
        </Button>
      </form>
    </div>
  );
}
