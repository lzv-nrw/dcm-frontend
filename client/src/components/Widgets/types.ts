export interface WidgetConfig {
  id: string;
  x: number;
  y: number;
  props: any;
}

export interface NewWidgetModalProps {
  show: boolean;
  onClose?: () => void;
  onAddWidget?: (config: WidgetConfig) => void;
}

export interface WidgetInfo {
  id: "demo" | "unknown";
  name: string;
  width: number;
  height: number;
  Component: (props: any) => JSX.Element;
  NewWidgetModal?: (props: NewWidgetModalProps) => JSX.Element;
  requirementsMet: () => boolean;
}
