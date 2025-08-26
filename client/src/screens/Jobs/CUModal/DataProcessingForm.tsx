import React, { useState, useEffect, useRef, useContext } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Alert,
  Button,
  Label,
  Select,
  Spinner,
  FileInput,
  TabItem,
  Tabs,
} from "flowbite-react";
import { FiTrash2, FiAlertCircle } from "react-icons/fi";

import t from "../../../utils/translation";
import {
  isValidRegex,
  ValidationReport,
  Validator,
} from "../../../utils/forms";
import { formatDateToISOString } from "../../../utils/dateTime";
import { compareObjects } from "../../../utils/util";
import { credentialsValue, devMode, host } from "../../../App";
import { FormSectionComponentProps } from "../../../components/SectionedForm";
import OperationsForm from "../../../components/OperationsForm/OperationsForm";
import {
  BaseOperation,
  ComplementOperation,
  FieldConfiguration,
  OverwriteExistingOperation,
  FindAndReplaceOperation,
  FindAndReplaceLiteralOperation,
  OperationType,
} from "../../../components/OperationsForm/types";
import { useFormStore } from "./store";
import { ErrorMessageContext } from "./Modal";

export type DataProcessingFormChildren =
  | "mapping"
  | "rightsOperations"
  | "sigPropOperations"
  | "preservationOperations";
export type DataProcessingFormValidator = Validator<DataProcessingFormChildren>;

export function validateMapping(
  strict: boolean,
  mapping: Mapping | undefined
): ValidationReport | undefined {
  if (!mapping && !strict) return;
  if (!mapping || !mapping.fileContents)
    return {
      ok: false,
      errors: [t("Ein Mapping-Skript zur Verarbeitung von Metadaten fehlt.")],
    };
  if (!mapping.type)
    return {
      ok: false,
      errors: [t("Unbekannter Typ des Mapping-Skripts.")],
    };
  return { ok: true };
}

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
            ({ regex }) => regex === "" || !isValidRegex(regex)
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

export function validateOperations(
  operations: BaseOperation[] | undefined,
  configuration: FieldConfiguration,
  name: string
): ValidationReport | undefined {
  if (operations === undefined) return;
  if (filterInvalidOperations(operations ?? [], configuration).length > 0)
    return {
      ok: false,
      errors: [t(`Unvollständige Eingabe in '${name}'-Aktionen.`)],
    };
  return { ok: undefined };
}

export interface DataProcessing {
  mapping?: Mapping;
  rightsOperations?: BaseOperation[];
  rightsFieldsConfiguration?: FieldConfiguration;
  sigPropOperations?: BaseOperation[];
  sigPropFieldsConfiguration?: FieldConfiguration;
  preservationOperations?: BaseOperation[];
  preservationFieldsConfiguration?: FieldConfiguration;
}

interface Mapping {
  type?: "plugin" | "xslt" | "python";
  file?: File;
  fileContents?: string;
  fileName?: string;
  datetimeUploaded?: string;
}

const ScriptAcceptedExtensions = ["py", "xsl", "xslt"];

