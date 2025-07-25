import { useState, useEffect } from "react";
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
import { FiAlertCircle } from "react-icons/fi";

import t from "../../utils/translation";
import {
  HotfolderTemplateInfo,
  OAITemplateInfo,
  PluginTemplateInfo,
  Template,
} from "../../types";
import { getTextInputColor, textInputLimit } from "../../utils/forms";
import useGlobalStore from "../../store";
import { host, credentialsValue, devMode } from "../../App";
import { FormSectionComponentProps } from "../../components/SectionedForm";
import { useNewTemplateFormStore } from "./NewTemplateModal";

export type Source = Pick<Template, "type" | "additionalInformation">;

function TypeSelect() {
  const [source, setSource] = useNewTemplateFormStore(
    useShallow((state) => [state.source, state.setSource])
  );

  return (
    <div className="w-max space-y-2">
      <Label htmlFor="type" value={t("Verbindungsart*")} />
      <Select
        id="type"
        value={source?.type}
        onChange={(e) =>
          setSource({
            ...source,
            type: (e.target.value === ""
              ? undefined
              : e.target.value) as Source["type"],
            additionalInformation: undefined,
          })
        }
      >
        <option value={""}>{t("Bitte auswählen")}</option>
        {devMode ? <option value={"plugin"}>{t("Plugin")}</option> : null}
        <option value={"hotfolder"}>{t("Hotfolder")}</option>
        <option value={"oai"}>{t("OAI-PMH")}</option>
      </Select>
    </div>
  );
}

export function EmptySourceForm({ name }: FormSectionComponentProps) {
  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <TypeSelect />
      </div>
    </>
  );
}

