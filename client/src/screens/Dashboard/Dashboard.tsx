import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ToggleSwitch, Dropdown, Alert } from "flowbite-react";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import { credentialsValue, host } from "../../App";
import Widgets, { resolveConflicts } from "../../components/Widgets/Widgets";
import WidgetCatalog from "../../components/Widgets/catalog";
import { WidgetInfo } from "../../components/Widgets/types";

interface DashboardScreenProps {
  acceptedWidgets: string[];
}

export default function DashboardScreen({
  acceptedWidgets,
}: DashboardScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [editMode, setEditMode] = useState(false);
  const [showNewWidgetModal, setShowNewWidgetModal] = useState(false);
  const [newWidgetModal, setNewWidgetModal] = useState<WidgetInfo | null>(
    Object.values(WidgetCatalog)?.[0] || null
  );
  const [widgetConfig, setWidgetConfig] = useGlobalStore(
    useShallow((state) => [
      state.session.me?.widgetConfig,
      state.session.setWidgetConfig,
    ])
  );

  return (
    <div className="mx-20 mt-4">
      {error ? (
        <Alert
          className="my-2"
          color="failure"
          onDismiss={() => setError(null)}
        >
          {error}
        </Alert>
      ) : null}
      <div className="flex justify-between items-center relative w-full mb-10">
        <h3 className="text-4xl font-bold">{t("Übersicht")}</h3>
        <div className="flex flex-row space-x-2 items-center">
          <ToggleSwitch
            checked={editMode}
            disabled={sending}
            label={t("Bearbeitungsmodus")}
            onChange={(checked) => {
              if (checked) {
                setEditMode(true);
                return;
              }
              fetch(host + "/api/user/widgets", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: credentialsValue,
                body: JSON.stringify(widgetConfig || {}),
              })
                .then((response) => {
                  setSending(false);
                  if (response.ok) {
                    setEditMode(false);
                    return;
                  }
                  return response.text();
                })
                .then((error_text) => {
                  if (error_text)
                    setError(t("Unerwartete Antwort") + ": " + error_text);
                })
                .catch((error) => {
                  setSending(false);
                  console.error(error);
                  setError(t("Fehler beim Senden") + ": " + error?.toString());
                });
            }}
          />
          <Dropdown
            disabled={!editMode || sending}
            label={t("Neues Widget")}
            dismissOnClick={false}
          >
            {acceptedWidgets
              .map((wid) => WidgetCatalog[wid] ?? WidgetCatalog["unknown"])
              .filter((w) => w.NewWidgetModal !== undefined)
              .filter((w) => w.requirementsMet())
              .map((w) => (
                <Dropdown.Item
                  key={w.id}
                  onClick={() => {
                    setNewWidgetModal(w);
                    setShowNewWidgetModal(true);
                  }}
                >
                  {w.name}
                </Dropdown.Item>
              ))}
          </Dropdown>
          {editMode && newWidgetModal && newWidgetModal.NewWidgetModal ? (
            <newWidgetModal.NewWidgetModal
              show={showNewWidgetModal}
              onClose={() => setShowNewWidgetModal(false)}
              onAddWidget={(config) =>
                setWidgetConfig(
                  resolveConflicts(
                    {
                      ...(widgetConfig ?? {}),
                      [Date.now().toString()]: config,
                    },
                    { lock: Object.keys(widgetConfig || {}) }
                  )
                )
              }
            />
          ) : null}
        </div>
      </div>
      <div className="w-full">
        <Widgets
          editMode={editMode}
          widgetConfig={widgetConfig || {}}
          setWidgetConfig={setWidgetConfig}
        />
      </div>
    </div>
  );
}
