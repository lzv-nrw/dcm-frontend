import { Button } from "flowbite-react";

import t from "../utils/translation";
import Modal from "./Modal";

interface ConfirmModalProps {
  show: boolean;
  title?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}
export default function ConfirmModal({
  show,
  title = t("Bestätigung"),
  children,
  confirmText = t("Bestätigen"),
  cancelText = t("Abbrechen"),
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal show={show} width="lg" onClose={onCancel}>
      <Modal.Header title={title} hideCloseButton/>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <div className="w-full flex flex-row justify-between">
          <Button onClick={onCancel}>{cancelText}</Button>
          <Button onClick={onConfirm}>{confirmText}</Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
