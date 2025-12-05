import { Button } from "flowbite-react";

import t from "../utils/translation";
import Modal from "./Modal";

interface ConfirmModalProps {
  show: boolean;
  title?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  dismissible?: boolean;
  onCancel?: () => void;
  onConfirm: () => void;
}
export default function ConfirmModal({
  show,
  title = t("Bestätigung"),
  children,
  confirmText = t("Bestätigen"),
  cancelText = t("Abbrechen"),
  dismissible = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal show={show} width="lg" onClose={onCancel} dismissible={dismissible}>
      <Modal.Header title={title} hideCloseButton />
      <Modal.Body className="py-4">{children}</Modal.Body>
      <Modal.Footer>
        <div className="w-full flex flex-row justify-between">
          {onCancel ? (
            <Button onClick={onCancel}>{cancelText}</Button>
          ) : (
            <div />
          )}
          <Button onClick={onConfirm}>{confirmText}</Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
