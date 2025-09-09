import { Sidebar } from "flowbite-react";
import { FiCheckCircle, FiAlertCircle, FiEdit } from "react-icons/fi";

import t from "../utils/translation";
import MessageBox, { MessageHandler } from "./MessageBox";

export interface FormSectionComponentProps {
  name: string;
  ok?: null | boolean;
  setOk?: (ok: null | boolean) => void;
  active: boolean;
}

export interface FormSection {
  tab: number;
  name: string;
  ok?: null | boolean;
  showIcon?: boolean;
  setOk?: (ok: null | boolean) => void;
  Component: React.FC<FormSectionComponentProps>;
}

interface SectionedFormProps {
  sections: FormSection[];
  tab: number;
  setTab?: (tab: number) => void;
  sidebarWidth?: string;
  showEditIcon?: boolean;
  messageHandler?: MessageHandler;
}

export default function SectionedForm({
  sections,
  tab,
  setTab,
  sidebarWidth,
  showEditIcon = false,
  messageHandler,
}: SectionedFormProps) {
  return (
    <div className="h-full flex flex-row relative">
      <Sidebar className="select-none [&>div]:bg-transparent">
        <Sidebar.Items>
          <Sidebar.ItemGroup>
            {sections.map((sec) => (
              <Sidebar.Item
                key={sec.tab}
                onClick={() => setTab?.(sec.tab)}
                className={tab === sec.tab && "bg-gray-100"}
              >
                <div
                  className={`flex flex-row justify-between items-center ${
                    sidebarWidth ?? "w-auto"
                  } ${
                    tab === sec.tab ? "font-semibold" : "hover:cursor-pointer"
                  }`}
                >
                  <p>{sec.name}</p>
                  {!(sec.showIcon ?? true) ? null : tab === sec.tab &&
                    showEditIcon ? (
                    <FiEdit
                      aria-label="edit"
                      size="20"
                      className="text-yellow-500"
                    />
                  ) : sec.ok === undefined ? null : sec.ok ? (
                    <FiCheckCircle
                      aria-label="valid"
                      size="20"
                      className="text-green-500"
                    />
                  ) : (
                    <FiAlertCircle
                      aria-label="invalid"
                      size="20"
                      className="text-red-500"
                    />
                  )}
                </div>
              </Sidebar.Item>
            ))}
          </Sidebar.ItemGroup>
        </Sidebar.Items>
      </Sidebar>
      <div
        id="sectionedFormBody"
        className="px-2 py-4 w-full h-full overflow-y-auto"
      >
        {messageHandler && (
          <MessageBox
            className="mb-1"
            messages={messageHandler?.messages}
            messageTitle={t("Ein Fehler ist aufgetreten:")}
            onDismiss={messageHandler?.clearMessages}
          />
        )}
        {sections.map((sec) => (
          <div
            key={sec.tab}
            className={
              "flex flex-col space-y-2 " + (sec.tab === tab ? "" : "hidden")
            }
          >
            <sec.Component
              name={sec.name}
              ok={sec.ok}
              setOk={sec.setOk}
              active={sec.tab === tab}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
