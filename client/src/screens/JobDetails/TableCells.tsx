import { Table } from "flowbite-react";

import t from "../../utils/translation";
import { reformatDatetime } from "../../utils/dateTime";
import { JobInfo, RecordInfo } from "../../types";
import { formatRecordStatus } from "./JobDetailsScreen";
import { devMode } from "../../App";

export interface TableCellProps {
  record?: RecordInfo;
  info?: JobInfo;
}

export function SourceSystemIdCell({ record }: TableCellProps) {
  if (!record) return <Table.HeadCell>{t("ID Quellsystem")}</Table.HeadCell>;
  return <Table.Cell>{record.originSystemId ?? "-"}</Table.Cell>;
}

export function ExternalIdCell({ record }: TableCellProps) {
  if (!record)
    return <Table.HeadCell>{t("External Identifier")}</Table.HeadCell>;
  return <Table.Cell>{record.externalId ?? "-"}</Table.Cell>;
}

export function SIPIdCell({ record }: TableCellProps) {
  if (!record) return <Table.HeadCell>{t("SIP ID")}</Table.HeadCell>;
  return <Table.Cell>{record.sipId ?? "-"}</Table.Cell>;
}

export function IEIdCell({ record }: TableCellProps) {
  if (!record) return <Table.HeadCell>{t("IE ID")}</Table.HeadCell>;
  return <Table.Cell>{record.ieId ?? "-"}</Table.Cell>;
}

export function ProcessedDatetimeCell({ record }: TableCellProps) {
  if (!record) return <Table.HeadCell>{t("Eingeliefert")}</Table.HeadCell>;
  return (
    <Table.Cell>
      {reformatDatetime(record.datetimeProcessed, { showTime: true, devMode })}
    </Table.Cell>
  );
}

export function StatusCell({ record }: TableCellProps) {
  if (!record) return <Table.HeadCell>{t("Status")}</Table.HeadCell>;
  return <Table.Cell>{t(formatRecordStatus(record))}</Table.Cell>;
}

export function TokenCell({ record }: TableCellProps) {
  if (!record) return <Table.HeadCell>{t("Token")}</Table.HeadCell>;
  return <Table.Cell className="w-96">{record.token ?? "-"}</Table.Cell>;
}
