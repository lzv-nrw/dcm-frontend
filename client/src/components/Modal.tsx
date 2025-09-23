import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

interface ModalContextType {
  onClose?: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

type sizes =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "7xl";

interface ModalProps {
  show: boolean;
  dismissible?: boolean;
  className?: string;
  width?: sizes;
  height?: sizes;
  children?: React.ReactNode;
  onClose?: () => void;
}

const WIDTH_MAP: Record<sizes, string> = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};
const HEIGHT_MAP: Record<sizes, string> = {
  xs: "h-[20rem]",
  sm: "h-[24rem]",
  md: "h-[28rem]",
  lg: "h-[32rem]",
  xl: "h-[36rem]",
  "2xl": "h-[42rem]",
  "3xl": "h-[48rem]",
  "4xl": "h-[56rem]",
  "5xl": "h-[64rem]",
  "6xl": "h-[72rem]",
  "7xl": "h-screen",
};

export default function Modal({
  show,
  dismissible,
  width = "xl",
  height,
  className = "",
  children,
  onClose,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // add Esc-key exiting to modal
  const escapeCallback = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    },
    [onClose]
  );
  useEffect(() => {
    if (show) document.addEventListener("keydown", escapeCallback, false);
    return () => document.removeEventListener("keydown", escapeCallback, false);
  }, [show, escapeCallback]);

  // focus on dialog when being opened
  useEffect(() => {
    if (!show) return;
    modalRef.current?.focus();
  }, [show]);

  // prevent scroll-events for all devices (mouse, keyboard, ..)
  useEffect(() => {
    if (!show) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, [show]);

  if (!show) return null;

  return createPortal(
    <ModalContext.Provider value={{ onClose }}>
      <div
        className="fixed z-50 top-0 left-0 h-screen w-screen flex items-center justify-center bg-gray-900 bg-opacity-50"
        onClick={() => {
          if (dismissible) onClose?.();
        }}
      >
        <div
          ref={modalRef}
          className={`flex flex-col bg-white rounded-lg shadow grow max-h-[90%] ${
            height ? HEIGHT_MAP[height] : "h-auto"
          } ${WIDTH_MAP[width]} ${className}`}
          role="dialog"
          aria-modal
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body
  );
}

interface ModalHeaderProps {
  title?: string;
  hideCloseButton?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function ModalHeader({
  title,
  hideCloseButton,
  className = "",
  children,
}: ModalHeaderProps) {
  const context = useContext(ModalContext);

  return (
    <>
      <div className={`px-6 py-4 flex justify-between ${className}`}>
        <div className="w-full">
          <div className="flex justify-between items-center">
            <div>
              {title ? (
                <h3 className="text-2xl font-bold text-gray-900 dcm-clamp-text">
                  {title}
                </h3>
              ) : null}
            </div>
            {hideCloseButton !== true ? (
              <div className="mr-2">
                <button
                  className="rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900"
                  onClick={context?.onClose}
                >
                  <FiX size="20" />
                </button>
              </div>
            ) : null}
          </div>
          {children}
        </div>
      </div>
      <hr />
    </>
  );
}

interface ModalBodyProps {
  className?: string;
  children?: React.ReactNode;
}

function ModalBody({ className = "", children }: ModalBodyProps) {
  return (
    <div className={`px-6 h-full overflow-y-auto ${className}`}>{children}</div>
  );
}

interface ModalFooterProps {
  className?: string;
  children?: React.ReactNode;
}

function ModalFooter({ className = "", children }: ModalFooterProps) {
  return (
    <>
      <hr />
      <div className={`px-6 py-4 flex space-x-2 ${className}`}>{children}</div>
    </>
  );
}

// setup sub-components
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
