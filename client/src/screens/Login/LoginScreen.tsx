import { useState, useRef } from "react";
import { Label, TextInput, Button, Alert, Spinner } from "flowbite-react";
import { useShallow } from "zustand/react/shallow";
import md5 from "md5";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import { getTextInputColor, textInputLimit } from "../../utils/forms";
import { credentialsValue, host } from "../../App";
import PasswordInput from "../../components/PasswordInput";

export default function LoginScreen() {
  const [setLoggedIn, setMe, fetchACL] = useGlobalStore(
    useShallow((state) => [
      state.session.setLoggedIn,
      state.session.setMe,
      state.session.fetchACL,
    ])
  );
  const usernameRef = useRef<HTMLInputElement>(null);
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [passwordOk, setPasswordOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(false);

  /**
   * Performs submission of form. Does not validate form data.
   */
  function submit() {
    // process request
    const formData = {
      username: usernameRef.current!.value.trim(),
      password: md5(passwordRef.current!.value.trim()).toString(),
    };
    setError(null);
    setSending(true);
    fetch(host + "/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: credentialsValue,
      body: JSON.stringify(formData),
    })
      .then((response) => {
        setSending(false);
        if (response.ok) {
          setLoggedIn(true);
          response.json().then((json) => setMe(json));
          fetchACL({});
          return;
        }
        if (response.status === 401) {
          setError(
            t(
              "Bitte überprüfen Sie Ihren Benutzernamen und Ihr Passwort und versuchen Sie es erneut."
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
        name="login-form"
        onSubmit={(e) => {
          e.preventDefault();

          // validate form data
          let valid = true;
          [
            { ok: usernameOk, setOk: setUsernameOk },
            { ok: passwordOk, setOk: setPasswordOk },
          ].forEach(({ ok, setOk }) => {
            if (!ok) {
              setOk?.(false);
              valid = false;
              setError(t("Bitte füllen Sie alle erforderlichen Felder aus."));
            }
          });
          if (!valid) return;

          submit();
        }}
      >
        <div className="space-y-2">
          <Label
            className="font-bold"
            htmlFor="username"
            value={t("Benutzername")}
          />
          <TextInput
            id="username"
            ref={usernameRef}
            color={getTextInputColor({ ok: usernameOk, success_color: null })}
            maxLength={textInputLimit.sm}
            onFocus={() => {
              setUsernameOk(null);
            }}
            onChange={(e) => {
              setUsernameOk(e.target?.value.trim() !== "");
            }}
            onBlur={(e) => {
              setUsernameOk(e.target?.value.trim() !== "");
            }}
          />
        </div>
        <div className="space-y-2">
          <Label
            className="font-bold"
            htmlFor="password"
            value={t("Passwort")}
          />
          <PasswordInput
            id="password"
            ref={passwordRef}
            color={getTextInputColor({ ok: passwordOk, success_color: null })}
            maxLength={textInputLimit.md}
            onFocus={() => {
              setPasswordOk(null);
            }}
            onChange={(e) => {
              setPasswordOk(e.target?.value.trim() !== "");
            }}
            onBlur={(e) => {
              setPasswordOk(e.target?.value.trim() !== "");
            }}
          />
        </div>
        {error ? <Alert color="failure">{error}</Alert> : null}
        <Button type="submit" disabled={sending}>
          {sending ? <Spinner size="sm" /> : t("Anmelden")}
        </Button>
      </form>
    </div>
  );
}