export function PluginSourceForm({ name, setOk }: FormSectionComponentProps) {
  const [source, setSource] = useNewTemplateFormStore(
    useShallow((state) => [state.source, state.setSource])
  );

  const [focus, setFocus] = useState("");
  const [plugin, setPlugin] = useState<string | null>(
    (source?.additionalInformation as PluginTemplateInfo)?.plugin ?? null
  );
  const [pluginOk, setPluginOk] = useState<boolean | null>(null);
  const [args, setArgs] = useState<string | null>(
    JSON.stringify(
      (source?.additionalInformation as PluginTemplateInfo)?.args
    ) ?? null
  );
  const [argsOk, setArgsOk] = useState<boolean | null>(null);

  // handle validation
  // * plugin
  useEffect(() => {
    setPluginOk(plugin === null ? null : plugin.trim() !== "");
    // eslint-disable-next-line
  }, [plugin]);
  // * args
  useEffect(() => {
    if (args === null) {
      setArgsOk(null);
      return;
    }
    let argsJSON;
    try {
      argsJSON = JSON.parse(args);
    } catch {
      argsJSON = "";
    }
    setArgsOk(typeof argsJSON === "object" && !Array.isArray(argsJSON));
    // eslint-disable-next-line
  }, [args]);
  // * form section
  useEffect(() => {
    if (pluginOk !== null || argsOk !== null)
      setOk?.((pluginOk ?? false) && (argsOk ?? false));
    else setOk?.(null);
  }, [pluginOk, argsOk, setOk]);

  // update store when changing form data
  useEffect(() => {
    if (pluginOk && plugin !== null)
      setSource({
        ...source,
        additionalInformation: { ...source?.additionalInformation, plugin },
      });
    // eslint-disable-next-line
  }, [plugin, pluginOk]);
  useEffect(() => {
    if (args === null) return;
    let argsJSON;
    try {
      argsJSON = JSON.parse(args);
    } catch {
      argsJSON = null;
    }
    if (argsOk && argsJSON !== null)
      setSource({
        ...source,
        additionalInformation: {
          ...source?.additionalInformation,
          args: argsJSON,
        },
      });
    // eslint-disable-next-line
  }, [args, argsOk]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <TypeSelect />
        <div className="space-y-2">
          <Label htmlFor="plugin" value={t("Plugin Identifier")} />
          <TextInput
            id="plugin"
            value={plugin ?? ""}
            color={getTextInputColor({
              ok: focus === "plugin" ? null : pluginOk,
            })}
            maxLength={textInputLimit.md}
            onChange={(e) => setPlugin(e.target.value)}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={() => setFocus("")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="args" value={t("Plugin Optionen (JSON)")} />
          <Textarea
            id="args"
            className="resize-none"
            rows={4}
            value={args ?? ""}
            color={getTextInputColor({
              ok: focus === "args" ? null : argsOk,
            })}
            onChange={(e) => setArgs(e.target.value)}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={() => setFocus("")}
          />
        </div>
      </div>
    </>
  );
}

export function HotfolderSourceForm({
  name,
  setOk,
}: FormSectionComponentProps) {
  const [source, setSource] = useNewTemplateFormStore(
    useShallow((state) => [state.source, state.setSource])
  );
  const hotfolderSources = useGlobalStore(
    (state) => state.template.hotfolderImportSources
  );

  const [focus, setFocus] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(
    (source?.additionalInformation as HotfolderTemplateInfo)?.sourceId ?? null
  );
  const [sourceIdOk, setSourceIdOk] = useState<boolean | null>(null);

  // handle validation
  // * sourceId
  useEffect(() => {
    setSourceIdOk(sourceId === null ? null : sourceId !== "");
    // eslint-disable-next-line
  }, [sourceId]);
  // * form section
  useEffect(() => setOk?.(sourceIdOk), [sourceIdOk, setOk]);

  // update store when changing form data
  useEffect(() => {
    if (sourceIdOk && sourceId !== null)
      setSource({
        ...source,
        additionalInformation: { ...source?.additionalInformation, sourceId },
      });
    // eslint-disable-next-line
  }, [sourceId, sourceIdOk]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <TypeSelect />
        <div className="space-y-2">
          <Label htmlFor="sourceId" value={t("Ordner auswählen*")} />
          <Select
            id="sourceId"
            color={getTextInputColor({
              ok: focus === "sourceId" ? null : sourceIdOk,
            })}
            onChange={(e) => setSourceId(e.target.value)}
            onFocus={(e) => setFocus(e.target.id)}
            onBlur={() => setFocus("")}
          >
            <option value="">{t("Bitte auswählen")}</option>
            {Object.values(hotfolderSources)
              .sort((a, b) =>
                a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1
              )
              .map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
          </Select>
        </div>
      </div>
    </>
  );
}

export function OAISourceForm({ name, setOk }: FormSectionComponentProps) {
  const [source, setSource] = useNewTemplateFormStore(
    useShallow((state) => [state.source, state.setSource])
  );

  const [focus, setFocus] = useState("");
  const [url, setUrl] = useState<string | null>(
    (source?.additionalInformation as OAITemplateInfo)?.url ?? null
  );
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlOk, setUrlOk] = useState<boolean | null>(null);
  const [metadataPrefixes, setMetadataPrefixes] = useState<string[] | null>(
    null
  );
  const [metadataPrefix, setMetadataPrefix] = useState<string | null>(
    (source?.additionalInformation as OAITemplateInfo)?.metadataPrefix ?? null
  );
  const [metadataPrefixOk, setMetadataPrefixOk] = useState<boolean | null>(
    null
  );
  const [transferUrlFilters, setTransferUrlFilters] = useState<
    | {
        regex: string;
        path?: string;
      }[]
    | null
  >(
    (source?.additionalInformation as OAITemplateInfo)?.transferUrlFilters ??
      null
  );
  const [transferUrlFiltersOk, setTransferUrlFiltersOk] = useState<
    boolean | null
  >(null);
  const [filterRegex, setFilterRegex] = useState<string | null>(null);
  const [filterRegexOk, setFilterRegexOk] = useState<boolean | null>(null);
  const [filterPath, setFilterPath] = useState<string | null>(null);

  // collect metadata-prefixes for valid urls
  useEffect(() => {
    if (urlOk && url !== null)
      fetch(
        host +
          "/api/misc/oai/metadata-prefixes?" +
          new URLSearchParams({ url: encodeURI(url) }).toString(),
        { credentials: credentialsValue }
      )
        .then((response) => {
          if (!response.ok) {
            setMetadataPrefixes([]);
            return;
          }
          response.json().then((json) => setMetadataPrefixes(json));
        })
        .catch(() => setUrlOk(false));
    else setMetadataPrefixes(null);
    // eslint-disable-next-line
  }, [urlOk]);

  // reset metadataPrefix if urlOk changes to false
  useEffect(() => {
    if (!urlOk) {
      setMetadataPrefixes(null);
      setMetadataPrefix(null);
      setMetadataPrefixOk(null);
    }
    // eslint-disable-next-line
  }, [urlOk]);

  // handle validation
  // * url
  useEffect(() => {
    if (url === null) {
      setUrlOk(null);
      return;
    }
    setUrlLoading(true);
    fetch(
      host +
        "/api/misc/oai/identify?" +
        new URLSearchParams({ url: encodeURI(url) }).toString(),
      { credentials: credentialsValue }
    )
      .then((response) => {
        setUrlLoading(false);
        setUrlOk(response.ok);
      })
      .catch(() => {
        setUrlLoading(false);
        setUrlOk(false);
      });
    // eslint-disable-next-line
  }, [url]);
  // * metadataPrefix
  useEffect(() => {
    setMetadataPrefixOk(
      metadataPrefix === null && urlOk === null
        ? null
        : (metadataPrefixes || []).includes(metadataPrefix as string)
    );
    // eslint-disable-next-line
  }, [metadataPrefix, urlOk]);
  // * filterRegex
  useEffect(() => {
    setFilterRegexOk(filterRegex === null ? null : !!filterRegex);
  }, [filterRegex]);
  // * transferUrlFilters
  useEffect(() => {
    setTransferUrlFiltersOk(
      transferUrlFilters === null ? null : transferUrlFilters.length > 0
    );
  }, [transferUrlFilters]);
  // * form section
  useEffect(() => {
    if (urlOk !== null || metadataPrefixOk !== null)
      setOk?.(
        (urlOk ?? false) &&
          (metadataPrefixOk ?? false) &&
          (transferUrlFiltersOk ?? false)
      );
    else setOk?.(null);
  }, [urlOk, metadataPrefixOk, transferUrlFiltersOk, setOk]);

  // update store when changing form data
  useEffect(() => {
    if (urlOk && url !== null)
      setSource({
        ...source,
        additionalInformation: { ...source?.additionalInformation, url },
      });
    // eslint-disable-next-line
  }, [url, urlOk]);
  useEffect(() => {
    if (metadataPrefixOk && metadataPrefix !== null)
      setSource({
        ...source,
        additionalInformation: {
          ...source?.additionalInformation,
          metadataPrefix,
        },
      });
    // eslint-disable-next-line
  }, [metadataPrefix, metadataPrefixOk]);
  useEffect(() => {
    if (transferUrlFilters !== null)
      setSource({
        ...source,
        additionalInformation: {
          ...source?.additionalInformation,
          transferUrlFilters,
        },
      });
    // eslint-disable-next-line
  }, [transferUrlFilters]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <TypeSelect />
        <div className="flex flex-row space-x-2">
          <div className="space-y-2 grow">
            <Label htmlFor="url" value={t("Endpunkt*")} />
            <TextInput
              id="url"
              value={url ?? ""}
              color={getTextInputColor({
                ok: focus === "url" ? null : urlOk,
              })}
              maxLength={textInputLimit.md}
              onChange={(e) => setUrl(e.target.value.trim())}
              onFocus={(e) => setFocus(e.target.id)}
              onBlur={() => setFocus("")}
              placeholder="https://example.org/oai"
            />
          </div>
          <div className="space-y-2">
            <Label
              className={urlOk ? "" : "text-gray-500"}
              htmlFor="metadataPrefix"
              value={t("Metadaten-Präfix*")}
            />
            <Select
              id="metadataPrefix"
              disabled={!urlOk}
              color={getTextInputColor({
                ok: focus === "metadataPrefix" ? null : metadataPrefixOk,
              })}
              onChange={(e) => setMetadataPrefix(e.target.value)}
              onFocus={(e) => setFocus(e.target.id)}
              onBlur={() => setFocus("")}
            >
              <option value="">{t("Bitte auswählen")}</option>
              {(metadataPrefixes || []).map((prefix) => (
                <option key={prefix} value={prefix}>
                  {prefix}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {urlLoading && <Spinner size="sm" />}
        {urlOk ? (
          <>
            <span className="text-green-500 text-sm">
              {t("Die Verbindung zum Server wurde erfolgreich hergestellt.")}
            </span>
            <h5 className="flex items-center font-semibold">
              <span>{t("Daten extrahieren*")}</span>
              {transferUrlFiltersOk !== true && (
                <FiAlertCircle size={15} className="ml-2 text-red-500" />
              )}
            </h5>
            {transferUrlFilters?.map((filter, index) => (
              <Alert
                key={index}
                className="p-1.5 overflow-x-clip"
                color="gray"
                onDismiss={() =>
                  setTransferUrlFilters((state) =>
                    (state || []).filter((_, i) => i !== index)
                  )
                }
              >
                <span className="font-semibold mx-2">{filter.regex}</span>
                <span className="text-gray-500 mx-2">{filter.path}</span>
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
                  !transferUrlFiltersOk
                    ? getTextInputColor({
                        ok: focus === "filterRegex" ? null : filterRegexOk,
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
                disabled={!filterRegex || filterRegex === ""}
                onClick={() => {
                  setFilterRegex("");
                  setFilterPath("");
                  setTransferUrlFilters((state) => [
                    ...(state || []),
                    {
                      regex: filterRegex!,
                      path: filterPath || undefined,
                    },
                  ]);
                }}
              >
                {t("Suchmuster hinzufügen")}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
