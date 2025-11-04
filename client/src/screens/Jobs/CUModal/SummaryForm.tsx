import { useState, useEffect, useContext } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button, Spinner, Table } from "flowbite-react";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";

import t from "../../../utils/translation";
import { genericSort } from "../../../utils/genericSort";
import { OAITemplateInfo } from "../../../types";
import { getDownloadTargetsFromReport } from "../../../utils/util";
import useGlobalStore from "../../../store";
import { credentialsValue, devMode, host } from "../../../App";
import { FormSectionComponentProps } from "../../../components/SectionedForm";
import {
  BaseOperation,
  FieldConfiguration,
} from "../../../components/OperationsForm/types";
import { useFormStore } from "./store";
import { getStageTitle, StageOrder } from "../MonitorJobModal";
import { HotfolderDataSelection, OaiDataSelection } from "./DataSelectionForm";
import { combineDateAndTime, ScheduleTypeInfo } from "./SchedulingForm";
import { ErrorMessageContext } from "./Modal";

export function SummaryForm({ name }: FormSectionComponentProps) {
  const [
    workspace,
    template,
    description,
    dataSelection,
    dataProcessing,
    scheduling,
    formatToConfig,
  ] = useFormStore(
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

  const errorHandler = useContext(ErrorMessageContext);

  const [jobInfos, fetchJobInfo] = useGlobalStore(
    useShallow((state) => [state.job.jobInfos, state.job.fetchJobInfo])
  );
  const [testJobRunning, setTestJobRunning] = useState(false);
  const [testJobToken, setTestJobToken] = useState<string | null>(null);
  const [bundleJobRunning, setBundleJobRunning] = useState(false);
  const [bundleJobToken, setBundleJobToken] = useState<string | null>(null);
  const [bundleJobRecordId, setBundleJobRecordId] = useState<string | null>(
    null
  );

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
          onSuccess: () => errorHandler?.removeMessage("test-job-info-failed"),
          onFail: (e) =>
            errorHandler?.pushMessage({
              id: `test-job-info-failed`,
              text: e,
            }),
        });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [testJobToken, jobInfos, fetchJobInfo]);

  // fetch report for bundle-job until done
  useEffect(() => {
    if (!bundleJobToken) return;
    const interval = setInterval(() => {
      fetch(
        host +
          "/api/curator/job/artifacts/report?" +
          new URLSearchParams({ token: bundleJobToken }).toString(),
        {
          method: "GET",
          credentials: credentialsValue,
        }
      )
        .then((response) => {
          if (!response.ok) {
            // 503 is expected while job is still running
            if (response.status !== 503) {
              setBundleJobRunning(false);
              setBundleJobToken(null);
              setBundleJobRecordId(null);
              clearInterval(interval);
              response.text().then((text) =>
                errorHandler?.pushMessage({
                  id: "bundle-report-bad-response",
                  text: `${t(
                    "Abfrage des Reports zum Bauen eines Archivs von Job-Artefakten fehlgeschlagen"
                  )}: ${text}`,
                })
              );
            }
            return;
          }
          clearInterval(interval);
          response.json().then((json) => {
            if (json?.data?.bundle?.id)
              window.open(
                host +
                  "/api/curator/job/artifacts/bundle?" +
                  new URLSearchParams({
                    id: json.data.bundle.id,
                  }).toString(),
                "_blank"
              );
            setBundleJobRunning(false);
            setBundleJobToken(null);
            setBundleJobRecordId(null);
            if (json?.data?.success ?? false) return;
            for (const msg of json?.log?.ERROR ?? []) {
              errorHandler?.pushMessage({
                id: `bundling-job-not-successful-${msg.datetime}`,
                text: `${t(
                  "Fehler beim Bauen eines Archivs von Job-Artefakten"
                )}: ${msg.body}`,
              });
            }
          });
        })
        .catch((error) => {
          setBundleJobRunning(false);
          setBundleJobToken(null);
          setBundleJobRecordId(null);
          clearInterval(interval);
          errorHandler?.pushMessage({
            id: `bundle-report-error`,
            text: `${t(
              "Abfrage des Reports zum Bauen eines Archivs von Job-Artefakten fehlgeschlagen"
            )}: ${error.message}`,
          });
        });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [bundleJobToken]);

  /**
   * Processes an array of operations into an array of unique targetFields.
   * @param operations array of operations
   * @returns array of target fields extracted from `operation`
   */
  function getOperationsTargetFields(operations: BaseOperation[]): string[] {
    return Array.from(
      new Set(operations.map((operation) => operation.targetField))
    ).sort(genericSort<string>({ getValue: (f) => f ?? "" }));
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
      <div className="flex justify-end sticky top-0 px-6">
        <Button
          disabled={testJobRunning || bundleJobRunning}
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
            errorHandler?.removeMessage("test-job-submission-bad-response");
            errorHandler?.removeMessage("test-job-submission-error");
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
                  response.text().then((text) =>
                    errorHandler?.pushMessage({
                      id: "test-job-submission-bad-response",
                      text: `${t(
                        "Absenden eines Test-Jobs fehlgeschlagen"
                      )}: ${text}`,
                    })
                  );
                  return;
                }
                document
                  .getElementById("sectionedFormBody")
                  ?.scroll({ top: 0, left: 0 });
                response.json().then((json) => {
                  setTestJobToken(json.value);
                });
              })
              .catch((error) => {
                setTestJobRunning(false);
                errorHandler?.pushMessage({
                  id: `test-job-submission-error`,
                  text: `${t("Absenden eines Test-Jobs fehlgeschlagen")}: ${
                    error.message
                  }`,
                });
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

      <div className="flex justify-between">
        <h3 className="text-xl font-bold">{name}</h3>
      </div>
      <div className="flex flex-col space-y-2 max-h-80 w-full">
        <div className="max-h-full max-w-full">
          {testJobToken !== null && jobInfos[testJobToken] !== undefined ? (
            <>
              <span className="font-semibold">{t("Testergebnis")}</span>
              <div className="text-sm break-all">
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
                        .sort(
                          genericSort<[string, any]>({
                            getValue: ([key]) => key,
                          })
                        )
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
                                <Button
                                  disabled={
                                    bundleJobRunning ||
                                    !(
                                      record?.stages?.import_ies?.success ??
                                      record?.stages?.import_ips?.success ??
                                      false
                                    )
                                  }
                                  size="xs"
                                  onClick={() => {
                                    const targets =
                                      getDownloadTargetsFromReport(
                                        recordId,
                                        jobInfos[testJobToken]?.report
                                      );

                                    // send request
                                    setBundleJobRunning(true);
                                    setBundleJobRecordId(recordId);
                                    fetch(
                                      host +
                                        "/api/curator/job/artifacts/bundle",
                                      {
                                        method: "POST",
                                        credentials: credentialsValue,
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          bundle: {
                                            targets: targets.map((target) => ({
                                              path: target,
                                            })),
                                          },
                                        }),
                                      }
                                    )
                                      .then((response) => {
                                        if (!response.ok) {
                                          setBundleJobRunning(false);
                                          setBundleJobRecordId(null);
                                          response.text().then((text) =>
                                            errorHandler?.pushMessage({
                                              id: "bundle-submission-bad-response",
                                              text: `${t(
                                                "Absenden eines Jobs zum Bauen eines Archivs von Job-Artefakten fehlgeschlagen"
                                              )}: ${text}`,
                                            })
                                          );
                                          return;
                                        }
                                        response.json().then((json) => {
                                          setBundleJobToken(json.value);
                                        });
                                      })
                                      .catch((error) => {
                                        setBundleJobRunning(false);
                                        setBundleJobRecordId(null);
                                        errorHandler?.pushMessage({
                                          id: `bundle-submission-error`,
                                          text: `${t(
                                            "Absenden eines Jobs zum Bauen eines Archivs von Job-Artefakten fehlgeschlagen"
                                          )}: ${error.message}`,
                                        });
                                      });
                                  }}
                                >
                                  {recordId === bundleJobRecordId ? (
                                    <Spinner size="sm" />
                                  ) : (
                                    t("Daten")
                                  )}
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
                                              recordId: recordId,
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
                                      for (const stageId of [
                                        "import_ips",
                                        "import_ies",
                                        ...StageOrder,
                                      ]) {
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
                    (template?.additionalInformation as OAITemplateInfo)?.url}
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
                    ((dataSelection as HotfolderDataSelection)?.path ?? "-")}
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
                      dataProcessing.rightsFieldsConfiguration ?? {}
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
                      dataProcessing.sigPropFieldsConfiguration ?? {}
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
                      dataProcessing.preservationFieldsConfiguration ?? {}
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
              (scheduling?.date && scheduling?.time
                ? combineDateAndTime(
                    scheduling?.date,
                    scheduling?.time
                  )?.toLocaleString() +
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