export function DataProcessingForm({
  name,
  active,
}: FormSectionComponentProps) {
  const [dataProcessing, setDataProcessing] = useFormStore(
    useShallow((state) => [state.dataProcessing, state.setDataProcessing])
  );
  const template = useFormStore((state) => state.template);
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const errorHandler = useContext(ErrorMessageContext);

  const [formVisited, setFormVisited] = useState(active);

  // track visited
  useEffect(() => {
    if (active) setFormVisited(true);
  }, [active]);

  // form-configuration
  // * rights-metadata
  const [
    rightsFieldsConfigurationLoading,
    setRightsFieldsConfigurationLoading,
  ] = useState(false);
  // * sigProp-metadata
  const [
    sigPropFieldsConfigurationLoading,
    setSigPropFieldsConfigurationLoading,
  ] = useState(false);
  // * preservation-metadata
  const [
    preservationFieldsConfigurationLoading,
    setPreservationFieldsConfigurationLoading,
  ] = useState(false);

  // Metadata-tab values
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileDragging, setFileDragging] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

  // Rights-tab values
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
    errorHandler?.removeMessage("rights-fields-configuration-bad-response");
    errorHandler?.removeMessage("rights-fields-configuration-error");
    fetch(host + "/api/curator/job-config/configuration/rights", {
      credentials: credentialsValue,
    })
      .then((response) => {
        setRightsFieldsConfigurationLoading(false);
        if (!response.ok) {
          response.text().then((text) =>
            errorHandler?.pushMessage({
              id: `rights-fields-configuration-bad-response`,
              text: `${t(
                "Abfrage der Konfiguration für Rechteinformation fehlgeschlagen"
              )}: ${text}`,
            })
          );
          return;
        }
        response
          .json()
          .then((json) =>
            setDataProcessing({ rightsFieldsConfiguration: json })
          );
      })
      .catch((error) => {
        setRightsFieldsConfigurationLoading(false);
        errorHandler?.pushMessage({
          id: `rights-fields-configuration-error`,
          text: `${t(
            "Abfrage der Konfiguration für Rechteinformation fehlgeschlagen"
          )}: ${error.message}`,
        });
      });
    // eslint-disable-next-line
  }, [setDataProcessing]);

  // load sigPropFieldsConfiguration from API
  useEffect(() => {
    setSigPropFieldsConfigurationLoading(true);
    errorHandler?.removeMessage(
      "significant-properties-fields-configuration-bad-response"
    );
    errorHandler?.removeMessage(
      "significant-properties-fields-configuration-error"
    );
    fetch(
      host + "/api/curator/job-config/configuration/significant-properties",
      {
        credentials: credentialsValue,
      }
    )
      .then((response) => {
        setSigPropFieldsConfigurationLoading(false);
        if (!response.ok) {
          response.text().then((text) =>
            errorHandler?.pushMessage({
              id: `significant-properties-fields-configuration-bad-response`,
              text: `${t(
                "Abfrage der Konfiguration für signifikante Eigenschaften fehlgeschlagen"
              )}: ${text}`,
            })
          );
          return;
        }
        response
          .json()
          .then((json) =>
            setDataProcessing({ sigPropFieldsConfiguration: json })
          );
      })
      .catch((error) => {
        setSigPropFieldsConfigurationLoading(false);
        errorHandler?.pushMessage({
          id: `significant-properties-fields-configuration-error`,
          text: `${t(
            "Abfrage der Konfiguration für signifikante Eigenschaften fehlgeschlagen"
          )}: ${error.message}`,
        });
      });
    // eslint-disable-next-line
  }, [setDataProcessing]);

  // load preservationFieldsConfiguration from API
  useEffect(() => {
    setPreservationFieldsConfigurationLoading(true);
    errorHandler?.removeMessage(
      "preservation-fields-configuration-bad-response"
    );
    errorHandler?.removeMessage("preservation-fields-configuration-error");
    fetch(host + "/api/curator/job-config/configuration/preservation", {
      credentials: credentialsValue,
    })
      .then((response) => {
        setPreservationFieldsConfigurationLoading(false);
        if (!response.ok) {
          response.text().then((text) =>
            errorHandler?.pushMessage({
              id: `preservation-fields-configuration-bad-response`,
              text: `${t(
                "Abfrage der Konfiguration für Preservation fehlgeschlagen"
              )}: ${text}`,
            })
          );
          return;
        }
        response
          .json()
          .then((json) =>
            setDataProcessing({ preservationFieldsConfiguration: json })
          );
      })
      .catch((error) => {
        setPreservationFieldsConfigurationLoading(false);
        errorHandler?.pushMessage({
          id: `preservation-fields-configuration-error`,
          text: `${t(
            "Abfrage der Konfiguration für Preservation fehlgeschlagen"
          )}: ${error.message}`,
        });
      });
    // eslint-disable-next-line
  }, [setDataProcessing]);

  // update available options for rights-fields
  useEffect(() => {
    setRightsFields(
      Object.keys(dataProcessing?.rightsFieldsConfiguration ?? {})
        .filter((field) => !rightsFieldsOpen.includes(field))
        .map((field) => field)
    );
  }, [rightsFieldsOpen, dataProcessing?.rightsFieldsConfiguration]);

  // update available options for sigProp-fields
  useEffect(() => {
    setSigPropFields(
      Object.keys(dataProcessing?.sigPropFieldsConfiguration ?? {})
        .filter((field) => !sigPropFieldsOpen.includes(field))
        .map((field) => field)
    );
  }, [sigPropFieldsOpen, dataProcessing?.sigPropFieldsConfiguration]);

  // update available options for preservation-fields
  useEffect(() => {
    setPreservationFields(
      Object.keys(dataProcessing?.preservationFieldsConfiguration ?? {})
        .filter((field) => !preservationFieldsOpen.includes(field))
        .map((field) => field)
    );
  }, [preservationFieldsOpen, dataProcessing?.preservationFieldsConfiguration]);

  // trigger loading file on file input
  useEffect(() => {
    if (dataProcessing?.mapping?.file) {
      getFileAsString(dataProcessing?.mapping?.file, (content) =>
        setDataProcessing({
          mapping: {
            ...dataProcessing.mapping,
            fileContents: content,
            type: dataProcessing?.mapping?.file?.name.endsWith(".py")
              ? "python"
              : "xslt",
            fileName: dataProcessing?.mapping?.file?.name,
            datetimeUploaded: formatDateToISOString(new Date()),
          },
        })
      );
    }
    // eslint-disable-next-line
  }, [dataProcessing?.mapping?.file, setDataProcessing]);

  // handle validation
  // * mapping
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        dataProcessing: {
          children: {
            mapping:
              validator.children?.dataProcessing?.children?.mapping?.validate(
                true
              ),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [dataProcessing?.mapping]);
  // * rightsOperations
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        dataProcessing: {
          children: {
            rightsOperations:
              validator.children?.dataProcessing?.children?.rightsOperations?.validate(
                false
              ),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [
    dataProcessing?.rightsOperations,
    dataProcessing?.rightsFieldsConfiguration,
  ]);
  // * sigPropOperations
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        dataProcessing: {
          children: {
            sigPropOperations:
              validator.children?.dataProcessing?.children?.sigPropOperations?.validate(
                false
              ),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [
    dataProcessing?.sigPropOperations,
    dataProcessing?.sigPropFieldsConfiguration,
  ]);
  // * preservationOperations
  useEffect(() => {
    setCurrentValidationReport({
      children: {
        dataProcessing: {
          children: {
            preservationOperations:
              validator.children?.dataProcessing?.children?.preservationOperations?.validate(
                false
              ),
          },
        },
      },
    });
    // eslint-disable-next-line
  }, [
    dataProcessing?.preservationOperations,
    dataProcessing?.preservationFieldsConfiguration,
  ]);
  // * form section
  useEffect(() => {
    if (!formVisited) return;
    if (validator.children?.dataProcessing?.report?.ok === undefined && active)
      return;
    setCurrentValidationReport({
      children: {
        dataProcessing: validator.children?.dataProcessing?.validate(true),
      },
    });
    // eslint-disable-next-line
  }, [
    active,
    dataProcessing?.mapping,
    dataProcessing?.rightsOperations,
    dataProcessing?.sigPropOperations,
    dataProcessing?.preservationOperations,
  ]);

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
      };
      reader.readAsText(file, "utf-8");
    } else {
      setDataProcessing({ mapping: undefined });
      setFileError(
        t(
          `Nur die folgenden Dateiendungen sind erlaubt: ${ScriptAcceptedExtensions.join(
            ", "
          )}`
        )
      );
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
      setDataProcessing({ mapping: { file: files[0] } });
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
                  {validator.children.dataProcessing?.children?.mapping?.report
                    ?.ok === false && (
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
                      {dataProcessing?.mapping?.fileContents ? (
                        <div className="flex items-center break-all">
                          {dataProcessing?.mapping?.file?.name ??
                            dataProcessing?.mapping?.fileName ??
                            "<unknown>"}
                          <div
                            onClick={() => {
                              setDataProcessing({ mapping: undefined });
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
                              onChange={(e) =>
                                setDataProcessing({
                                  mapping: { file: e.target.files?.[0] },
                                })
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
                  {validator.children.dataProcessing?.children?.rightsOperations
                    ?.report?.ok === false && (
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
              {!rightsFieldsConfigurationLoading &&
                dataProcessing?.rightsFieldsConfiguration !== undefined && (
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
                                operations={
                                  dataProcessing?.rightsOperations?.filter(
                                    (operation) =>
                                      operation.targetField === field
                                  ) || []
                                }
                                configuration={{
                                  fieldConfiguration:
                                    dataProcessing?.rightsFieldsConfiguration ??
                                    {},
                                  availableOperationTypes: [
                                    ...[
                                      "complement",
                                      "overwriteExisting",
                                      "findAndReplaceLiteral",
                                    ],
                                    ...(devMode ? ["findAndReplace"] : []),
                                  ] as OperationType[],
                                }}
                                onChange={(value) => {
                                  if (typeof value === "function")
                                    value = value(
                                      dataProcessing?.rightsOperations ?? []
                                    );
                                  if (
                                    compareObjects(
                                      value,
                                      dataProcessing?.rightsOperations ?? [],
                                      true
                                    )
                                  )
                                    return;
                                  setDataProcessing({
                                    rightsOperations: value,
                                  });
                                }}
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
                                {dataProcessing?.rightsFieldsConfiguration?.[
                                  field
                                ]?.label ?? t(`Unbekanntes Feld '${field}'`)}
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
                  {validator.children.dataProcessing?.children
                    ?.sigPropOperations?.report?.ok === false && (
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
              {!sigPropFieldsConfigurationLoading &&
                dataProcessing?.sigPropFieldsConfiguration !== undefined && (
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
                                operations={
                                  dataProcessing?.sigPropOperations?.filter(
                                    (operation) =>
                                      operation.targetField === field
                                  ) || []
                                }
                                configuration={{
                                  fieldConfiguration:
                                    dataProcessing?.sigPropFieldsConfiguration ??
                                    {},
                                  availableOperationTypes: [
                                    ...[
                                      "complement",
                                      "overwriteExisting",
                                      "findAndReplaceLiteral",
                                    ],
                                    ...(devMode ? ["findAndReplace"] : []),
                                  ] as OperationType[],
                                }}
                                onChange={(value) => {
                                  if (typeof value === "function")
                                    value = value(
                                      dataProcessing?.sigPropOperations ?? []
                                    );
                                  if (
                                    compareObjects(
                                      value,
                                      dataProcessing?.sigPropOperations ?? [],
                                      true
                                    )
                                  )
                                    return;
                                  setDataProcessing({
                                    sigPropOperations: value,
                                  });
                                }}
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
                                {dataProcessing?.sigPropFieldsConfiguration?.[
                                  field
                                ]?.label ?? t(`Unbekanntes Feld '${field}'`)}
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
                  {validator.children.dataProcessing?.children
                    ?.preservationOperations?.report?.ok === false && (
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
              {!preservationFieldsConfigurationLoading &&
                dataProcessing?.preservationFieldsConfiguration !==
                  undefined && (
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
                                operations={
                                  dataProcessing?.preservationOperations?.filter(
                                    (operation) =>
                                      operation.targetField === field
                                  ) || []
                                }
                                configuration={{
                                  fieldConfiguration:
                                    dataProcessing?.preservationFieldsConfiguration ??
                                    {},
                                  availableOperationTypes: [
                                    ...[
                                      "complement",
                                      "overwriteExisting",
                                      "findAndReplaceLiteral",
                                    ],
                                    ...(devMode ? ["findAndReplace"] : []),
                                  ] as OperationType[],
                                }}
                                onChange={(value) => {
                                  if (typeof value === "function")
                                    value = value(
                                      dataProcessing?.preservationOperations ??
                                        []
                                    );
                                  if (
                                    compareObjects(
                                      value,
                                      dataProcessing?.preservationOperations ??
                                        [],
                                      true
                                    )
                                  )
                                    return;
                                  setDataProcessing({
                                    preservationOperations: value,
                                  });
                                }}
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
                                {dataProcessing
                                  ?.preservationFieldsConfiguration?.[field]
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
