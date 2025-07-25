import React, { useState, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Alert,
  Button,
  Label,
  Checkbox,
  TextInput,
  Textarea,
  Select,
  Spinner,
  FileInput,
  TabItem,
  Tabs,
  Table,
} from "flowbite-react";
import {
  FiTrash2,
  FiMinus,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
} from "react-icons/fi";

import t from "../../utils/translation";
import { OAITemplateInfo } from "../../types";
import { getTextInputColor, textInputLimit } from "../../utils/forms";
import { formatDateToISOString } from "../../utils/dateTime";
import useGlobalStore from "../../store";
import { credentialsValue, devMode, host } from "../../App";
import { FormSectionComponentProps } from "../../components/SectionedForm";
import Datepicker from "../../components/Datepicker";
import Timepicker from "../../components/Timepicker";
import OperationsForm from "../../components/OperationsForm/OperationsForm";
import {
  BaseOperation,
  ComplementOperation,
  FieldConfiguration,
  OverwriteExistingOperation,
  FindAndReplaceOperation,
  FindAndReplaceLiteralOperation,
  OperationType,
} from "../../components/OperationsForm/types";
import { useNewJobConfigFormStore } from "./NewJobConfigModal";
import { getStageTitle, StageOrder } from "./DebugJobModal";

export interface Description {
  name?: string;
  description?: string;
  contactInfo?: string;
}

export function DescriptionForm({
  name,
  setOk,
  active,
}: FormSectionComponentProps) {
  const [description, setDescription] = useNewJobConfigFormStore(
    useShallow((state) => [state.description, state.setDescription])
  );

  const [focus, setFocus] = useState("");
  // suffix 'Value' due to conflict with prop 'name'
  const [nameValue, setNameValue] = useState<string | null>(
    description?.name ?? null
  );
  const [nameOk, setNameOk] = useState<boolean | null>(null);
  // suffix 'Value' due to conflict with form-section name 'description'
  const [descriptionValue, setDescriptionValue] = useState<string | null>(
    description?.description ?? null
  );
  const [contactInfo, setContactInfo] = useState<string | null>(
    description?.contactInfo ?? null
  );

  // handle validation
  // * title
  useEffect(() => {
    setNameOk(nameValue === null ? null : nameValue !== "");
    // eslint-disable-next-line
  }, [nameValue]);
  // * form section
  useEffect(() => {
    if (nameOk !== null) setOk?.(nameOk ?? false);
    else setOk?.(null);
  }, [nameOk, setOk]);
  useEffect(() => {
    if (active) setOk?.(nameOk ?? false);
    // eslint-disable-next-line
  }, [active, setOk]);

  // update store when changing form data
  useEffect(() => {
    setDescription({
      ...(nameOk && nameValue ? { name: nameValue } : { name: undefined }),
    });
    // eslint-disable-next-line
  }, [nameValue, nameOk]);
  useEffect(() => {
    setDescription({
      ...(descriptionValue
        ? { description: descriptionValue }
        : { description: undefined }),
    });
    // eslint-disable-next-line
  }, [descriptionValue]);
  useEffect(() => {
    setDescription({
      ...(contactInfo ? { contactInfo } : { contactInfo: undefined }),
    });
    // eslint-disable-next-line
  }, [contactInfo]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <div className="space-y-2">
          <Label htmlFor="name" value={t("Titel*")} />
          <TextInput
            id="name"
            value={nameValue ?? ""}
            color={getTextInputColor({
              ok: focus === "name" ? null : nameOk,
            })}
            maxLength={textInputLimit.md}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={(e) => {
              setFocus("");
              setNameValue(e.target.value.trim());
            }}
            onFocus={(e) => setFocus(e.target.id)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" value={t("Beschreibung")} />
          <Textarea
            id="description"
            value={descriptionValue || ""}
            onChange={(e) => setDescriptionValue(e.target.value)}
            onBlur={(e) => setDescriptionValue(e.target.value.trim())}
            rows={4}
            className="resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="contactPerson"
            value={t("Ansprechpartner für Quellsystem")}
          />
          <TextInput
            id="contactPerson"
            value={contactInfo || ""}
            maxLength={textInputLimit.md}
            onChange={(e) => setContactInfo(e.target.value)}
            onBlur={(e) => setContactInfo(e.target.value.trim())}
          />
        </div>
      </div>
    </>
  );
}

export interface OaiDataSelection {
  sets?: string[];
  identifiers?: string[];
  from?: Date;
  until?: Date;
}

interface OAIdentifierInputProps {
  identifiers: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
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
                onChange((state) => state.filter((i) => i !== identifier))
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
              onChange((state) => [...state, identifier]);
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
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
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
                    onChange((prev) =>
                      prev.includes(e.target.value)
                        ? prev.filter((set) => set !== e.target.value)
                        : [...prev, e.target.value]
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
  setOk,
  active,
}: FormSectionComponentProps) {
  const [dataSelection, setDataSelection] = useNewJobConfigFormStore(
    useShallow((state) => [state.dataSelection, state.setDataSelection])
  );
  const template = useNewJobConfigFormStore((state) => state.template);
  const scheduling = useNewJobConfigFormStore((state) => state.scheduling);

  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"" | "sets" | "identifiers">(
    (dataSelection as OaiDataSelection)?.sets
      ? "sets"
      : (dataSelection as OaiDataSelection)?.identifiers
      ? "identifiers"
      : ""
  );

  const [from, setFrom] = useState<Date | null>(
    (dataSelection as OaiDataSelection)?.from ?? null
  );
  const [useUntil, setUseUntil] = useState(
    (dataSelection as OaiDataSelection)?.until !== undefined
  );
  const [until, setUntil] = useState<Date | null>(
    (dataSelection as OaiDataSelection)?.until ?? null
  );
  // sets and identifiers do not need validation, any input is ok
  const [sets, setSets] = useState<string[]>(
    (dataSelection as OaiDataSelection)?.sets ?? []
  );
  const [identifiers, setIdentifiers] = useState<string[]>(
    (dataSelection as OaiDataSelection)?.identifiers ?? []
  );

  // reset inputs when changing filter
  useEffect(() => {
    if (filterType !== "identifiers") setIdentifiers([]);
    if (filterType !== "sets") setSets([]);
    setDataSelection({
      sets: undefined,
      identifiers: undefined,
    });
    // eslint-disable-next-line
  }, [filterType]);

  // handle validation
  // * form section
  useEffect(() => {
    setOk?.(null);
  }, [setOk]);
  useEffect(() => {
    if (active) setOk?.(true);
  }, [active, setOk]);

  // update store when changing form data
  useEffect(() => {
    setDataSelection({
      ...(from !== null
        ? {
            from: new Date(from.getFullYear(), from.getMonth(), from.getDate()),
          }
        : { from: undefined }),
    });
    // eslint-disable-next-line
  }, [from]);
  useEffect(() => {
    setDataSelection({
      ...(until !== null
        ? {
            until: new Date(
              until.getFullYear(),
              until.getMonth(),
              until.getDate()
            ),
          }
        : { until: undefined }),
    });
    // eslint-disable-next-line
  }, [until]);
  useEffect(() => {
    if (filterType === "sets") setDataSelection({ sets });
    // eslint-disable-next-line
  }, [sets]);
  useEffect(() => {
    if (filterType === "identifiers") setDataSelection({ identifiers });
    // eslint-disable-next-line
  }, [identifiers]);

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
              date={from}
              disabled={
                useUntil ||
                filterType === "identifiers" ||
                ![undefined, "onetime"].includes(scheduling?.schedule)
              }
              onChange={setFrom}
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
                  date={until}
                  disabled={filterType === "identifiers"}
                  minDate={from ? from : undefined}
                  onChange={setUntil}
                />
              </div>
              <div className="col-span-5">
                <Button
                  color="light"
                  className="w-6 h-6 flex items-center rounded-full"
                  onClick={() => {
                    setUntil(null);
                    setUseUntil(false);
                  }}
                >
                  <FiMinus size={15} />
                </Button>
              </div>
            </>
          ) : (
            from !== null && (
              <div className="col-span-5">
                <Button
                  onClick={() => {
                    setUntil(null);
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
            <option disabled={from !== null} value="identifiers">
              {t("Identifier")}
            </option>
          )}
        </Select>
        <div className="full flex flex-row items-start space-x-2">
          {filterType === "sets" && (
            <OAISetInput
              sets={sets}
              url={(template?.additionalInformation as OAITemplateInfo).url}
              onError={setError}
              onChange={setSets}
            />
          )}
          {filterType === "identifiers" && (
            <OAIdentifierInput
              identifiers={identifiers}
              onChange={setIdentifiers}
            />
          )}
        </div>
      </div>
    </>
  );
}

export interface HotfolderDataSelection {
  subdirectory?: string;
}

export function HotfolderDataSelectionForm({
  name,
  setOk,
  active,
}: FormSectionComponentProps) {
  const [dataSelection, setDataSelection] = useNewJobConfigFormStore(
    useShallow((state) => [state.dataSelection, state.setDataSelection])
  );

  const [focus, setFocus] = useState("");
  const [subdirectory, setSubdirectory] = useState<string | null>(
    (dataSelection as HotfolderDataSelection)?.subdirectory ?? null
  );
  const [subdirectoryOk, setSubdirectoryOk] = useState<boolean | null>(null);

  // handle validation
  // * from
  useEffect(() => {
    setSubdirectoryOk(
      subdirectory === null
        ? null
        : // either empty or has valid pattern
          // TODO find suitable regex pattern
          subdirectory === "" || /^[^/][a-zA-Z0-9-_/ ]*$/.test(subdirectory)
    );
    // eslint-disable-next-line
  }, [subdirectory]);
  // * form section
  useEffect(() => {
    if (active) setOk?.(subdirectoryOk ?? true);
    // eslint-disable-next-line
  }, [active, setOk]);
  useEffect(() => {
    if (subdirectoryOk !== null) setOk?.(subdirectoryOk ?? true);
    else setOk?.(null);
  }, [subdirectoryOk, setOk]);

  // update store when changing form data
  useEffect(() => {
    setDataSelection({
      ...(subdirectoryOk && subdirectory !== null && subdirectory !== ""
        ? { subdirectory }
        : { subdirectory: undefined }),
    });
    // eslint-disable-next-line
  }, [subdirectory, subdirectoryOk]);

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
          value={subdirectory || ""}
          placeholder={t("pfad/zu/hotfolder")}
          maxLength={textInputLimit.unlimited}
          onChange={(e) => {
            setSubdirectory(e.target.value);
          }}
          color={getTextInputColor({
            ok:
              focus === "subdirectory" || subdirectory === ""
                ? null
                : subdirectoryOk,
          })}
          onFocus={(e) => setFocus(e.target.id)}
          onBlur={(e) => {
            setFocus("");
            setSubdirectory(e.target.value.trim());
          }}
        />
      </div>
    </>
  );
}

