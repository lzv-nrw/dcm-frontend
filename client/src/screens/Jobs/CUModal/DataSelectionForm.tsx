import React, { useState, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Alert,
  Button,
  Label,
  Checkbox,
  TextInput,
  Select,
  Spinner,
} from "flowbite-react";
import { FiMinus } from "react-icons/fi";

import t from "../../../utils/translation";
import { OAITemplateInfo } from "../../../types";
import {
  getTextInputColor,
  textInputLimit,
  ValidationReport,
  Validator,
} from "../../../utils/forms";
import { credentialsValue, devMode, host } from "../../../App";
import { FormSectionComponentProps } from "../../../components/SectionedForm";
import Datepicker from "../../../components/Datepicker";
import { useFormStore } from "./store";

type OAIDataSelectionFormChildren = never;

export interface OaiDataSelection {
  sets?: string[];
  identifiers?: string[];
  from?: Date;
  until?: Date;
}

interface OAIdentifierInputProps {
  identifiers: string[];
  onChange: (identifiers: string[]) => void;
}

/**
 * Helper component for the data-selection form section.
 */
function OAIdentifierInput({ identifiers, onChange }: OAIdentifierInputProps) {
  const [identifier, setIdentifier] = useState("");
  const identifierInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full max-h-64 overflow-y-auto">
      <div className="flex flex-col w-full space-y-2 overflow-x-hidden">
        {identifiers.map((identifier) => (
          <div
            key={identifier}
            className="flex w-full justify-between p-2 rounded-lg shadow-md border border-gray-200"
          >
            <span className="font-semibold">{identifier}</span>
            <Button
              color="light"
              className="w-6 h-6 flex items-center rounded-full"
              onClick={() =>
                onChange(identifiers.filter((i) => i !== identifier))
              }
            >
              <FiMinus size={15} />
            </Button>
          </div>
        ))}
        <div className="flex flex-row w-full space-x-2">
          <TextInput
            ref={identifierInputRef}
            className="flex-grow"
            placeholder="OAI-Identifier"
            value={identifier}
            maxLength={textInputLimit.md}
            onChange={(e) => setIdentifier(e.target.value.trim())}
          />
          <Button
            disabled={identifier === "" || identifiers.includes(identifier)}
            onClick={() => {
              onChange([...identifiers, identifier]);
              setIdentifier("");
              identifierInputRef.current?.focus();
            }}
          >
            {t("Hinzufügen")}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface OAISetInfo {
  setName: string;
  setSpec: string;
}

interface OAISetInputProps {
  sets: string[];
  url?: string;
  onChange: (sets: string[]) => void;
  onError: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Helper component for the data-selection form section.
 */
function OAISetInput({ sets, url, onChange, onError }: OAISetInputProps) {
  const [setOptions, setSetOptions] = useState<OAISetInfo[] | null>(null);
  const [loading, setLoading] = useState(true);

  // collect oai-sets
  useEffect(() => {
    setLoading(true);
    if (!url) {
      onError(t("Das Template definiert keine Repository-URL."));
      setLoading(false);
      return;
    }
    fetch(
      host +
        "/api/misc/oai/sets?" +
        new URLSearchParams({ url: encodeURI(url) }).toString(),
      { credentials: credentialsValue }
    )
      .then((response) => {
        setLoading(false);
        if (!response.ok) {
          onError(
            `Unable to load OAI-sets for url '${url}' (${response.statusText}).`
          );
          return;
        }
        onError(null);
        response.json().then((json) => setSetOptions(json));
      })
      .catch((error) => {
        setLoading(false);
        onError(error.message);
      });
  }, [url, onError]);

  return (
    <div className="w-full max-h-64 overflow-y-auto p-2 rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-col gap-2">
        {loading ? (
          <Spinner />
        ) : setOptions ? (
          setOptions
            .sort((a, b) => (a.setSpec > b.setSpec ? 1 : -1))
            .map((setOption) => (
              <div key={setOption.setSpec} className="flex items-center gap-2">
                <Checkbox
                  id={setOption.setSpec}
                  value={setOption.setSpec}
                  checked={sets.includes(setOption.setSpec)}
                  onChange={(e) =>
                    onChange(
                      sets.includes(e.target.value)
                        ? sets.filter((set) => set !== e.target.value)
                        : [...sets, e.target.value]
                    )
                  }
                />
                <Label htmlFor={setOption.setSpec}>
                  {setOption.setName}
                  <span className="text-gray-500 ms-2">
                    {setOption.setSpec}
                  </span>
                </Label>
              </div>
            ))
        ) : (
          <span className="text-gray-500">{t("Kein Set verfügbar.")}</span>
        )}
      </div>
    </div>
  );
}

export function OaiDataSelectionForm({
  name,
  active,
}: FormSectionComponentProps) {
  const [dataSelection, setDataSelection] = useFormStore(
    useShallow((state) => [state.dataSelection, state.setDataSelection])
  );
  const template = useFormStore((state) => state.template);
  const scheduling = useFormStore((state) => state.scheduling);
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const [formVisited, setFormVisited] = useState(active);

  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"" | "sets" | "identifiers">(
    (dataSelection as OaiDataSelection)?.sets
      ? "sets"
      : (dataSelection as OaiDataSelection)?.identifiers
      ? "identifiers"
      : ""
  );

  const [useUntil, setUseUntil] = useState(
    (dataSelection as OaiDataSelection)?.until !== undefined
  );

  // track visited
  useEffect(() => {
    if (active) setFormVisited(true);
  }, [active]);

  // reset inputs when changing filter
  useEffect(() => {
    setDataSelection({
      sets: undefined,
      identifiers: undefined,
    });
    // eslint-disable-next-line
  }, [filterType]);

  // handle validation
  // * form section
  useEffect(() => {
    if (!formVisited || active) return;
    setCurrentValidationReport({
      children: {
        dataSelection: validator.children?.dataSelection?.validate(true),
      },
    });
    // eslint-disable-next-line
  }, [active]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      {error ? (
        <Alert onDismiss={() => setError(null)} color="failure">
          {error}
        </Alert>
      ) : null}
      <div className="flex flex-col space-y-2">
        <Label
          className="font-semibold"
          htmlFor="filterSelect"
          value={t("Zeitraum einschränken")}
        />
        <div className="grid grid-flow-row-dense grid-cols-12 gap-2 items-center">
          <div className="flex justify-end col-span-3">
            <span>{t("Extrahieren ab")}</span>
          </div>
          <div className="col-span-4">
            <Datepicker
              className="flex flex-row w-48"
              date={(dataSelection as OaiDataSelection)?.from ?? null}
              disabled={
                useUntil ||
                filterType === "identifiers" ||
                ![undefined, "onetime"].includes(scheduling?.schedule)
              }
              onChange={(date) => setDataSelection({ from: date ?? undefined })}
            />
          </div>
          <div className="col-span-5"></div>
          {useUntil ? (
            <>
              <div className="flex justify-end col-span-3">
                <span>{t("bis")}</span>
              </div>
              <div className="col-span-4">
                <Datepicker
                  className="flex flex-row w-48"
                  date={(dataSelection as OaiDataSelection)?.until ?? null}
                  disabled={filterType === "identifiers"}
                  minDate={
                    (dataSelection as OaiDataSelection)?.from ?? undefined
                  }
                  onChange={(date) =>
                    setDataSelection({ until: date ?? undefined })
                  }
                />
              </div>
              <div className="col-span-5">
                <Button
                  color="light"
                  className="w-6 h-6 flex items-center rounded-full"
                  onClick={() => {
                    setDataSelection({ until: undefined });
                    setUseUntil(false);
                  }}
                >
                  <FiMinus size={15} />
                </Button>
              </div>
            </>
          ) : (
            (dataSelection as OaiDataSelection)?.from !== undefined && (
              <div className="col-span-5">
                <Button
                  onClick={() => {
                    setDataSelection({ until: undefined });
                    setUseUntil(true);
                  }}
                >
                  {t("Enddatum hinzufügen")}
                </Button>
              </div>
            )
          )}
        </div>
        <Label
          className="font-semibold"
          htmlFor="filterSelect"
          value={t("In welcher Granularität möchten Sie Daten auswählen?")}
        />
        <Select
          id="filterSelect"
          value={filterType}
          onChange={(event) =>
            setFilterType(event.target.value as "" | "sets" | "identifiers")
          }
        >
          <option value="">{t("Bitte auswählen")}</option>
          <option value="sets">{t("Sets")}</option>
          {devMode && (
            <option
              disabled={(dataSelection as OaiDataSelection)?.from !== undefined}
              value="identifiers"
            >
              {t("Identifier")}
            </option>
          )}
        </Select>
        <div className="full flex flex-row items-start space-x-2">
          {filterType === "sets" && (
            <OAISetInput
              sets={(dataSelection as OaiDataSelection)?.sets ?? []}
              url={(template?.additionalInformation as OAITemplateInfo).url}
              onError={setError}
              onChange={(sets) => setDataSelection({ sets: sets ?? undefined })}
            />
          )}
          {filterType === "identifiers" && (
            <OAIdentifierInput
              identifiers={
                (dataSelection as OaiDataSelection)?.identifiers ?? []
              }
              onChange={(identifiers) =>
                setDataSelection({ identifiers: identifiers ?? undefined })
              }
            />
          )}
        </div>
      </div>
    </>
  );
}

type HotfolderDataSelectionFormChildren = "subdirectory";

export interface HotfolderDataSelection {
  subdirectory?: string;
}

export function validateSubdirectory(
  strict: boolean,
  subdirectory: string | undefined
): ValidationReport | undefined {
  if (subdirectory === undefined && !strict) return;
  if (subdirectory === undefined || subdirectory === "") return;
  if (subdirectory.startsWith("/"))
    return {
      ok: false,
      errors: [t("Der Pfad muss relativ sein.")],
    };
  if (!/[^\0]*/.test(subdirectory))
    // see https://stackoverflow.com/a/537876
    return {
      ok: false,
      errors: [t("Der Pfad enthält ungültige Zeichen.")],
    };
  return { ok: true };
}

export function HotfolderDataSelectionForm({
  name,
  active,
}: FormSectionComponentProps) {
  const [dataSelection, setDataSelection] = useFormStore(
    useShallow((state) => [state.dataSelection, state.setDataSelection])
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
  // * subdirectory
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        dataSelection: {
          children: {
            subdirectory:
              validator.children?.dataSelection?.children?.subdirectory?.validate(
                false
              ),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [(dataSelection as HotfolderDataSelection)?.subdirectory]);
  // * form section
  useEffect(() => {
    if (!formVisited || active) return;
    setCurrentValidationReport({
      children: {
        dataSelection: validator.children?.dataSelection?.validate(true),
      },
    });
    // eslint-disable-next-line
  }, [active]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col space-y-2">
        <Label
          htmlFor="subdirectory"
          value={t(
            "Aus welchem Unterverzeichnis sollen Daten extrahiert werden?"
          )}
        />
        <TextInput
          id="subdirectory"
          value={(dataSelection as HotfolderDataSelection)?.subdirectory || ""}
          placeholder={t("pfad/zu/hotfolder")}
          maxLength={textInputLimit.unlimited}
          onChange={(e) => setDataSelection({ subdirectory: e.target.value })}
          color={getTextInputColor({
            ok:
              focus === "subdirectory"
                ? undefined
                : validator.children?.dataSelection?.children?.subdirectory
                    ?.report?.ok,
          })}
          onFocus={(e) => setFocus(e.target.id)}
          onBlur={(e) => {
            setFocus("");
            setDataSelection({ subdirectory: e.target.value.trim() });
          }}
        />
      </div>
    </>
  );
}

type EmptyDataSelectionFormChildren = never;

export function EmptyDataSelectionForm({
  name,
  active,
}: FormSectionComponentProps) {
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const [formVisited, setFormVisited] = useState(active);

  // track visited
  useEffect(() => {
    if (active) setFormVisited(true);
  }, [active]);

  // handle validation
  // * form section
  useEffect(() => {
    if (!formVisited || active) return;
    setCurrentValidationReport({
      children: {
        dataSelection: validator.children?.dataSelection?.validate(true),
      },
    });
    // eslint-disable-next-line
  }, [active]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col space-y-2">
        <span className="text-sm text-gray-500">
          {t("Es werden keine weiteren Informationen werden benötigt.")}
        </span>
      </div>
    </>
  );
}

export type DataSelectionFormChildren =
  | HotfolderDataSelectionFormChildren
  | OAIDataSelectionFormChildren
  | EmptyDataSelectionFormChildren;
export type DataSelectionFormValidator = Validator<DataSelectionFormChildren>;
