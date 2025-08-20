import { Sidebar } from "flowbite-react";
import { FiCheckCircle, FiAlertCircle, FiEdit } from "react-icons/fi";

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
}

export default function SectionedForm({
  sections,
  tab,
  setTab,
  sidebarWidth,
}: SectionedFormProps) {
  return (
    <div className="h-full flex flex-row">
      <Sidebar className="select-none [&>div]:bg-transparent">
        <Sidebar.Items>
          <Sidebar.ItemGroup>
            {sections.map((sec) => (
              <Sidebar.Item
                key={sec.tab}
                onClick={() => setTab?.(sec.tab)}
                className={tab === sec.tab && "hover:bg-transparent"}
              >
                <div
                  className={
                    "flex flex-row justify-between items-center " +
                    (sidebarWidth ?? "w-auto")
                  }
                >
                  <p
                    className={
                      tab === sec.tab ? "font-semibold" : "hover:cursor-pointer"
                    }
                  >
                    {sec.name}
                  </p>
                  {!(sec.showIcon ?? true) ? null : tab === sec.tab ? (
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
      <div className="px-2 py-4 w-full h-full overflow-y-auto">
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
