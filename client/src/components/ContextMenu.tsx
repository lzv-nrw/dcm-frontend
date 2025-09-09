import { Dispatch, SetStateAction } from "react";
import { Popover } from "flowbite-react";

interface ContextMenuItemProps {
  children?: React.ReactNode;
  onClick?: () => void;
}

interface ContextMenuProps {
  open: boolean;
  className?: string;
  children: React.ReactNode;
  items: ContextMenuItemProps[];
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

export default function ContextMenu({
  open,
  className = "",
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
          {items.map((item, index) => (
            <div
              onClick={() => {
                item.onClick?.();
                onOpenChange(false);
              }}
              key={index}
              className={
                "px-4 py-2" +
                (item.onClick
                  ? " hover:bg-gray-100 hover:cursor-pointer"
                  : " bg-gray-200 text-gray-500")
              }
            >
              {item.children}
            </div>
          ))}
        </div>
      }
      placement="bottom-start"
      arrow={false}
    >
      {children}
    </Popover>
  );
}