export function EmptyDataSelectionForm({
  name,
  setOk,
  active,
}: FormSectionComponentProps) {
  // handle validation
  // * form section
  useEffect(() => {
    setOk?.(null);
  }, [setOk]);
  useEffect(() => {
    if (active) setOk?.(true);
  }, [active, setOk]);

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

export interface DataProcessing {
  mapping?: Mapping;
  rightsOperations?: BaseOperation[];
  sigPropOperations?: BaseOperation[];
  preservationOperations?: BaseOperation[];
}

interface Mapping {
  type?: "plugin" | "xslt" | "python";
  fileContents?: string;
  fileName?: string;
  datetimeUploaded?: string;
}

const ScriptAcceptedExtensions = ["py", "xsl", "xslt"];

export function DataProcessingForm({
  name,
  setOk,
  active,
}: FormSectionComponentProps) {
  const [dataProcessing, setDataProcessing] = useNewJobConfigFormStore(
    useShallow((state) => [state.dataProcessing, state.setDataProcessing])
  );
  const template = useNewJobConfigFormStore((state) => state.template);

  // form-configuration
  // * rights-metadata
  const [rightsFieldsConfigurationError, setRightsFieldsConfigurationError] =
    useState<string | null>(null);
  const [
    rightsFieldsConfigurationLoading,
    setRightsFieldsConfigurationLoading,
  ] = useState(false);
  const [rightsFieldsConfiguration, setRightsFieldsConfiguration] =
    useState<FieldConfiguration>({});
  // * sigProp-metadata
  const [sigPropFieldsConfigurationError, setSigPropFieldsConfigurationError] =
    useState<string | null>(null);
  const [
    sigPropFieldsConfigurationLoading,
    setSigPropFieldsConfigurationLoading,
  ] = useState(false);
  const [sigPropFieldsConfiguration, setSigPropFieldsConfiguration] =
    useState<FieldConfiguration>({});
  // * preservation-metadata
  const [
    preservationFieldsConfigurationError,
    setPreservationFieldsConfigurationError,
  ] = useState<string | null>(null);
  const [
    preservationFieldsConfigurationLoading,
    setPreservationFieldsConfigurationLoading,
  ] = useState(false);
  const [preservationFieldsConfiguration, setPreservationFieldsConfiguration] =
    useState<FieldConfiguration>({});

  // Metadata-tab values
  const [file, setFile] = useState<File | null>(null);
  const [fileOk, setFileOk] = useState<boolean | null>(null);
  const [fileContents, setFileContents] = useState<string | null>(
    dataProcessing?.mapping?.fileContents ?? null
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileDragging, setFileDragging] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

  // Rights-tab values
  // * currently selected operations on rights-metadata
  const [rightsOperations, setRightsOperations] = useState<BaseOperation[]>(
    dataProcessing?.rightsOperations ?? []
  );
  const [rightsOperationsOk, setRightsOperationsOk] = useState<boolean | null>(
    null
  );
  // * currently available options for fields in dropdown
  const [rightsFields, setRightsFields] = useState<string[]>([]);
  // * currently open forms for rights-metadata operations
  const [rightsFieldsOpen, setRightsFieldsOpen] = useState<string[]>(
    dataProcessing?.rightsOperations?.map(
      (operation) => operation.targetField
    ) || []
  );
  // * currently selected field in dropdown
  const rightsFieldSelectRef = useRef<HTMLSelectElement>(null);

  // SigProp-tab values
  // * currently selected operations on significant properties-metadata
  const [sigPropOperations, setSigPropOperations] = useState<BaseOperation[]>(
    dataProcessing?.sigPropOperations ?? []
  );
  const [sigPropOperationsOk, setSigPropOperationsOk] = useState<
    boolean | null
  >(null);
  // * currently available options for fields in dropdown
  const [sigPropFields, setSigPropFields] = useState<string[]>([]);
  // * currently open forms for sigProp-metadata operations
  const [sigPropFieldsOpen, setSigPropFieldsOpen] = useState<string[]>(
    dataProcessing?.sigPropOperations?.map(
      (operation) => operation.targetField
    ) || []
  );
  // * currently selected field in dropdown
  const sigPropFieldSelectRef = useRef<HTMLSelectElement>(null);

  // Preservation-tab values
  // * currently selected operations on preservation-metadata
  const [preservationOperations, setPreservationOperations] = useState<
    BaseOperation[]
  >(dataProcessing?.preservationOperations ?? []);
  const [preservationOperationsOk, setPreservationOperationsOk] = useState<
    boolean | null
  >(null);
  // * currently available options for fields in dropdown
  const [preservationFields, setPreservationFields] = useState<string[]>([]);
  // * currently open forms for preservation-metadata operations
  const [preservationFieldsOpen, setPreservationFieldsOpen] = useState<
    string[]
  >(
    dataProcessing?.preservationOperations?.map(
      (operation) => operation.targetField
    ) || []
  );
  // * currently selected field in dropdown
  const preservationFieldSelectRef = useRef<HTMLSelectElement>(null);

  // load rightsFieldsConfiguration from API
  useEffect(() => {
    setRightsFieldsConfigurationLoading(true);
    fetch(host + "/api/curator/job-config/configuration/rights", {
      credentials: credentialsValue,
    })
      .then((response) => {
        setRightsFieldsConfigurationLoading(false);
        if (!response.ok) {
          setRightsFieldsConfigurationError(
            `Unable to load rights-configuration (${response.statusText}).`
          );
          return;
        }
        setRightsFieldsConfigurationError(null);
        response.json().then((json) => setRightsFieldsConfiguration(json));
      })
      .catch((error) => {
        setRightsFieldsConfigurationLoading(false);
        setRightsFieldsConfigurationError(error.message);
      });
  }, []);

  // load sigPropFieldsConfiguration from API
  useEffect(() => {
    setSigPropFieldsConfigurationLoading(true);
    fetch(
      host + "/api/curator/job-config/configuration/significant-properties",
      {
        credentials: credentialsValue,
      }
    )
      .then((response) => {
        setSigPropFieldsConfigurationLoading(false);
        if (!response.ok) {
          setSigPropFieldsConfigurationError(
            `Unable to load 'significant properties'-configuration (${response.statusText}).`
          );
          return;
        }
        setSigPropFieldsConfigurationError(null);
        response.json().then((json) => setSigPropFieldsConfiguration(json));
      })
      .catch((error) => {
        setSigPropFieldsConfigurationLoading(false);
        setSigPropFieldsConfigurationError(error.message);
      });
  }, []);

  // load preservationFieldsConfiguration from API
  useEffect(() => {
    setPreservationFieldsConfigurationLoading(true);
    fetch(host + "/api/curator/job-config/configuration/preservation", {
      credentials: credentialsValue,
    })
      .then((response) => {
        setPreservationFieldsConfigurationLoading(false);
        if (!response.ok) {
          setPreservationFieldsConfigurationError(
            `Unable to load 'preservation'-configuration (${response.statusText}).`
          );
          return;
        }
        setPreservationFieldsConfigurationError(null);
        response
          .json()
          .then((json) => setPreservationFieldsConfiguration(json));
      })
      .catch((error) => {
        setPreservationFieldsConfigurationLoading(false);
        setPreservationFieldsConfigurationError(error.message);
      });
  }, []);

  // update available options for rights-fields
  useEffect(() => {
    setRightsFields(
      Object.keys(rightsFieldsConfiguration)
        .filter((field) => !rightsFieldsOpen.includes(field))
        .map((field) => field)
    );
  }, [rightsFieldsOpen, rightsFieldsConfiguration]);

  // update available options for sigProp-fields
  useEffect(() => {
    setSigPropFields(
      Object.keys(sigPropFieldsConfiguration)
        .filter((field) => !sigPropFieldsOpen.includes(field))
        .map((field) => field)
    );
  }, [sigPropFieldsOpen, sigPropFieldsConfiguration]);

  // update available options for preservation-fields
  useEffect(() => {
    setPreservationFields(
      Object.keys(preservationFieldsConfiguration)
        .filter((field) => !preservationFieldsOpen.includes(field))
        .map((field) => field)
    );
  }, [preservationFieldsOpen, preservationFieldsConfiguration]);

  // trigger loading file on file input
  useEffect(() => {
    if (file) {
      getFileAsString(file, (content) => {
        setFileContents(content);
      });
    }
  }, [file]);

  // handle validation
  /**
   * Reusable filter for validation of operation-type inputs
   * @param operations array of operations
   * @returns filtered array of operations that are valid
   */
  function filterInvalidOperations(
    operations: BaseOperation[],
    configuration: FieldConfiguration
  ) {
    return operations.filter((operation) => {
      // consider unknown fields valid
      if (!configuration[operation.targetField]) return false;

      let itemsOk;
      switch (operation.type) {
        case "complement":
        case "overwriteExisting":
          return !(
            // currently either select-type of text-type but with value
            (
              configuration[operation.targetField].type === "select" ||
              ((configuration[operation.targetField].type === "text" ||
                configuration[operation.targetField].type === "textarea") &&
                (operation as ComplementOperation | OverwriteExistingOperation)
                  .value !== "")
            )
          );
        case "findAndReplace":
          // currently either select-type or all inputs should have a value
          itemsOk =
            configuration[operation.targetField].type === "select" ||
            (operation as FindAndReplaceOperation).items?.find(
              ({ value }) => value === ""
            ) === undefined;
          return !(
            itemsOk &&
            (operation as FindAndReplaceOperation).items?.find(
              ({ regex }) => regex === ""
            ) === undefined
          );
        case "findAndReplaceLiteral":
          // currently either select-type or all inputs should have a value
          itemsOk =
            configuration[operation.targetField].type === "select" ||
            (operation as FindAndReplaceLiteralOperation).items?.find(
              ({ value }) => value === ""
            ) === undefined;
          return !(
            itemsOk &&
            (operation as FindAndReplaceLiteralOperation).items?.find(
              ({ literal }) => literal === ""
            ) === undefined
          );
        default:
          // unknown operation
          return true;
      }
    });
  }
  // * file
  useEffect(() => {
    // skip validation if initialized from store
    if (!active && fileContents === dataProcessing?.mapping?.fileContents) {
      return;
    }
    if (fileOk === null) setFileOk(fileContents === null ? null : true);
    else setFileOk(fileContents !== null);
    // eslint-disable-next-line
  }, [active, fileContents]);
  // * rightsOperations (only indicate errors)
  useEffect(() => {
    setRightsOperationsOk(
      // filter out all valid fields
      filterInvalidOperations(rightsOperations, rightsFieldsConfiguration)
        .length === 0
        ? null
        : false
    );
  }, [rightsOperations, rightsFieldsConfiguration]);
  // * sigPropOperations (only indicate errors)
  useEffect(() => {
    setSigPropOperationsOk(
      // filter out all valid fields
      filterInvalidOperations(sigPropOperations, sigPropFieldsConfiguration)
        .length === 0
        ? null
        : false
    );
  }, [sigPropOperations, sigPropFieldsConfiguration]);
  // * preservation (only indicate errors)
  useEffect(() => {
    setPreservationOperationsOk(
      // filter out all valid fields
      filterInvalidOperations(
        preservationOperations,
        preservationFieldsConfiguration
      ).length === 0
        ? null
        : false
    );
  }, [preservationOperations, preservationFieldsConfiguration]);
  // * form section
  useEffect(() => {
    if (active)
      setOk?.(
        (fileOk ?? template?.type === "hotfolder") &&
          (rightsOperationsOk ?? true) &&
          (sigPropOperationsOk ?? true) &&
          (preservationOperationsOk ?? true)
      );
    // eslint-disable-next-line
  }, [active, setOk]);
  useEffect(() => {
    if (
      fileOk !== null ||
      rightsOperationsOk !== null ||
      sigPropOperationsOk !== null ||
      preservationOperationsOk !== null
    )
      setOk?.(
        (fileOk ?? true) &&
          (rightsOperationsOk ?? true) &&
          (sigPropOperationsOk ?? true) &&
          (preservationOperationsOk ?? true)
      );
    else setOk?.(null);
  }, [
    fileOk,
    rightsOperationsOk,
    sigPropOperationsOk,
    preservationOperationsOk,
    setOk,
  ]);

  // update store when changing form data
  useEffect(() => {
    // skip update if unchanged (e.g., initialized from store)
    if (fileContents === dataProcessing?.mapping?.fileContents) {
      return;
    }
    setDataProcessing(
      fileOk && file && fileContents !== null
        ? {
            mapping: {
              type: file.name.endsWith(".py") ? "python" : "xslt",
              fileContents,
              fileName: file.name,
              datetimeUploaded: formatDateToISOString(new Date()),
            },
          }
        : { mapping: undefined }
    );
    // eslint-disable-next-line
  }, [fileOk, fileContents]);
  useEffect(() => {
    setDataProcessing({
      ...(rightsOperations.length > 0
        ? { rightsOperations }
        : { rightsOperations: undefined }),
    });
    // eslint-disable-next-line
  }, [rightsOperations]);
  useEffect(() => {
    setDataProcessing({
      ...(sigPropOperations.length > 0
        ? { sigPropOperations }
        : { sigPropOperations: undefined }),
    });
    // eslint-disable-next-line
  }, [sigPropOperations]);
  useEffect(() => {
    setDataProcessing({
      ...(preservationOperations.length > 0
        ? { preservationOperations: preservationOperations }
        : { preservationOperations: undefined }),
    });
    // eslint-disable-next-line
  }, [preservationOperations]);

  /**
   * Reads the content of a given file and passes it as a string to
   * the provided callback. Also handles state updates for data, loading,
   * error, and validation.
   *
   * - Only file extensions in `ScriptAcceptedExtensions` are accepted.
   * - The file must not be empty.
   * - If the file is valid, it is read asynchronously as UTF-8 text.
   * - On success, the file content is passed to the `callback` function.
   * - On error, a localized error message is set via `setFileError`.
   *
   * @param file - The file object to be read.
   * @param callback - A function to call with the file content once
   * reading is complete.
   */
  function getFileAsString(file: File, callback: (content: string) => void) {
    if (!file) return;
    const extension = file.name.toLowerCase().split(".").pop();
    if (extension && ScriptAcceptedExtensions.includes(extension)) {
      setFileError(null);
      setFileLoading(true);

      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as string;
        if (!data.trim()) {
          setFileError(t("Die ausgewählte Datei ist leer."));
          setFileLoading(false);
          setFileOk(false);
          return;
        }
        callback(data);
        setFileLoading(false);
      };
      reader.onerror = () => {
        setFileError(
          t("Fehler beim Lesen der Datei: ") +
            (reader.error?.message ?? t("Unbekannter Fehler"))
        );
        setFileLoading(false);
        setFileOk(false);
      };
      reader.readAsText(file, "utf-8");
    } else {
      setFile(null);
      setFileError(
        t(
          `Nur die folgenden Dateiendungen sind erlaubt: ${ScriptAcceptedExtensions.join(
            ", "
          )}`
        )
      );
      setFileOk(false);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setFileDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setFileDragging(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();

    setFileDragging(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  }

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <p className="text-sm pb-4">
        {t(
          "In diesem Schritt können Sie die Daten ergänzen, gezielt ersetzen oder überschreiben."
        )}
      </p>
      <div className="flex flex-col space-y-2">
        <div className="overflow-x-auto p-2">
          <Tabs variant="fullWidth" tabIndex={2}>
            <TabItem
              active={template?.type !== "hotfolder"}
              disabled={template?.type === "hotfolder"}
              title={
                <>
                  <span>{t("Metadaten")}</span>
                  {fileOk === false && (
                    <div className="w-0">
                      <FiAlertCircle size={15} className="ml-2 text-red-500" />
                    </div>
                  )}
                </>
              }
            >
              <p className="text-xs pb-4">
                {t(
                  "Metadaten mithilfe einer manuell erstellten Scriptdatei (Python oder XSLT) mappen"
                )}
              </p>
              <div className="space-y-2">
                <h4 className="font-bold block">{t("Datei hochladen")}</h4>
                <div className="flex flex-col items-center">
                  <div className="flex w-full items-center py-2">
                    <div className="mr-2 text-sm">
                      {fileContents ? (
                        <div className="flex items-center break-all">
                          {file?.name ??
                            dataProcessing?.mapping?.fileName ??
                            "<unknown>"}
                          <div
                            onClick={() => {
                              setFile(null);
                              setFileContents(null);
                            }}
                            className="p-2 mr-2 rounded-full text-gray-500 hover:text-black hover:bg-gray-200 hover:cursor-pointer"
                          >
                            <FiTrash2 size="14" />
                          </div>
                        </div>
                      ) : null}
                      {fileLoading && <Spinner className="mx-2" size="xs" />}
                    </div>
                    {fileError ? (
                      <Alert
                        color="failure"
                        onDismiss={() => setFileError(null)}
                      >
                        {fileError}
                      </Alert>
                    ) : null}
                  </div>
                  <div className="flex w-full items-center justify-center">
                    <Label
                      htmlFor="dropzone-file"
                      className={`flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-600 ${
                        fileDragging ? "bg-sky-50" : ""
                      } hover:bg-gray-100`}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {!fileDragging && (
                        <>
                          <div className="flex items-center py-4">
                            <Button
                              as="label"
                              htmlFor="dropzone-file"
                              color="light"
                              className="font-semibold hover:cursor-pointer hover:bg-gray-50"
                            >
                              {t("Script hochladen")}
                            </Button>
                            <FileInput
                              id="dropzone-file"
                              accept=".py, .xsl, .xslt"
                              className="hidden"
                              onClick={() => setFileOk(fileOk || false)}
                              onChange={(e) =>
                                setFile(e.target.files?.[0] || null)
                              }
                            />
                            <div className="flex pl-4">
                              <p className="text-sm text-gray-500">
                                {t("oder hierhin ziehen")}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-center">
                            <p className="text-xs text-gray-500">
                              {t("Skripte müssen in UTF-8 codiert sein")}
                            </p>
                          </div>
                        </>
                      )}
                    </Label>
                  </div>
                </div>
              </div>
            </TabItem>
            <TabItem
              title={
                <>
                  <span>{t("Rechte")}</span>
                  {rightsOperationsOk === false && (
                    <div className="w-0">
                      <FiAlertCircle size={15} className="ml-2 text-red-500" />
                    </div>
                  )}
                </>
              }
              active={template?.type === "hotfolder"}
            >
              {rightsFieldsConfigurationLoading && (
                <div className="flex w-full justify-center">
                  <Spinner size="lg" />
                </div>
              )}
              {rightsFieldsConfigurationError && (
                <Alert
                  color="failure"
                  onDismiss={() => setRightsFieldsConfigurationError(null)}
                >
                  {rightsFieldsConfigurationError}
                </Alert>
              )}
              {!rightsFieldsConfigurationLoading &&
                !rightsFieldsConfigurationError && (
                  <>
                    <p className="text-sm pb-4">
                      {rightsFieldsOpen.length > 0 ? (
                        <span className="font-bold">
                          {t("Hinzugefügte Aktionen")}
                        </span>
                      ) : (
                        t("Noch keine Aktionen hinzugefügt.")
                      )}
                    </p>
                    <div className="space-y-2">
                      <div className="space-y-2 mb-4">
                        {Array.from(new Set(rightsFieldsOpen)).map(
                          (field) =>
                            rightsFieldsOpen.includes(field) && (
                              <OperationsForm
                                key={field}
                                targetField={field}
                                operations={rightsOperations?.filter(
                                  (operation) => operation.targetField === field
                                )}
                                configuration={{
                                  fieldConfiguration: rightsFieldsConfiguration,
                                  availableOperationTypes: [
                                    ...[
                                      "complement",
                                      "overwriteExisting",
                                      "findAndReplaceLiteral",
                                    ],
                                    ...(devMode ? ["findAndReplace"] : []),
                                  ] as OperationType[],
                                }}
                                onChange={setRightsOperations}
                                onClose={() =>
                                  setRightsFieldsOpen((prev) =>
                                    prev.filter((f) => f !== field)
                                  )
                                }
                              />
                            )
                        )}
                      </div>
                      {rightsFields.length > 0 && (
                        <div className="flex items-center">
                          <Select ref={rightsFieldSelectRef} className="mr-2">
                            {rightsFields.map((field) => (
                              <option key={field} value={field}>
                                {rightsFieldsConfiguration[field]?.label ??
                                  t(`Unbekanntes Feld '${field}'`)}
                              </option>
                            ))}
                          </Select>
                          <Button
                            disabled={
                              rightsFields.length === rightsFieldsOpen.length
                            }
                            onClick={() =>
                              setRightsFieldsOpen((prev) =>
                                rightsFieldSelectRef.current?.value ===
                                undefined
                                  ? prev
                                  : [
                                      ...prev,
                                      rightsFieldSelectRef.current?.value,
                                    ]
                              )
                            }
                          >
                            {t("Hinzufügen")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
            </TabItem>
            <TabItem
              title={
                <>
                  <span>{t("Signifikante Eigenschaften")}</span>
                  {sigPropOperationsOk === false && (
                    <div className="w-0">
                      <FiAlertCircle size={15} className="ml-2 text-red-500" />
                    </div>
                  )}
                </>
              }
            >
              {sigPropFieldsConfigurationLoading && (
                <div className="flex w-full justify-center">
                  <Spinner size="lg" />
                </div>
              )}
              {sigPropFieldsConfigurationError && (
                <Alert
                  color="failure"
                  onDismiss={() => setSigPropFieldsConfigurationError(null)}
                >
                  {sigPropFieldsConfigurationError}
                </Alert>
              )}
              {!sigPropFieldsConfigurationLoading &&
                !sigPropFieldsConfigurationError && (
                  <>
                    <p className="text-sm pb-4">
                      {sigPropFieldsOpen.length > 0 ? (
                        <span className="font-bold">
                          {t("Hinzugefügte Aktionen")}
                        </span>
                      ) : (
                        t("Noch keine Aktionen hinzugefügt.")
                      )}
                    </p>
                    <div className="space-y-2">
                      <div className="space-y-2 mb-4">
                        {Array.from(new Set(sigPropFieldsOpen)).map(
                          (field) =>
                            sigPropFieldsOpen.includes(field) && (
                              <OperationsForm
                                key={field}
                                targetField={field}
                                operations={sigPropOperations?.filter(
                                  (operation) => operation.targetField === field
                                )}
                                configuration={{
                                  fieldConfiguration:
                                    sigPropFieldsConfiguration,
                                  availableOperationTypes: [
                                    ...[
                                      "complement",
                                      "overwriteExisting",
                                      "findAndReplaceLiteral",
                                    ],
                                    ...(devMode ? ["findAndReplace"] : []),
                                  ] as OperationType[],
                                }}
                                onChange={setSigPropOperations}
                                onClose={() =>
                                  setSigPropFieldsOpen((prev) =>
                                    prev.filter((f) => f !== field)
                                  )
                                }
                              />
                            )
                        )}
                      </div>
                      {sigPropFields.length > 0 && (
                        <div className="flex items-center">
                          <Select ref={sigPropFieldSelectRef} className="mr-2">
                            {sigPropFields.map((field) => (
                              <option key={field} value={field}>
                                {sigPropFieldsConfiguration[field]?.label ??
                                  t(`Unbekanntes Feld '${field}'`)}
                              </option>
                            ))}
                          </Select>
                          <Button
                            disabled={
                              sigPropFields.length === sigPropFieldsOpen.length
                            }
                            onClick={() =>
                              setSigPropFieldsOpen((prev) =>
                                sigPropFieldSelectRef.current?.value ===
                                undefined
                                  ? prev
                                  : [
                                      ...prev,
                                      sigPropFieldSelectRef.current?.value,
                                    ]
                              )
                            }
                          >
                            {t("Hinzufügen")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
            </TabItem>
            <TabItem
              title={
                <>
                  <span>{t("Preservation Level")}</span>
                  {preservationOperationsOk === false && (
                    <div className="w-0">
                      <FiAlertCircle size={15} className="ml-2 text-red-500" />
                    </div>
                  )}
                </>
              }
            >
              {preservationFieldsConfigurationLoading && (
                <div className="flex w-full justify-center">
                  <Spinner size="lg" />
                </div>
              )}
              {preservationFieldsConfigurationError && (
                <Alert
                  color="failure"
                  onDismiss={() =>
                    setPreservationFieldsConfigurationError(null)
                  }
                >
                  {preservationFieldsConfigurationError}
                </Alert>
              )}
              {!preservationFieldsConfigurationLoading &&
                !preservationFieldsConfigurationError && (
                  <>
                    <p className="text-sm pb-4">
                      {preservationFieldsOpen.length > 0 ? (
                        <span className="font-bold">
                          {t("Hinzugefügte Aktionen")}
                        </span>
                      ) : (
                        t("Noch keine Aktionen hinzugefügt.")
                      )}
                    </p>
                    <div className="space-y-2">
                      <div className="space-y-2 mb-4">
                        {Array.from(new Set(preservationFieldsOpen)).map(
                          (field) =>
                            preservationFieldsOpen.includes(field) && (
                              <OperationsForm
                                key={field}
                                targetField={field}
                                operations={preservationOperations?.filter(
                                  (operation) => operation.targetField === field
                                )}
                                configuration={{
                                  fieldConfiguration:
                                    preservationFieldsConfiguration,
                                  availableOperationTypes: [
                                    ...[
                                      "complement",
                                      "overwriteExisting",
                                      "findAndReplaceLiteral",
                                    ],
                                    ...(devMode ? ["findAndReplace"] : []),
                                  ] as OperationType[],
                                }}
                                onChange={setPreservationOperations}
                                onClose={() =>
                                  setPreservationFieldsOpen((prev) =>
                                    prev.filter((f) => f !== field)
                                  )
                                }
                              />
                            )
                        )}
                      </div>
                      {preservationFields.length > 0 && (
                        <div className="flex items-center">
                          <Select
                            ref={preservationFieldSelectRef}
                            className="mr-2"
                          >
                            {preservationFields.map((field) => (
                              <option key={field} value={field}>
                                {preservationFieldsConfiguration[field]
                                  ?.label ?? t(`Unbekanntes Feld '${field}'`)}
                              </option>
                            ))}
                          </Select>
                          <Button
                            disabled={
                              preservationFields.length ===
                              preservationFieldsOpen.length
                            }
                            onClick={() =>
                              setPreservationFieldsOpen((prev) =>
                                preservationFieldSelectRef.current?.value ===
                                undefined
                                  ? prev
                                  : [
                                      ...prev,
                                      preservationFieldSelectRef.current?.value,
                                    ]
                              )
                            }
                          >
                            {t("Hinzufügen")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
            </TabItem>
          </Tabs>
        </div>
      </div>
    </>
  );
}

export type ScheduleType = "onetime" | "day" | "week" | "month";

export const ScheduleTypeInfo: Record<ScheduleType, { label: string }> = {
  onetime: { label: "einmalig" },
  day: { label: "täglich" },
  week: { label: "wöchentlich" },
  month: { label: "monatlich" },
};

export interface Scheduling {
  start?: Date;
  schedule?: ScheduleType;
}

export function SchedulingForm({
  name,
  setOk,
  active,
}: FormSectionComponentProps) {
  const [scheduling, setScheduling] = useNewJobConfigFormStore(
    useShallow((state) => [state.scheduling, state.setScheduling])
  );
  const template = useNewJobConfigFormStore((state) => state.template);
  const dataSelection = useNewJobConfigFormStore(
    (state) => state.dataSelection
  );

  const [date, setDate] = useState<Date | null>(scheduling?.start ?? null);
  const [time, setTime] = useState<Date | null>(scheduling?.start ?? null);
  const [schedule, setSchedule] = useState<ScheduleType>(
    scheduling?.schedule ?? "onetime"
  );

  // handle validation
  // basically empty since all inputs are controlled such that any input
  // is valid
  // * form section
  useEffect(() => {
    setOk?.(null);
  }, [setOk]);
  useEffect(() => {
    if (active) setOk?.(true);
  }, [active, setOk]);

  // update store when changing form data
  useEffect(() => {
    setScheduling({
      ...(date !== null && time !== null
        ? {
            start: new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate(),
              time.getHours(),
              time.getMinutes()
            ),
          }
        : { start: undefined }),
    });
    // eslint-disable-next-line
  }, [date, time]);
  useEffect(() => {
    setScheduling({
      ...(date !== null ? { schedule } : { schedule: undefined }),
    });
    // eslint-disable-next-line
  }, [schedule, date]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <div className="flex items-center space-y-2 space-x-2">
          <Label htmlFor="date2" value={t("Startdatum")} />
          <Datepicker
            className="flex flex-row w-1/2"
            date={date}
            minDate={new Date()}
            onChange={setDate}
          />
          <Timepicker time={time} onChange={setTime} disabled={!date} />
        </div>
        <div className="flex items-center space-y-2 space-x-2">
          <Label htmlFor="schedule" value={t("Wiederholungen")} />
          <Select
            id="schedule"
            disabled={!date}
            value={schedule}
            onChange={(e) => setSchedule(e.target.value as ScheduleType)}
          >
            {Object.entries(ScheduleTypeInfo).map(([id, info]) => (
              <option
                key={id}
                value={id}
                disabled={
                  template?.type === "oai" &&
                  (dataSelection as OaiDataSelection)?.from !== undefined
                }
              >
                {t(info.label)}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </>
  );
}

export function Summary({ name }: FormSectionComponentProps) {
  const [
    workspace,
    template,
    description,
    dataSelection,
    dataProcessing,
    scheduling,
    formatToConfig,
  ] = useNewJobConfigFormStore(
    useShallow((state) => [
      state.workspace,
      state.template,
      state.description,
      state.dataSelection,
      state.dataProcessing,
      state.scheduling,
      state.formatToConfig,
    ])
  );

  const [jobInfos, fetchJobInfo] = useGlobalStore(
    useShallow((state) => [state.job.jobInfos, state.job.fetchJobInfo])
  );
  const [testJobRunning, setTestJobRunning] = useState(false);
  const [testJobError, setTestJobError] = useState<string | null>(null);
  const [testJobToken, setTestJobToken] = useState<string | null>(null);

  const [rightsFieldsConfiguration, setRightsFieldsConfiguration] =
    useState<FieldConfiguration>({});
  const [sigPropFieldsConfiguration, setSigPropFieldsConfiguration] =
    useState<FieldConfiguration>({});
  const [preservationFieldsConfiguration, setPreservationFieldsConfiguration] =
    useState<FieldConfiguration>({});

  // load
  // * rightsFieldsConfiguration,
  // * sigPropFieldsConfiguration,
  // * preservationFieldsConfiguration
  // from API
  useEffect(() => {
    fetch(host + "/api/curator/job-config/configuration/rights", {
      credentials: credentialsValue,
    })
      .then((response) => {
        if (!response.ok) return;
        response.json().then((json) => setRightsFieldsConfiguration(json));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch(
      host + "/api/curator/job-config/configuration/significant-properties",
      { credentials: credentialsValue }
    )
      .then((response) => {
        if (!response.ok) return;
        response.json().then((json) => setSigPropFieldsConfiguration(json));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch(host + "/api/curator/job-config/configuration/preservation", {
      credentials: credentialsValue,
    })
      .then((response) => {
        if (!response.ok) return;
        response
          .json()
          .then((json) => setPreservationFieldsConfiguration(json));
      })
      .catch(() => {});
  }, []);

  // fetch jobInfo for test-job until done
  useEffect(() => {
    if (!testJobToken) return;
    const interval = setInterval(() => {
      if (
        ["aborted", "completed"].includes(jobInfos[testJobToken]?.status ?? "")
      ) {
        setTestJobRunning(false);
        clearInterval(interval);
      } else
        fetchJobInfo({
          token: testJobToken,
          useACL: true,
          forceReload: true,
          onSuccess: () => setTestJobError(null),
          onFail: (e) => {
            setTestJobError(e);
          },
        });
    }, 1000);
    return () => clearInterval(interval);
  }, [testJobToken, jobInfos, fetchJobInfo]);

  /**
   * Processes an array of operations into an array of unique targetFields.
   * @param operations array of operations
   * @returns array of target fields extracted from `operation`
   */
  function getOperationsTargetFields(operations: BaseOperation[]): string[] {
    return Array.from(
      new Set(operations.map((operation) => operation.targetField))
    ).sort();
  }

  /**
   * Formats string for given field and operations
   * @param operations operations to process
   * @param field targetField of interest
   * @param configuration field configuration containing human-readable label
   * @returns formatted string providing details on how many operations are
   *   defined for the target field
   */
  function formatOperationsByCount(
    operations: BaseOperation[],
    field: string,
    configuration: FieldConfiguration
  ) {
    // count by filtering for matching targetField
    const count = operations.filter(
      (operation) => operation.targetField === field
    ).length;
    // try to use configuration, fall back to identifier
    const name = configuration[field] ? configuration[field].label : field;
    // format output
    switch (count) {
      case 0:
        return "";
      case 1:
        return name + ": " + count + " " + t("Aktion hinzugefügt");
      default:
        return name + ": " + count + " " + t("Aktionen hinzugefügt");
    }
  }

  return (
    <div>
      <div className="flex justify-between">
        <h3 className="text-xl font-bold">{name}</h3>
        <Button
          disabled={testJobRunning}
          onClick={() => {
            if (template === undefined) {
              alert("Missing template.");
              return;
            }
            if (testJobRunning) {
              alert("Already running.");
              return;
            }
            setTestJobRunning(true);
            fetch(host + "/api/curator/job-test", {
              method: "POST",
              credentials: credentialsValue,
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...formatToConfig("draft", template),
                id: undefined,
              }),
            })
              .then((response) => {
                if (!response.ok) {
                  setTestJobRunning(false);
                  throw new Error(
                    `Unexpected response (${response.statusText}).`
                  );
                }
                return response.json();
              })
              .then((json) => {
                setTestJobToken(json.value);
              })
              .catch((error) => {
                setTestJobRunning(false);
                setTestJobError(error.message);
              });
          }}
        >
          {testJobRunning ? (
            <>
              <Spinner className="mr-3" size="sm" />
              {t("Job wird getestet ...")}
            </>
          ) : testJobToken ? (
            t("Job erneut testen")
          ) : (
            t("Job testen")
          )}
        </Button>
      </div>
      <div className="flex flex-col space-y-2 max-h-80 w-full">
        <div className="max-h-full max-w-full overflow-y-auto">
          {testJobToken !== null && jobInfos[testJobToken] !== undefined ? (
            <>
              <span className="font-semibold">{t("Testergebnis")}</span>
              <div className="text-sm break-all">
                {testJobError ? (
                  <Alert
                    color="failure"
                    onDismiss={() => setTestJobError(null)}
                  >
                    {testJobError}
                  </Alert>
                ) : null}
                <div className="table p-1 pb-2">
                  <Table hoverable>
                    <Table.Head>
                      <Table.HeadCell className="normal-case">
                        No.
                      </Table.HeadCell>
                      {template?.type !== "hotfolder" ? (
                        <Table.HeadCell>IE</Table.HeadCell>
                      ) : null}
                      <Table.HeadCell>IP</Table.HeadCell>
                      <Table.HeadCell>SIP</Table.HeadCell>
                      <Table.HeadCell className="min-w-44">
                        {t("Herunterladen")}
                      </Table.HeadCell>
                    </Table.Head>
                    <Table.Body className="divide-y">
                      {Object.entries(
                        jobInfos[testJobToken].report?.data?.records ?? {}
                      )
                        .sort(([a], [b]) => (a > b ? 1 : -1))
                        .map(([recordId, record], index) => (
                          <Table.Row key={recordId}>
                            <Table.Cell>{index + 1}</Table.Cell>
                            {template?.type !== "hotfolder" ? (
                              <Table.Cell>
                                {record?.stages?.import_ies?.completed ||
                                record?.completed ? (
                                  record?.stages?.import_ies?.success ? (
                                    <FiCheckCircle
                                      aria-label="valid"
                                      size={20}
                                      className="text-green-500"
                                    />
                                  ) : (
                                    <FiXCircle
                                      aria-label="invalid"
                                      size={20}
                                      className="text-red-500"
                                    />
                                  )
                                ) : (
                                  <Spinner size="sm" />
                                )}
                              </Table.Cell>
                            ) : null}
                            <Table.Cell>
                              {record?.stages?.prepare_ip?.completed ||
                              record?.completed ? (
                                record?.stages?.prepare_ip?.success ? (
                                  <FiCheckCircle
                                    aria-label="valid"
                                    size={20}
                                    className="text-green-500"
                                  />
                                ) : (
                                  <FiXCircle
                                    aria-label="invalid"
                                    size={20}
                                    className="text-red-500"
                                  />
                                )
                              ) : (
                                <Spinner size="sm" />
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              {record?.stages?.build_sip?.completed ||
                              record?.completed ? (
                                record?.stages?.build_sip?.success ? (
                                  <FiCheckCircle
                                    aria-label="valid"
                                    size={20}
                                    className="text-green-500"
                                  />
                                ) : (
                                  <FiXCircle
                                    aria-label="invalid"
                                    size={20}
                                    className="text-red-500"
                                  />
                                )
                              ) : (
                                <Spinner size="sm" />
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex flex-row space-x-1 grow">
                                <Button disabled size="xs">
                                  {t("Daten")}
                                </Button>
                                <Button
                                  size="xs"
                                  onClick={() => {
                                    if (devMode) {
                                      window.open(
                                        "data:application/json," +
                                          encodeURIComponent(
                                            JSON.stringify({
                                              ...record,
                                              recordId,
                                              stages: Object.fromEntries(
                                                Object.entries(
                                                  record.stages ?? {}
                                                ).map(([stageId, stage]) => [
                                                  // resolve logIds of stages
                                                  stageId,
                                                  {
                                                    ...stage,
                                                    report:
                                                      jobInfos[testJobToken]
                                                        .report?.children[
                                                        stage.logId ?? ""
                                                      ] ?? {},
                                                  },
                                                ])
                                              ),
                                            })
                                          ),
                                        "_blank"
                                      );
                                    } else {
                                      let result =
                                        "# " +
                                        t(
                                          "Zusammenfassung der Test-Resultate zum Identifier"
                                        ) +
                                        ` '${recordId}'\n\n`;
                                      for (const stageId of StageOrder) {
                                        if (
                                          !record.stages?.[stageId]?.completed
                                        )
                                          continue;
                                        result += `## ${getStageTitle(
                                          stageId
                                        )}\n\n`;
                                        const log =
                                          jobInfos[testJobToken].report
                                            ?.children[
                                            record.stages?.[stageId].logId ?? ""
                                          ]?.log ?? {};
                                        for (const [
                                          cat,
                                          catName,
                                        ] of Object.entries({
                                          INFO: t("Info"),
                                          WARNING: t("Warnungen"),
                                          ERROR: t("Fehler"),
                                        })) {
                                          if (!log[cat]) continue;
                                          result += `### ${catName}\n`;
                                          for (const message of log[cat]) {
                                            result += `* [${message.datetime}@${message.origin}] ${message.body}\n`;
                                          }
                                          result += "\n";
                                        }
                                      }
                                      window.open(
                                        URL.createObjectURL(
                                          new Blob([result], {
                                            type: "text/plain;charset=utf8",
                                          })
                                        ),
                                        "_blank"
                                      );
                                    }
                                  }}
                                >
                                  {t("Report")}
                                </Button>
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                    </Table.Body>
                  </Table>
                </div>
              </div>
            </>
          ) : null}
          <span className="font-semibold">{t("Arbeitsbereich")}</span>
          <p className="text-sm break-all">{workspace?.name ?? "-"}</p>
          <span className="font-semibold">{t("Template")}</span>
          <p className="text-sm break-all">{template?.name ?? "-"}</p>
          <span className="font-semibold">{t("Titel")}</span>
          <p className="text-sm break-all">{description?.name ?? "-"}</p>
          <span className="font-semibold">{t("Beschreibung")}</span>
          <p className="w-full text-sm break-all">
            {description?.description ?? "-"}
          </p>
          <span className="font-semibold">{t("Daten")}</span>
          <div>
            {template?.type === "oai" ? (
              <>
                <p className="text-sm break-all">
                  {t("Quellsystem") +
                    ": " +
                    (template?.additionalInformation as OAITemplateInfo).url}
                </p>
                {(dataSelection as OaiDataSelection)?.sets ? (
                  <p className="text-sm break-all">
                    {t("Ausgewählte Sets") +
                      ": " +
                      (dataSelection as OaiDataSelection)?.sets?.join(", ")}
                  </p>
                ) : (
                  ""
                )}
                {(dataSelection as OaiDataSelection)?.identifiers ? (
                  <p className="text-sm break-all">
                    {t("Ausgewählte Identifier") +
                      ": " +
                      (dataSelection as OaiDataSelection)?.identifiers?.join(
                        ", "
                      )}
                  </p>
                ) : (
                  ""
                )}
                <p className="text-sm">
                  {t("Ab") +
                    ": " +
                    ((dataSelection as OaiDataSelection)?.from?.toLocaleString(
                      "de-DE",
                      { year: "numeric", month: "2-digit", day: "2-digit" }
                    ) ?? "-")}
                </p>
                <p className="text-sm">
                  {t("Bis") +
                    ": " +
                    ((dataSelection as OaiDataSelection)?.until?.toLocaleString(
                      "de-DE",
                      { year: "numeric", month: "2-digit", day: "2-digit" }
                    ) ?? "-")}
                </p>
              </>
            ) : template?.type === "hotfolder" ? (
              <>
                <p className="text-sm break-all">
                  {t("Unterverzeichnis") +
                    ": " +
                    (dataSelection as HotfolderDataSelection)?.subdirectory}
                </p>
              </>
            ) : (
              "-"
            )}
          </div>
          <span className="font-semibold">{t("Metadaten")}</span>
          <p className="text-sm break-all">
            {dataProcessing?.mapping?.fileContents
              ? t("Skriptdatei") +
                (dataProcessing?.mapping?.fileName
                  ? ' "' + dataProcessing.mapping.fileName + '" '
                  : "") +
                t("hinzugefügt")
              : "-"}
          </p>
          <span className="font-semibold">{t("Rechte")}</span>
          <div>
            {dataProcessing?.rightsOperations
              ? getOperationsTargetFields(dataProcessing.rightsOperations)
                  .map((field) =>
                    formatOperationsByCount(
                      dataProcessing.rightsOperations ?? [],
                      field,
                      rightsFieldsConfiguration
                    )
                  )
                  .map((formattedField, index) =>
                    formattedField ? (
                      <p className="text-sm" key={index}>
                        {formattedField}
                      </p>
                    ) : (
                      ""
                    )
                  )
              : "-"}
          </div>
          <span className="font-semibold">
            {t("Signifikante Eigenschaften")}
          </span>
          <div>
            {dataProcessing?.sigPropOperations
              ? getOperationsTargetFields(dataProcessing.sigPropOperations)
                  .map((field) =>
                    formatOperationsByCount(
                      dataProcessing.sigPropOperations ?? [],
                      field,
                      sigPropFieldsConfiguration
                    )
                  )
                  .map((formattedField, index) =>
                    formattedField ? (
                      <p className="text-sm" key={index}>
                        {formattedField}
                      </p>
                    ) : (
                      ""
                    )
                  )
              : "-"}
          </div>
          <span className="font-semibold">{t("Preservation")}</span>
          <div>
            {dataProcessing?.preservationOperations
              ? getOperationsTargetFields(dataProcessing.preservationOperations)
                  .map((field) =>
                    formatOperationsByCount(
                      dataProcessing.preservationOperations ?? [],
                      field,
                      preservationFieldsConfiguration
                    )
                  )
                  .map((formattedField, index) =>
                    formattedField ? (
                      <p className="text-sm" key={index}>
                        {formattedField}
                      </p>
                    ) : (
                      ""
                    )
                  )
              : "-"}
          </div>
          <span className="font-semibold">{t("Zeitplan")}</span>
          <p className="text-sm break-all">
            {t("Startdatum") +
              ": " +
              (scheduling?.start
                ? new Date(scheduling.start).toLocaleString() +
                  ", " +
                  (scheduling?.schedule
                    ? ScheduleTypeInfo[scheduling?.schedule].label
                    : "-")
                : "-")}
          </p>
        </div>
      </div>
    </div>
  );
}
