import { useRef } from "react";
import { Label, TextInput, Select, Button } from "flowbite-react";

import t from "../../../utils/translation";
import Modal from "../../../components/Modal";
import Widget from "./DemoWidget";
import { NewWidgetModalProps } from "../types";
import { textInputLimit } from "../../../utils/forms";

export default function NewWidgetModal({
  show,
  onClose,
  onAddWidget,
}: NewWidgetModalProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLSelectElement>(null);

  return (
    <Modal
      show={show}
      width="2xl"
      height="sm"
      onClose={onClose}
      dismissible
    >
      <Modal.Header title={t("Neues Widget") + "-" + Widget.name} />
      <Modal.Body>
        <div className="space-y-2">
          <div className="space-y-2">
            <Label htmlFor="title" value={t("Titel")} />
            <TextInput
              id="title"
              ref={titleRef}
              maxLength={textInputLimit.md}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="style" value={t("Farbe")} />
            <Select id="style" ref={colorRef}>
              <option value="bg-white">{t("neutral")}</option>
              <option value="bg-red-500">{t("rot")}</option>
              <option value="bg-blue-500">{t("blau")}</option>
              <option value="bg-green-500">{t("grün")}</option>
            </Select>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="w-full flex flex-row space-x-2 justify-end">
          <Button onClick={onClose}>{t("Abbrechen")}</Button>
          <Button
            onClick={() => {
              onAddWidget?.({
                id: Widget.id,
                x: 0,
                y: 0,
                props: {
                  title: titleRef.current?.value,
                  color: colorRef.current?.value,
                },
              });
              onClose?.();
            }}
          >
            {t("Anlegen")}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
