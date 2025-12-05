import { useState } from "react";
import { Badge, Button, Spinner, Table } from "flowbite-react";

import t from "../../utils/translation";
import { reformatDatetime } from "../../utils/dateTime";
import { IE } from "../../types";
import { devMode } from "../../App";
import { formatRecordStatus } from "./JobDetailsScreen";
import DownloadArtifactsModal from "./DownloadArtifactsModal";
import DownloadReportsModal from "./DownloadReportsModal";

export interface TableCellProps {
  ie?: IE;
  index?: number;
}

export function SourceSystemIdCell({ ie }: TableCellProps) {
  if (!ie) return <Table.HeadCell>{t("ID Quellsystem")}</Table.HeadCell>;
  return <Table.Cell>{ie.originSystemId ?? "-"}</Table.Cell>;
}

export function ExternalIdCell({ ie }: TableCellProps) {
  if (!ie) return <Table.HeadCell>{t("External Identifier")}</Table.HeadCell>;
  return <Table.Cell>{ie.externalId ?? "-"}</Table.Cell>;
}

export function SIPIdCell({ ie }: TableCellProps) {
  if (!ie) return <Table.HeadCell>{t("SIP ID")}</Table.HeadCell>;
  return (
    <Table.Cell>
      {ie.records?.[ie.latestRecordId ?? ""].archiveSipId ?? "-"}
    </Table.Cell>
  );
}

export function IEIdCell({ ie }: TableCellProps) {
  if (!ie) return <Table.HeadCell>{t("IE ID")}</Table.HeadCell>;
  return (
    <Table.Cell>
      {ie.records?.[ie.latestRecordId ?? ""].archiveIeId ?? "-"}
    </Table.Cell>
  );
}

export function ProcessedDatetimeCell({ ie }: TableCellProps) {
  // FIXME: this should have been "Eingeliefert" which needs the associated report
  if (!ie) return <Table.HeadCell>{t("Letzte Änderung")}</Table.HeadCell>;
  return (
    <Table.Cell>
      {reformatDatetime(ie.records?.[ie.latestRecordId ?? ""].datetimeChanged, {
        showTime: true,
        devMode,
      })}
    </Table.Cell>
  );
}

export function PreservationLevelCell({ ie }: TableCellProps) {
  if (!ie)
    return (
      <Table.HeadCell className="max-w-44">
        {t("Preservation Level")}
      </Table.HeadCell>
    );
  return (
    <Table.Cell>
      {ie?.bagInfoMetadata?.["Preservation Level"]?.[0] ?? "-"}
    </Table.Cell>
  );
}

export function StatusCell({ ie }: TableCellProps) {
  if (!ie)
    return <Table.HeadCell className="max-w-44">{t("Status")}</Table.HeadCell>;

  const record = ie.records?.[ie.latestRecordId ?? ""];
  return (
    <Table.Cell className="max-w-44">
      <div className="flex flex-col gap-1 items-start justify-center">
        <span>{t(formatRecordStatus(record))}</span>
        {record?.ignored && (
          <Badge
            className="hover:cursor-help select-none w-fit text-nowrap"
            color="gray"
            size="xs"
            title={t(
              "wird bis zur nächsten Aktualisierung im Quellsystem ignoriert"
            )}
          >
            {t("verworfen")}
          </Badge>
        )}
        {record?.bitstream && (
          <Badge
            className="hover:cursor-help select-none w-fit text-nowrap"
            color="warning"
            size="xs"
            title={
              record.status === "in-process"
                ? t("Weiterverarbeitung als Bitstream geplant")
                : t("als Bitstream verarbeitet")
            }
          >
            {t("Bitstream")}
          </Badge>
        )}
        {record?.skipObjectValidation && (
          <Badge
            className="hover:cursor-help select-none w-fit text-nowrap"
            color="warning"
            size="xs"
            title={
              record.status === "in-process"
                ? t("Weiterverarbeitung ohne Objektvalidierung geplant")
                : t("ohne Objektvalidierung verarbeitet")
            }
          >
            {t("ohne OV")}
          </Badge>
        )}
      </div>
    </Table.Cell>
  );
}

export function TokenCell({ ie }: TableCellProps) {
  if (!ie) return <Table.HeadCell>{t("Token")}</Table.HeadCell>;
  return (
    <Table.Cell className="w-96">
      {ie.records?.[ie.latestRecordId ?? ""].jobToken ?? "-"}
    </Table.Cell>
  );
}

export function DownloadCell({ ie, index }: TableCellProps) {
  const [showDownloadArtifactModal, setShowDownloadArtifactModal] =
    useState(false);
  const [showDownloadReportModal, setShowDownloadReportModal] = useState(false);

  if (!ie) return <Table.HeadCell>{t("Download")}</Table.HeadCell>;
  return (
    <Table.Cell>
      <div className="flex flex-row space-x-1">
        <Button
          size="xs"
          disabled={showDownloadReportModal}
          onClick={() => setShowDownloadReportModal(true)}
        >
          {t("Report")}
        </Button>
        {showDownloadReportModal && (
          <DownloadReportsModal
            show={showDownloadReportModal}
            ie={ie}
            onClose={() => setShowDownloadReportModal(false)}
          />
        )}
        {ie.records?.[ie.latestRecordId ?? ""] ? (
          <>
            <Button
              size="xs"
              disabled={showDownloadArtifactModal}
              onClick={() => setShowDownloadArtifactModal(true)}
            >
              {showDownloadArtifactModal ? <Spinner size="sm" /> : t("Dateien")}
            </Button>
            <DownloadArtifactsModal
              show={showDownloadArtifactModal}
              record={ie.records?.[ie.latestRecordId ?? ""]}
              downloadName={
                index === undefined ? undefined : `dcm-artifact-${index}.zip`
              }
              onClose={() => setShowDownloadArtifactModal(false)}
            />
          </>
        ) : null}
      </div>
    </Table.Cell>
  );
}
