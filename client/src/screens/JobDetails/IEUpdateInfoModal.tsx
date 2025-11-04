import t from "../../utils/translation";
import ConfirmModal from "../../components/ConfirmModal";
import { IEUpdateProcessInfo } from "./JobDetailsScreen";
import MessageBox from "../../components/MessageBox";

export interface ActivationInfo {
  secret: string;
  requiresActivation: boolean;
}

interface IEUpdateInfoModalProps {
  show: boolean;
  ieUpdateProcessInfo: IEUpdateProcessInfo;
  onConfirm: () => void;
}

export default function IEUpdateInfoModal({
  show,
  ieUpdateProcessInfo,
  onConfirm,
}: IEUpdateInfoModalProps) {
  return (
    <ConfirmModal
      show={show}
      title={t("Verarbeitung abgeschlossen")}
      onConfirm={onConfirm}
      confirmText={t("Schließen")}
    >
      <p>
        {ieUpdateProcessInfo.todo.length === 1
          ? t("1 IE wurde verarbeitet.")
          : t(`${ieUpdateProcessInfo.todo.length} IEs wurden verarbeitet.`)}
      </p>
      {ieUpdateProcessInfo.messages.length > 0 && (
        <>
          <p>{t("Dabei sind folgende Probleme aufgetreten:")}</p>
          <MessageBox messages={ieUpdateProcessInfo.messages}></MessageBox>
        </>
      )}
    </ConfirmModal>
  );
}
