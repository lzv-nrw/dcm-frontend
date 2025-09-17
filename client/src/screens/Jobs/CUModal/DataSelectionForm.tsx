import { useState, useEffect, useRef, useContext } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Button,
  Label,
  Checkbox,
  TextInput,
  Select,
  Spinner,
  Radio,
} from "flowbite-react";
import { FiMinus, FiAlertCircle } from "react-icons/fi";

import t from "../../../utils/translation";
import { HotfolderTemplateInfo, OAITemplateInfo } from "../../../types";
import {
  getTextInputColor,
  textInputLimit,
  ValidationReport,
  Validator,
} from "../../../utils/forms";
import { genericSort } from "../../../utils/genericSort";
import { credentialsValue, devMode, host } from "../../../App";
import { FormSectionComponentProps } from "../../../components/SectionedForm";
import Datepicker from "../../../components/Datepicker";
import { useFormStore } from "./store";
import { ErrorMessageContext } from "./Modal";
import { defaultJSONFetch } from "../../../utils/api";

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
}

/**
 * Helper component for the data-selection form section.
 */
function OAISetInput({ sets, url, onChange }: OAISetInputProps) {
  const [setOptions, setSetOptions] = useState<OAISetInfo[] | null>(null);
  const [loading, setLoading] = useState(true);

  const errorHandler = useContext(ErrorMessageContext);

  // collect oai-sets
  useEffect(() => {
    setLoading(true);
    if (!url) {
      errorHandler?.pushMessage({
        id: "oai-data-selection-missing-url",
        text: t("Das Template definiert keine Repository-URL."),
      });
      setLoading(false);
      return;
    }
    errorHandler?.removeMessage("oai-data-selection-bad-response");
    errorHandler?.removeMessage("oai-data-selection-error");
    fetch(
      host +
        "/api/misc/oai/sets?" +
        new URLSearchParams({ url: encodeURI(url) }).toString(),
      { credentials: credentialsValue }
    )
      .then((response) => {
        setLoading(false);
        if (!response.ok) {
          response.text().then((text) =>
            errorHandler?.pushMessage({
              id: `oai-data-selection-bad-response`,
              text: `${t("Abfrage der OAI-Sets fehlgeschlagen")}: ${text}`,
            })
          );
          return;
        }
        response.json().then((json) => setSetOptions(json));
      })
      .catch((error) => {
        setLoading(false);
        errorHandler?.pushMessage({
          id: `oai-data-selection-error`,
          text: `${t("Abfrage der OAI-Sets fehlgeschlagen")}: ${error.message}`,
        });
      });
    // eslint-disable-next-line
  }, [url]);

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
    if (active)
      setDataSelection({
        sets: undefined,
        identifiers: undefined,
      });
    // eslint-disable-next-line
  }, [filterType]);

  // handle validation
  // * form section
  useEffect(() => {
    if (!formVisited) return;
    if (validator.children?.dataSelection?.report?.ok === undefined && active)
      return;
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
              url={(template?.additionalInformation as OAITemplateInfo)?.url}
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

type HotfolderDataSelectionFormChildren = "path";

export interface HotfolderDataSelection {
  path?: string;
}

export function validatePath(
  strict: boolean,
  path: string | undefined
): ValidationReport | undefined {
  if (path === undefined && !strict) return;
  if (path === undefined || path === "")
    return {
      ok: false,
      errors: [t("Das Verzeichnis der Datenauswahl darf nicht leer sein.")],
    };
  if (path.startsWith("/"))
    return {
      ok: false,
      errors: [t("Das Verzeichnis der Datenauswahl muss relativ sein.")],
    };
  if (!/^[^\0/\\:*?"<>|#%&{}$!@+`~;=,\n\r\t]*$/.test(path))
    return {
      ok: false,
      errors: [
        t("Das Verzeichnis der Datenauswahl enthält ungültige Zeichen."),
      ],
    };
  return { ok: true };
}

type HotfolderDirectorySelectionMode = "" | "existing" | "new";

interface HotfolderDirectoryInfo {
  name: string;
  inUse?: boolean;
  linkedJobConfigs?: string[];
}

export function HotfolderDataSelectionForm({
  name,
  active,
}: FormSectionComponentProps) {
  const id = useFormStore((state) => state.id);
  const template = useFormStore((state) => state.template);
  const [dataSelection, setDataSelection] = useFormStore(
    useShallow((state) => [state.dataSelection, state.setDataSelection])
  );
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const errorHandler = useContext(ErrorMessageContext);

  const [formVisited, setFormVisited] = useState(active);

  const [focus, setFocus] = useState("");

  // track visited
  useEffect(() => {
    if (active) setFormVisited(true);
  }, [active]);

  // get hotfolder directories
  const [mode, setMode] = useState<HotfolderDirectorySelectionMode>(
    (dataSelection as HotfolderDataSelection)?.path ? "existing" : ""
  );
  const [directories, setDirectories] = useState<HotfolderDirectoryInfo[]>([]);
  const [directoriesLoading, setDirectoriesLoading] = useState(false);
  const [newDirectory, setNewDirectory] = useState("");
  const [newDirectoryOk, setNewDirectoryOk] = useState<boolean | undefined>(
    undefined
  );
  const [newDirectoryLoading, setNewDirectoryLoading] = useState(false);
  const [newDirectoryCreated, setNewDirectoryCreated] = useState(false);

  // load hotfolder directories from API
  useEffect(() => {
    setDirectoriesLoading(true);
    errorHandler?.removeMessage("hotfolder-directories-error");
    const sourceId = (template?.additionalInformation as HotfolderTemplateInfo)
      .sourceId;
    if (sourceId === undefined) {
      errorHandler?.pushMessage({
        id: `hotfolder-directories-error`,
        text: t(
          "Abfrage der Hotfolder-Verzeichnisse fehlgeschlagen: Das Template enthält keine Hotfolder-ID."
        ),
      });
      return;
    }
    defaultJSONFetch(
      "/api/admin/template/hotfolder-directories?" +
        new URLSearchParams({ id: sourceId }).toString(),
      t("Hotfolder-Verzeichnisse"),
      () => setDirectoriesLoading(false),
      (json) => setDirectories(json),
      (msg) =>
        errorHandler?.pushMessage({
          id: `hotfolder-directories-error`,
          text: `${t(
            "Abfrage der Hotfolder-Verzeichnisse fehlgeschlagen"
          )}: ${msg}`,
        })
    );
    // eslint-disable-next-line
  }, [mode]);

  // reset form and store data when changing input mode
  useEffect(() => {
    if (active) {
      setDataSelection({ path: undefined });
      setNewDirectory("");
      setNewDirectoryCreated(false);
      setNewDirectoryLoading(false);
      setNewDirectoryOk(undefined);
    }
    // eslint-disable-next-line
  }, [mode]);

  // handle validation
  // * newDirectory (local to this component)
  useEffect(() => {
    setNewDirectoryOk(validatePath(false, newDirectory)?.ok);
    // eslint-disable-next-line
  }, [newDirectory]);
  // * path
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        dataSelection: {
          children: {
            path: validator.children?.dataSelection?.children?.path?.validate(
              false
            ),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [(dataSelection as HotfolderDataSelection)?.path]);
  // * form section
  useEffect(() => {
    if (!formVisited) return;
    if (validator.children?.dataSelection?.report?.ok === undefined && active)
      return;
    setCurrentValidationReport({
      children: {
        dataSelection: validator.children?.dataSelection?.validate(true),
      },
    });
    // eslint-disable-next-line
  }, [active, (dataSelection as HotfolderDataSelection)?.path]);

  return (
    <div className="flex flex-col space-y-2">
      <h3 className="text-xl font-bold">{name}</h3>
      <p>
        {t(
          "Legen Sie das Verzeichnis fest, aus dem Daten extrahiert werden sollen."
        )}
      </p>
      <div className="flex flex-col space-y-2 mt-5">
        <div className="flex flex-row items-center">
          <Label
            className="text-md font-semibold"
            htmlFor="mode"
            value={t(
              "Möchten Sie ein Verzeichnis auswählen oder ein neues anlegen?"
            )}
          />
          {validator.children.dataSelection?.children?.path?.report?.ok ===
            false && (
            <div className="w-0">
              <FiAlertCircle size={15} className="ml-2 text-red-500" />
            </div>
          )}
        </div>
        <Select
          className="w-1/2"
          id="mode"
          value={mode}
          onChange={(e) =>
            setMode(e.target.value as HotfolderDirectorySelectionMode)
          }
        >
          <option value="">{t("Bitte auswählen")}</option>
          <option value="existing" disabled={directories.length === 0}>
            {t("Verzeichnis auswählen")}
          </option>
          <option value="new">{t("Neues Verzeichnis anlegen")}</option>
        </Select>
      </div>
      <div className="flex flex-col space-y-2">
        {mode === "existing" &&
          (directoriesLoading ? (
            <Spinner />
          ) : (
            <div className="flex flex-col space-y-1 bg-gray-50 border border-gray-200 p-3 rounded-lg shadow-md">
              {directories
                .sort(
                  genericSort<HotfolderDirectoryInfo>({
                    field: "name",
                    fallbackValue: "",
                    caseInsensitive: true,
                  })
                )
                .map((d) => (
                  <div
                    key={`${d.name}-container`}
                    className="flex flex-row space-x-2 items-center"
                  >
                    {d.inUse && !d.linkedJobConfigs?.includes(id ?? "") ? (
                      <>
                        {/* disabled option */}
                        <Radio
                          id={d.name}
                          name="directories"
                          value={d.name}
                          disabled
                          checked={
                            (dataSelection as HotfolderDataSelection)?.path ===
                            d.name
                          }
                        />
                        <Label htmlFor={d.name} className="text-gray-500">
                          {`${d.name} ${t("(in Verwendung)")}`}
                        </Label>
                      </>
                    ) : (
                      <>
                        {/* enabled option */}
                        <Radio
                          className="hover:cursor-pointer"
                          id={d.name}
                          name="directories"
                          value={d.name}
                          checked={
                            (dataSelection as HotfolderDataSelection)?.path ===
                            d.name
                          }
                          onChange={() => setDataSelection({ path: d.name })}
                        />
                        <Label
                          className="hover:cursor-pointer"
                          htmlFor={d.name}
                        >
                          {d.name}
                        </Label>
                      </>
                    )}
                  </div>
                ))}

              {
                /* Handle special case where currently configured selection is
                   not in list of available directories.*/ (
                  dataSelection as HotfolderDataSelection
                )?.path !== undefined &&
                directories.find(
                  (d) =>
                    d.name === (dataSelection as HotfolderDataSelection)?.path
                ) === undefined ? (
                  <div className="flex flex-row space-x-2 items-center">
                    <Radio
                      id={(dataSelection as HotfolderDataSelection)?.path}
                      name="directories"
                      value={(dataSelection as HotfolderDataSelection)?.path}
                      disabled
                      checked
                    />
                    <Label
                      htmlFor={(dataSelection as HotfolderDataSelection)?.path}
                      className="text-gray-500"
                    >
                      {`${(dataSelection as HotfolderDataSelection)?.path} ${t(
                        "(existiert nicht mehr)"
                      )}`}
                    </Label>
                  </div>
                ) : null
              }
            </div>
          ))}
        {mode === "new" && (
          <div className="flex flex-row space-x-2 items-center">
            {newDirectoryCreated ? (
              <>
                <span>
                  {t(
                    `Verzeichnis '${
                      (dataSelection as HotfolderDataSelection)?.path
                    }' wurde angelegt.`
                  )}
                </span>
                <Button
                  onClick={() => {
                    setDataSelection({ path: undefined });
                    setNewDirectoryCreated(false);
                  }}
                >
                  {t("Ändern")}
                </Button>
              </>
            ) : (
              <>
                <TextInput
                  id="path"
                  className="grow"
                  placeholder={t("neues-verzeichnis")}
                  maxLength={textInputLimit.xl}
                  value={newDirectory}
                  onChange={(e) => setNewDirectory(e.target.value)}
                  color={getTextInputColor({
                    ok: focus === "path" ? null : newDirectoryOk,
                  })}
                  onBlur={(e) => {
                    setFocus("");
                    setNewDirectory(e.target.value.trim());
                  }}
                  onFocus={(e) => setFocus(e.target.id)}
                />
                <Button
                  disabled={!newDirectoryOk || newDirectoryLoading}
                  onClick={() => {
                    setNewDirectoryLoading(true);
                    errorHandler?.removeMessage("failed-new-directory-not-ok");
                    errorHandler?.removeMessage("failed-new-directory-error");
                    const sourceId = (
                      template?.additionalInformation as HotfolderTemplateInfo
                    ).sourceId;
                    if (sourceId === undefined) {
                      errorHandler?.pushMessage({
                        id: `failed-new-directory-error`,
                        text: t(
                          "Fehler beim Anlegen des Verzeichnisses: Das Template enthält keine Hotfolder-ID."
                        ),
                      });
                      return;
                    }
                    fetch(host + "/api/admin/template/hotfolder-directory", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      credentials: credentialsValue,
                      body: JSON.stringify({
                        id: sourceId,
                        name: newDirectory,
                      }),
                    })
                      .then((response) => {
                        setNewDirectoryLoading(false);
                        if (!response.ok) {
                          response.text().then((text) =>
                            errorHandler?.pushMessage({
                              id: "failed-new-directory-not-ok",
                              text: `${t(
                                `Anlegen des Verzeichnisses nicht erfolgreich`
                              )}: ${text}`,
                            })
                          );
                          return;
                        }
                        setDataSelection({ path: newDirectory });
                        setNewDirectoryCreated(true);
                      })
                      .catch((error) => {
                        setNewDirectoryLoading(false);
                        console.error(error);
                        errorHandler?.pushMessage({
                          id: "failed-new-directory-error",
                          text: `${t(
                            `Fehler beim Anlegen des Verzeichnisses`
                          )}: ${error.message}`,
                        });
                      });
                  }}
                >
                  {newDirectoryLoading ? <Spinner /> : t("Verzeichnis anlegen")}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
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
    if (!formVisited) return;
    if (validator.children?.dataSelection?.report?.ok === undefined && active)
      return;
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
