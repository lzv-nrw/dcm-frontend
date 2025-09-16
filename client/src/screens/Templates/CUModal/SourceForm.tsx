import { useState, useEffect, useRef, useContext } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Alert,
  Button,
  Label,
  Select,
  Spinner,
  TextInput,
  Textarea,
} from "flowbite-react";
import { FiAlertCircle, FiLock } from "react-icons/fi";

import t from "../../../utils/translation";
import { genericSort } from "../../../utils/genericSort";
import { Hotfolder, TemplateType, TransferUrlFilter } from "../../../types";
import {
  getTextInputColor,
  textInputLimit,
  isValidRegex,
  Validator,
  ValidationReport,
  ValidationMessages,
} from "../../../utils/forms";
import useGlobalStore from "../../../store";
import { host, credentialsValue, devMode } from "../../../App";
import { FormSectionComponentProps } from "../../../components/SectionedForm";
import { useFormStore } from "./store";
import { ErrorMessageContext } from "./Modal";

export interface Source {
  type?: TemplateType;
  plugin?: {
    plugin?: string;
    args?: string;
  };
  hotfolder?: {
    sourceId?: string;
  };
  oai?: {
    url?: string;
    metadataPrefixes?: string[];
    metadataPrefix?: string;
    transferUrlFilters?: TransferUrlFilter[];
  };
}

type PluginSourceFormChildren = never;

export function validatePluginPlugin(
  strict: boolean,
  plugin: string | undefined
): ValidationReport | undefined {
  if (plugin === undefined && !strict) return;
  if (plugin === undefined)
    return {
      ok: false,
      errors: [ValidationMessages.EmptyValue("Plugin Identifier")],
    };
  if (plugin === "")
    return {
      ok: false,
      errors: [ValidationMessages.EmptyValue("Plugin Identifier")],
    };
  return { ok: true };
}

export function validatePluginArgs(
  strict: boolean,
  args: string | undefined
): ValidationReport | undefined {
  if (args === undefined && !strict) return;
  if (args && args !== "") {
    try {
      JSON.parse(args);
    } catch {
      return { ok: false, errors: [t("Ungültiges JSON in Plugin Optionen.")] };
    }
  }
  return { ok: true };
}

