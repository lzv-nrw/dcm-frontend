import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { Label, TextInput } from "flowbite-react";
import { FiLock } from "react-icons/fi";

import t from "../../../utils/translation";
import {
  ValidationMessages,
  ValidationReport,
  Validator,
  getTextInputColor,
  textInputLimit,
} from "../../../utils/forms";
import { FormSectionComponentProps } from "../../../components/SectionedForm";
import { useFormStore } from "./store";

export type DataFormChildren = "username" | "firstname" | "lastname" | "email";
export type DataFormValidator = Validator<DataFormChildren>;

export function validateNonEmptyText(
  strict: boolean,
  text: string | undefined,
  name: string
): ValidationReport | undefined {
  if (text === undefined && !strict) return;
  if (text === undefined)
    return { ok: false, errors: [ValidationMessages.EmptyValue(name)] };
  if (text === "")
    return {
      ok: false,
      errors: [ValidationMessages.EmptyValue(name)],
    };
  return { ok: true };
}

export function validateEmail(
  strict: boolean,
  email: string | undefined
): ValidationReport | undefined {
  if (email === undefined && !strict) return;
  if (email === undefined)
    return { ok: false, errors: [ValidationMessages.EmptyValue("E-Mail")] };
  if (email === "")
    return {
      ok: false,
      errors: [ValidationMessages.EmptyValue("E-Mail")],
    };
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email))
    return { ok: false, errors: [t("Die E-Mail-Adresse ist ungültig.")] };
  return { ok: true };
}

export interface Data {
  username?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
}

export function DataForm({ name, active }: FormSectionComponentProps) {
  const userId = useFormStore((state) => state.id);
  const [data, setData] = useFormStore(
    useShallow((state) => [state.data, state.setData])
  );
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const [formVisited, setFormVisited] = useState(active);

  const [focus, setFocus] = useState("");

  // track visited
  useEffect(() => {
    if (active) setFormVisited(true);
  }, [active]);

  // handle validation
  // * username
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        data: {
          children: {
            username:
              validator.children?.data?.children?.username?.validate(false),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [data?.username]);
  // * firstname
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        data: {
          children: {
            firstname:
              validator.children?.data?.children?.firstname?.validate(false),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [data?.firstname]);
  // * lastname
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        data: {
          children: {
            lastname:
              validator.children?.data?.children?.lastname?.validate(false),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [data?.lastname]);
  // * email
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        data: {
          children: {
            email: validator.children?.data?.children?.email?.validate(false),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [data?.email]);
  // * form section
  useEffect(() => {
    if (!formVisited) return;
    if (validator.children?.data?.report?.ok === undefined && active) return;
    setCurrentValidationReport({
      children: {
        data: validator.children?.data?.validate(true),
      },
    });
    // eslint-disable-next-line
  }, [active, data?.username, data?.firstname, data?.lastname, data?.email]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <div className="space-y-2">
          <div className="flex flex-row space-x-2 items-center">
            <Label htmlFor="username" value={t("Benutzername*")} />
            {userId !== undefined && <FiLock />}
          </div>
          <TextInput
            id="username"
            disabled={userId !== undefined}
            value={data?.username || ""}
            maxLength={textInputLimit.md}
            color={getTextInputColor({
              ok:
                focus === "username"
                  ? undefined
                  : validator.children?.data?.children?.username?.report?.ok,
            })}
            onChange={(e) => setData({ username: e.target.value })}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={(e) => {
              setFocus("");
              setData({ username: e.target.value.trim() });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="firstname" value={t("Vorname*")} />
          <TextInput
            id="firstname"
            value={data?.firstname || ""}
            maxLength={textInputLimit.md}
            color={getTextInputColor({
              ok:
                focus === "firstname"
                  ? undefined
                  : validator.children?.data?.children?.firstname?.report?.ok,
            })}
            onChange={(e) => setData({ firstname: e.target.value })}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={(e) => {
              setFocus("");
              setData({ firstname: e.target.value.trim() });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastname" value={t("Nachname*")} />
          <TextInput
            id="lastname"
            value={data?.lastname || ""}
            maxLength={textInputLimit.md}
            color={getTextInputColor({
              ok:
                focus === "lastname"
                  ? undefined
                  : validator.children?.data?.children?.lastname?.report?.ok,
            })}
            onChange={(e) => setData({ lastname: e.target.value })}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={(e) => {
              setFocus("");
              setData({ lastname: e.target.value.trim() });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" value={t("E-Mail*")} />
          <TextInput
            id="email"
            value={data?.email || ""}
            maxLength={textInputLimit.md}
            color={getTextInputColor({
              ok:
                focus === "email"
                  ? undefined
                  : validator.children?.data?.children?.email?.report?.ok,
            })}
            onChange={(e) => setData({ email: e.target.value })}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={(e) => {
              setFocus("");
              setData({ email: e.target.value.trim() });
            }}
          />
        </div>
      </div>
    </>
  );
}
