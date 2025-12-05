import { Dispatch, SetStateAction } from "react";
import { Popover } from "flowbite-react";
import { Placement } from "@floating-ui/react";

interface ContextMenuItemProps {
  children?: React.ReactNode;
  key?: React.Key;
  onClick?: () => void;
}

interface ContextMenuProps {
  open: boolean;
  className?: string;
  placement?: Placement;
  header?: React.ReactNode;
  children: React.ReactNode;
  items: ContextMenuItemProps[];
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

export default function ContextMenu({
  open,
  className = "",
  placement = "bottom-start",
  header,
  children,
  items,
  onOpenChange,
}: ContextMenuProps) {
  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      aria-labelledby="context-menu"
      content={
        <div className={`min-w-32 flex flex-col select-none ${className}`}>
          {header ? (
            <h3 className="font-semibold px-4 py-2 bg-gray-200 text-gray-500">
              {header}
            </h3>
          ) : null}
          {items.map((item, index) => (
            <div
              onClick={() => {
                item.onClick?.();
                onOpenChange(false);
              }}
              key={item.key ?? index}
              className="px-4 py-2 hover:bg-gray-100 hover:cursor-pointer"
            >
              {item.children}
            </div>
          ))}
        </div>
      }
      placement={placement}
      arrow={false}
    >
      {children}
    </Popover>
  );
}