export function PluginSourceForm() {
  const [source, setSource] = useFormStore(
    useShallow((state) => [state.source, state.setSource])
  );
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const [focus, setFocus] = useState("");

  // handle validation
  // * plugin
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        source: {
          children: {
            pluginPlugin:
              validator.children?.source?.children?.pluginPlugin?.validate(
                false
              ),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [source?.plugin?.plugin]);
  // * args
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        source: {
          children: {
            pluginArgs:
              validator.children?.source?.children?.pluginArgs?.validate(false),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [source?.plugin?.args]);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="plugin" value={t("Plugin Identifier")} />
        <TextInput
          id="plugin"
          value={source?.plugin?.plugin ?? ""}
          maxLength={textInputLimit.md}
          color={getTextInputColor({
            ok:
              focus === "plugin"
                ? undefined
                : validator.children.source?.children.pluginPlugin?.report?.ok,
          })}
          onChange={(e) =>
            setSource({
              plugin: {
                ...source?.plugin,
                plugin: e.target.value,
              },
            })
          }
          onFocus={(e) => setFocus(e.target.id)}
          onBlur={(e) => {
            setFocus("");
            setSource({
              plugin: {
                ...source?.plugin,
                plugin: e.target.value,
              },
            });
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="args" value={t("Plugin Optionen (JSON)")} />
        <Textarea
          id="args"
          className="resize-none"
          rows={4}
          defaultValue={source?.plugin?.args}
          color={getTextInputColor({
            ok:
              focus === "args"
                ? undefined
                : validator.children.source?.children.pluginArgs?.report?.ok,
          })}
          onChange={(e) =>
            setSource({
              plugin: {
                ...source?.plugin,
                args: e.target.value,
              },
            })
          }
          onFocus={(e) => setFocus(e.target.id)}
          onBlur={(e) => {
            setFocus("");
            setSource({
              plugin: {
                ...source?.plugin,
                args: e.target.value.trim(),
              },
            });
          }}
        />
      </div>
    </>
  );
}

type HotfolderSourceFormChildren = "sourceId";

export function validateHotfolderSourceId(
  strict: boolean,
  sourceId: string | undefined
): ValidationReport | undefined {
  if (sourceId === undefined && !strict) return;
  if (sourceId === undefined || sourceId === "")
    return {
      ok: false,
      errors: [ValidationMessages.EmptyValue("Quellverzeichnis")],
    };
  return { ok: true };
}

export function HotfolderSourceForm() {
  const [source, setSource] = useFormStore(
    useShallow((state) => [state.source, state.setSource])
  );
  const hotfolders = useGlobalStore((state) => state.template.hotfolders);
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const [focus, setFocus] = useState("");

  // handle validation
  // * sourceId
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        source: {
          children: {
            hotfolderSourceId:
              validator.children?.source?.children?.hotfolderSourceId?.validate(
                false
              ),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [source?.hotfolder?.sourceId]);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="sourceId" value={t("Ordner auswählen*")} />
        <Select
          id="sourceId"
          value={source?.hotfolder?.sourceId ?? ""}
          color={getTextInputColor({
            ok:
              focus === "sourceId"
                ? undefined
                : validator.children.source?.children.hotfolderSourceId?.report
                    ?.ok,
          })}
          onChange={(e) =>
            setSource({ hotfolder: { sourceId: e.target.value } })
          }
          onFocus={(e) => setFocus(e.target.id)}
          onBlur={() => setFocus("")}
        >
          <option value="">{t("Bitte auswählen")}</option>
          {Object.values(hotfolders)
            .sort(
              genericSort<Hotfolder>({
                field: "name",
                fallbackValue: "",
                caseInsensitive: true,
              })
            )
            .map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          {source?.hotfolder?.sourceId &&
          hotfolders[source.hotfolder.sourceId] === undefined ? (
            <option value={source?.hotfolder?.sourceId} disabled>
              {t(
                `Unbekannter Hotfolder '${source?.hotfolder?.sourceId}' (nicht mehr verfügbar)`
              )}
            </option>
          ) : null}
        </Select>
      </div>
    </>
  );
}

type OAISourceFormChildren = "url" | "metadataPrefix" | "transferUrlFilters";

export function validateOAIUrl(
  strict: boolean,
  url: string | undefined
): ValidationReport | undefined {
  if (url === undefined && !strict) return {};
  if (url === undefined)
    return {
      ok: false,
      errors: [ValidationMessages.EmptyValue("OAI-Endpunkt")],
    };
  if (url === "")
    return {
      ok: false,
      errors: [ValidationMessages.EmptyValue("OAI-Endpunkt")],
    };

  return { ok: true };
}

export function validateOAIMetadataPrefix(
  strict: boolean,
  metadataPrefix: string | undefined
): ValidationReport | undefined {
  if (metadataPrefix === undefined && !strict) return {};
  if (metadataPrefix === undefined || metadataPrefix === "")
    return {
      ok: false,
      errors: [ValidationMessages.EmptyValue("Metadaten-Präfix")],
    };
  return { ok: true };
}

export function validateOAITransferUrlFilters(
  strict: boolean,
  transferUrlFilters: TransferUrlFilter[] | undefined
): ValidationReport | undefined {
  if (transferUrlFilters === undefined && !strict) return {};
  if (transferUrlFilters === undefined || transferUrlFilters.length === 0)
    return {
      ok: false,
      errors: [
        "Es muss mindestens ein Filter für Transfer URLs definiert werden.",
      ],
    };
  return { ok: true };
}

export function OAISourceForm() {
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useFormStore(
    useShallow((state) => [state.source, state.setSource])
  );
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const errorHandler = useContext(ErrorMessageContext);

  const [focus, setFocus] = useState("");

  const [connected, setConnected] = useState<boolean | undefined>(undefined);
  const [loadingConnection, setLoadingConnection] = useState<boolean>(false);
  const [filterRegex, setFilterRegex] = useState<string | undefined>(undefined);
  const [filterRegexOk, setFilterRegexOk] = useState<boolean | undefined>(
    undefined
  );
  const [filterPath, setFilterPath] = useState<string | undefined>(undefined);

  // check connection
  useEffect(() => {
    if (
      source?.oai?.url === undefined ||
      !validator.children.source?.children.oaiUrl?.report?.ok
    )
      return;

    setLoadingConnection(true);
    errorHandler?.removeMessage("oai-identify-error");
    fetch(
      host +
        "/api/misc/oai/identify?" +
        new URLSearchParams({ url: encodeURI(source.oai.url) }).toString(),
      { credentials: credentialsValue }
    )
      .then((response) => {
        setLoadingConnection(false);
        setConnected(response.ok);
      })
      .catch((error) => {
        setLoadingConnection(false);
        setConnected(false);
        errorHandler?.pushMessage({
          id: `oai-identify-error`,
          text: `${t("Abfrage des OAI-Servers fehlgeschlagen")}: ${
            error.message
          }`,
        });
      });
    // eslint-disable-next-line
  }, [
    source?.oai?.url,
    validator.children.source?.children.oaiUrl?.report?.ok,
  ]);

  // collect metadata-prefixes
  useEffect(() => {
    if (!connected || !source?.oai?.url) return;

    errorHandler?.removeMessage("oai-metadata-prefixes-bad-response");
    errorHandler?.removeMessage("oai-metadata-prefixes-error");
    fetch(
      host +
        "/api/misc/oai/metadata-prefixes?" +
        new URLSearchParams({ url: encodeURI(source.oai.url) }).toString(),
      { credentials: credentialsValue }
    )
      .then((response) => {
        if (!response.ok) {
          response.text().then((text) =>
            errorHandler?.pushMessage({
              id: `oai-metadata-prefixes-bad-response`,
              text: `${t(
                "Abfrage der Metadaten-Präfixe fehlgeschlagen"
              )}: ${text}`,
            })
          );
          return;
        }
        response
          .json()
          .then((json) =>
            setSource({ oai: { ...source.oai, metadataPrefixes: json } })
          );
      })
      .catch((error) => {
        setLoadingConnection(false);
        setConnected(false);
        errorHandler?.pushMessage({
          id: `oai-metadata-prefixes-error`,
          text: `${t("Abfrage der Metadaten-Präfixe fehlgeschlagen")}: ${
            error.message
          }`,
        });
      });
    // eslint-disable-next-line
  }, [connected]);

  // handle validation
  // * url
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        source: {
          children: {
            oaiUrl:
              validator.children?.source?.children?.oaiUrl?.validate(false),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [source?.oai?.url]);
  // * metadataPrefix
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        source: {
          children: {
            oaiMetadataPrefix:
              validator.children?.source?.children?.oaiMetadataPrefix?.validate(
                false
              ),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [source?.oai?.metadataPrefix, source?.oai?.url]);
  // * transferUrlFilters
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        source: {
          children: {
            oaiTransferUrlFilters:
              validator.children?.source?.children?.oaiTransferUrlFilters?.validate(
                false
              ),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [source?.oai?.transferUrlFilters]);
  // * filterRegex
  useEffect(() => {
    setFilterRegexOk(
      filterRegex === undefined
        ? undefined
        : filterRegex === ""
        ? false
        : isValidRegex(filterRegex)
    );
  }, [filterRegex]);

  return (
    <>
      <div className="flex flex-row space-x-2">
        <div className="space-y-2 grow">
          <Label htmlFor="url" value={t("Endpunkt*")} />
          <TextInput
            ref={urlInputRef}
            id="url"
            defaultValue={source?.oai?.url ?? ""}
            color={getTextInputColor({
              ok:
                focus === "url" ||
                (connected === undefined &&
                  validator.children.source?.children.oaiUrl?.report?.ok !==
                    false)
                  ? undefined
                  : validator.children.source?.children.oaiUrl?.report?.ok &&
                    source?.oai?.metadataPrefixes !== undefined,
            })}
            maxLength={textInputLimit.md}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={(e) => {
              if (e.target.value.trim() !== source?.oai?.url) {
                // reset inputs
                setSource({
                  oai: {
                    ...source?.oai,
                    url: e.target.value.trim(),
                    metadataPrefixes: undefined,
                    metadataPrefix: undefined,
                    transferUrlFilters: undefined,
                  },
                });
                // reset validation
                setCurrentValidationReport({
                  children: {
                    source: {
                      children: {
                        oaiMetadataPrefix: { ok: undefined },
                        oaiTransferUrlFilters: { ok: undefined },
                      },
                    },
                  },
                });
                setConnected(undefined);
              }
              setFocus("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") urlInputRef.current?.blur();
            }}
            placeholder="https://example.org/oai"
          />
        </div>
        <div className="space-y-2">
          <Label
            className={
              validator.children.source?.children.oaiUrl?.report?.ok
                ? ""
                : "text-gray-500"
            }
            htmlFor="metadataPrefix"
            value={t("Metadaten-Präfix*")}
          />
          <Select
            id="metadataPrefix"
            value={source?.oai?.metadataPrefix}
            disabled={!connected}
            color={getTextInputColor({
              ok:
                focus === "metadataPrefix"
                  ? undefined
                  : validator.children.source?.children.oaiMetadataPrefix
                      ?.report?.ok,
            })}
            onChange={(e) => {
              setSource({
                oai: { ...source?.oai, metadataPrefix: e.target.value },
              });
            }}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={() => setFocus("")}
          >
            <option value="">{t("Bitte auswählen")}</option>
            {(source?.oai?.metadataPrefixes || []).map((prefix) => (
              <option key={prefix} value={prefix}>
                {prefix}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {loadingConnection && <Spinner size="sm" />}
      {connected === true && (
        <span className="text-green-500 text-sm">
          {t("Die Verbindung zum Server wurde erfolgreich hergestellt.")}
        </span>
      )}
      {connected === false && (
        <span className="text-red-500 text-sm">
          {t("Die Verbindung zum Server konnte nicht hergestellt werden.")}
        </span>
      )}
      {connected ? (
        <>
          <h5 className="flex items-center font-semibold">
            <span>{t("Daten extrahieren*")}</span>
            {validator.children.source?.children.oaiTransferUrlFilters?.report
              ?.ok !== true && (
              <FiAlertCircle size={15} className="ml-2 text-red-500" />
            )}
          </h5>
          {(source?.oai?.transferUrlFilters ?? []).map((filter, index) => (
            <Alert
              key={index}
              color="gray"
              onDismiss={() =>
                setSource({
                  oai: {
                    ...source?.oai,
                    transferUrlFilters: (
                      source?.oai?.transferUrlFilters ?? []
                    ).filter((_, i) => i !== index),
                  },
                })
              }
            >
              <div className="flex flex-row space-x-2">
                <span className="font-semibold text-nowrap">
                  {t("Regulärer Ausdruck:")}
                </span>
                <p className="text-gray-500 mx-2 dcm-clamp-text">
                  {filter.regex}
                </p>
              </div>
              <div className="flex flex-row space-x-2">
                <span className="font-semibold text-nowrap">{t("Pfad:")}</span>
                <p className="text-gray-500 mx-2 dcm-clamp-text">
                  {filter.path ?? "-"}
                </p>
              </div>
            </Alert>
          ))}
          <div className="space-y-2">
            <Label htmlFor="filterRegex" value={t("Regulärer Ausdruck*")} />
            <TextInput
              id="filterRegex"
              value={filterRegex ?? ""}
              maxLength={textInputLimit.unlimited}
              onChange={(e) => setFilterRegex(e.target.value)}
              color={
                !validator.children.source?.children.oaiTransferUrlFilters
                  ?.report?.ok
                  ? getTextInputColor({
                      ok: focus === "filterRegex" ? undefined : filterRegexOk,
                    })
                  : undefined
              }
              onFocus={(e) => setFocus(e.target.id)}
              onBlur={(e) => {
                setFocus("");
                setFilterRegex(e.target.value.trim());
              }}
              placeholder={t(
                "bspw. (https:\\/\\/lzv\\.nrw\\/oai\\/files\\/[a-z0-9\\-]+)"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filterPath" value={t("Pfad (optional)")} />
            <TextInput
              id="filterPath"
              value={filterPath ?? ""}
              disabled={!filterRegex || filterRegex === ""}
              maxLength={textInputLimit.unlimited}
              onChange={(e) => setFilterPath(e.target.value)}
              onBlur={(e) => {
                setFilterPath(e.target.value.trim());
              }}
              placeholder={t(
                "nur in Teilbereich suchen (z.B. ./Pfad/zum/Element oder //Element)"
              )}
            />
          </div>
          <div>
            <Button
              disabled={!filterRegexOk || filterRegex?.trim() === ""}
              onClick={() => {
                setFilterRegex("");
                setFilterPath("");
                setSource({
                  oai: {
                    ...source?.oai,
                    transferUrlFilters: [
                      ...(source?.oai?.transferUrlFilters ?? []),
                      {
                        regex: filterRegex!,
                        path: filterPath || undefined,
                      },
                    ],
                  },
                });
              }}
            >
              {t("Suchmuster hinzufügen")}
            </Button>
          </div>
        </>
      ) : null}
    </>
  );
}

export type SourceFormChildren =
  | PluginSourceFormChildren
  | HotfolderSourceFormChildren
  | OAISourceFormChildren;
export type SourceFormValidator = Validator<SourceFormChildren>;

export function validateType(
  strict: boolean,
  type: TemplateType | undefined
): ValidationReport | undefined {
  if (type === undefined && !strict) return;
  if (type === undefined)
    return {
      ok: false,
      errors: ["Ein Quellsystem ist erforderlich."],
    };
  return { ok: true };
}

export default function SourceForm({
  name,
  active,
}: FormSectionComponentProps) {
  const [source, setSource] = useFormStore(
    useShallow((state) => [state.source, state.setSource])
  );
  const linkedJobs = useFormStore((state) => state.linkedJobs);
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
  // * form section
  useEffect(() => {
    if (!formVisited) return;
    if (validator.children?.source?.report?.ok === undefined && active) return;
    setCurrentValidationReport({
      children: {
        source: validator.children?.source?.validate(true),
      },
    });
    // eslint-disable-next-line
  }, [
    active,
    source?.plugin?.plugin,
    source?.plugin?.args,
    source?.hotfolder?.sourceId,
    source?.oai?.metadataPrefix,
    source?.oai?.url,
    source?.oai?.transferUrlFilters,
  ]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <div className="w-max space-y-2">
          <div className="flex flex-row space-x-2 items-center">
            <Label htmlFor="type" value={t("Verbindungsart*")} />
            {(linkedJobs ?? 0) > 0 && <FiLock />}
          </div>
          <Select
            id="type"
            disabled={(linkedJobs ?? 0) > 0}
            value={source?.type}
            color={getTextInputColor({
              ok:
                focus === "type" || source?.type !== undefined
                  ? undefined
                  : validator.children.source?.report?.ok,
            })}
            onChange={(e) => {
              setSource({
                ...source,
                type: (e.target.value === ""
                  ? undefined
                  : e.target.value) as TemplateType,
              });
              setCurrentValidationReport({
                children: {
                  source: { ok: undefined },
                },
              });
            }}
            onBlur={() => setFocus("")}
            onFocus={(e) => setFocus(e.target.id)}
          >
            <option value={""}>{t("Bitte auswählen")}</option>
            {devMode ? <option value={"plugin"}>{t("Plugin")}</option> : null}
            <option value={"hotfolder"}>{t("Hotfolder")}</option>
            <option value={"oai"}>{t("OAI-PMH")}</option>
          </Select>
        </div>
        {source?.type === "plugin" && <PluginSourceForm />}
        {source?.type === "hotfolder" && <HotfolderSourceForm />}
        {source?.type === "oai" && <OAISourceForm />}
      </div>
    </>
  );
}
