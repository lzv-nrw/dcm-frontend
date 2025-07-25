import {
  MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "flowbite-react";
import { FiTrash2 } from "react-icons/fi";

import WidgetCatalog from "./catalog";
import { WidgetConfig } from "./types";

const COLS = 12;
const unitsizeY = 100;
const MAX_COLLISIONS = 10;
const CSSTransitions = "left 0.05s ease-out, top 0.05s ease-out";
const DEBUG = false;

/**
 * Checks collision between two boxes
 * @param a collision box a
 * @param b collision box b
 * @returns `true` if boxes are overlapping
 */
export function inConflict(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return (
    ((a.x >= b.x && a.x < b.x + b.w) || (b.x >= a.x && b.x < a.x + a.w)) &&
    ((a.y >= b.y && a.y < b.y + b.h) || (b.y >= a.y && b.y < a.y + a.h))
  );
}

/**
 * Resolves collisions between widgets in-place by iterating pairs.
 * On collision, resolve by moving passive/pushed widget downwards and
 * restart iteration (until all conflicts are resolved).
 * @param widgets collection of widgets to be worked on
 * @param lock array of widget keys to be locked in place
 * @param onCompletion callback that is run before exit
 * @returns mutated `widgets`
 */
export function resolveConflicts(
  widgets: Record<string, WidgetConfig>,
  {
    lock,
    onCompletion,
  }: {
    lock?: string[];
    onCompletion?: (widgets: Record<string, WidgetConfig>) => void;
  }
): Record<string, WidgetConfig> {
  let anyConflict = true;
  let n = 0;
  while (anyConflict && n < MAX_COLLISIONS) {
    n++;
    anyConflict = false;
    outer: for (let [keyA, a] of Object.entries(widgets).sort(
      (_a, _b) => _a[1].y - _b[1].y
    )) {
      let wa = WidgetCatalog[a.id] ?? WidgetCatalog.unknown;
      for (let [keyB, b] of Object.entries(widgets).sort(
        (_a, _b) => _a[1].y - _b[1].y
      )) {
        let wb = WidgetCatalog[b.id] ?? WidgetCatalog.unknown;
        if (keyA === keyB || lock?.includes(keyB)) continue;
        const conflict = inConflict(
          {
            x: a.x,
            y: a.y,
            w: wa.width,
            h: wa.height,
          },
          {
            x: b.x,
            y: b.y,
            w: wb.width,
            h: wb.height,
          }
        );
        anyConflict = anyConflict || conflict;
        if (conflict) {
          if (DEBUG) console.log("CONFLICT: moving " + keyB, b);
          widgets[keyB] = {
            ...b,
            y: a.y + wa.height,
          };
          break outer;
        }
      }
    }
  }
  onCompletion?.(widgets);
  return widgets;
}
interface WidgetsProps {
  editMode?: boolean;
  widgetConfig: Record<string, WidgetConfig>;
  setWidgetConfig: (widgetConfig: Record<string, WidgetConfig>) => void;
}

export default function Widgets({
  editMode = false,
  widgetConfig,
  setWidgetConfig,
}: WidgetsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [unitsizeX, setUnitsizeX] = useState(0);

  // current state while editing (dragging)
  const [editingWidgetConfig, setEditingWidgetConfig] = useState(widgetConfig);
  // whether currently dragging a widget
  const [editing, setEditing] = useState(false);
  // cursor position inside widget
  const [editingDragOffset, setEditingDragOffset] = useState({
    dx: 0,
    dy: 0,
  });
  // currently targeted grid position
  const [editingGridDestination, setEditingGridDestination] = useState({
    x: 0,
    y: 0,
  });
  // widget currently being dragged (key in editingWidgets)
  const [editingTarget, setEditingTarget] = useState<string | null>(null);

  // re-initialize editingWidgetConfig if widgetConfig changes
  useEffect(() => {
    setEditingWidgetConfig(widgetConfig);
  }, [widgetConfig]);

  // ---- handle resizing
  /**
   * Calculates current unitsize based on available space.
   */
  function handleResize() {
    if (containerRef.current)
      setUnitsizeX(containerRef.current.clientWidth / COLS);
  }
  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  useLayoutEffect(handleResize, []);
  // ---- end handle resizing

  /**
   * Returns grid coordinates for given pixel position. Coordinates
   * should be given in absolute values, relative position within
   * `containerRef` is taken into account automatically.
   * @param x Horizontal pixel-coordinates.
   * @param y Vertical pixel-coordinates.
   * @returns Grid coordinates.
   */
  function mapToGridCoords(x: number, y: number): { x: number; y: number } {
    if (!containerRef.current) return { x: 0, y: 0 };
    return {
      x: Math.max(
        0,
        Math.min(
          COLS,
          Math.floor((x - containerRef.current.offsetLeft) / unitsizeX)
        )
      ),
      y: Math.max(
        0,
        Math.floor((y - containerRef.current.offsetTop) / unitsizeY)
      ),
    };
  }

  /**
   * Repositions widgets to fit `key` into requested place.
   * @param key key to identify widget
   * @param gridPosition requested grid position
   */
  function placeWidget(key: string, { x, y }: { x: number; y: number }) {
    // check whether call should be skipped
    if (!editingWidgetConfig[key]) return;
    if (editingWidgetConfig[key].x === x && editingWidgetConfig[key].y === y)
      return;

    if (DEBUG) {
      console.log("placing at ", { x, y });
      console.log("currently at ", editingWidgetConfig[key]);
    }

    resolveConflicts(
      {
        ...widgetConfig,
        [key]: {
          ...editingWidgetConfig[key],
          x: Math.min(
            COLS -
              (
                WidgetCatalog[editingWidgetConfig[key].id] ??
                WidgetCatalog.unknown
              ).width,
            x
          ),
          y,
        },
      },
      {
        lock: [key],
        onCompletion: (ws) => setEditingWidgetConfig(ws),
      }
    );
  }

  // ---- handle edit-events
  // located here and not attached to container to enable dragging/stop
  // dragging on entire screen
  useEffect(() => {
    function handleDrag(e: globalThis.MouseEvent) {
      if (containerRef.current && editing && editingTarget) {
        const coords = mapToGridCoords(
          e.clientX - editingDragOffset.dx,
          e.clientY - editingDragOffset.dy
        );
        if (
          coords.x !== editingWidgetConfig[editingTarget].x ||
          coords.y !== editingWidgetConfig[editingTarget].y
        )
          setEditingGridDestination(coords);
      }
    }
    function stopDrag() {
      setWidgetConfig(editingWidgetConfig);
      setEditingTarget(null);
      setEditing(false);
    }
    if (editing) {
      window.addEventListener("mousemove", handleDrag);
      window.addEventListener("mouseup", stopDrag);
      return () => {
        window.removeEventListener("mousemove", handleDrag);
        window.removeEventListener("mouseup", stopDrag);
      };
    }
    // eslint-disable-next-line
  }, [
    editing,
    editingWidgetConfig,
    editingTarget,
    editingDragOffset,
    editingGridDestination,
  ]);
  useEffect(() => {
    if (editing && editingTarget)
      placeWidget(editingTarget, editingGridDestination);
    // eslint-disable-next-line
  }, [editingGridDestination]);
  // ---- end handle edit-events

  return (
    <div
      ref={containerRef}
      className={"relative rounded-xl" + (editMode ? " border" : "")}
      style={{
        height: ((w) =>
          (w.y + WidgetCatalog[w.id].height + 1) * unitsizeY + "px")(
          Object.values(editing ? editingWidgetConfig : widgetConfig)
            .map((w) =>
              Object.keys(WidgetCatalog).includes(w.id)
                ? w
                : { ...w, id: "unknown" }
            )
            .reduce(
              (p, c) =>
                p.y + WidgetCatalog[p.id].height >
                c.y + WidgetCatalog[c.id].height
                  ? p
                  : c,
              { id: "unknown", x: 0, y: 0 }
            )
        ),
      }}
    >
      {DEBUG && (
        <div // mouse-position-indicator
          className="absolute bg-gray-400"
          style={{
            left: editingGridDestination.x * unitsizeX,
            top: editingGridDestination.y * unitsizeY,
            transition: editing ? CSSTransitions : "",
            width: unitsizeX,
            height: unitsizeY,
            zIndex: 0,
          }}
        ></div>
      )}
      {Object.entries(editing ? editingWidgetConfig : widgetConfig)
        .map(([key, w]) => {
          return {
            ...w,
            key,
            info: WidgetCatalog[w.id]?.requirementsMet()
              ? WidgetCatalog[w.id]
              : WidgetCatalog.unknown,
          };
        })
        .map((w) => (
          <div key={w.key}>
            {editMode && (
              <div // cover for edit-mode
                className="absolute rounded-xl"
                style={{
                  left: w.x * unitsizeX,
                  top: w.y * unitsizeY,
                  transition: editing ? CSSTransitions : "",
                  width: w.info.width * unitsizeX,
                  height: w.info.height * unitsizeY,
                  zIndex: 1,
                }}
              >
                <Button
                  size="xs"
                  className="absolute aspect-square items-center right-2 top-2 z-10"
                  onMouseDown={(e: MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onMouseUp={(e: MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onClick={() => {
                    if (!editingWidgetConfig[w.key]) return;
                    setWidgetConfig(
                      Object.fromEntries(
                        Object.entries(editingWidgetConfig).filter(
                          ([id]) => id !== w.key
                        )
                      )
                    );
                  }}
                >
                  <FiTrash2 />
                </Button>
                <div
                  className={
                    "absolute rounded-xl bg-gray-200" +
                    (editingTarget === w.key
                      ? "select-none opacity-0"
                      : " opacity-50")
                  }
                  style={{
                    width: w.info.width * unitsizeX,
                    height: w.info.height * unitsizeY,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setEditingWidgetConfig(widgetConfig);
                    setEditingTarget(w.key);
                    setEditingDragOffset({
                      dx:
                        e.clientX -
                        w.x * unitsizeX -
                        (containerRef.current?.offsetLeft ?? 0),
                      dy:
                        e.clientY -
                        w.y * unitsizeY -
                        (containerRef.current?.offsetTop ?? 0),
                    });
                    setEditing(true);
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setWidgetConfig(editingWidgetConfig);
                    setEditingTarget(null);
                    setEditing(false);
                  }}
                ></div>
              </div>
            )}
            <div
              className={
                "absolute rounded-xl overflow-clip p-2" +
                (editMode ? " border" : "")
              }
              style={{
                left: w.x * unitsizeX,
                top: w.y * unitsizeY,
                transition: editing ? CSSTransitions : "",
                width: w.info.width * unitsizeX,
                height: w.info.height * unitsizeY,
                zIndex: 0,
              }}
            >
              <w.info.Component {...w.props} />
            </div>
          </div>
        ))}
    </div>
  );
}
