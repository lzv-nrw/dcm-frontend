import { useEffect, useState } from "react";
import { Button, TextInput } from "flowbite-react";
import { FiClock } from "react-icons/fi";

import t from "../utils/translation";
import { formatTime24 } from "../utils/dateTime";

interface TimepickerProps {
  time: Date | null;
  onChange: (time: Date | null) => void;
  className?: string;
  disabled?: boolean;
}

export default function Timepicker({
  time,
  onChange,
  className,
  disabled = false,
}: TimepickerProps) {
  const [popup, setPopup] = useState(false);

  const [hours, setHours] = useState(time?.getHours() ?? 0);
  const [minutes, setMinutes] = useState(time?.getMinutes() ?? 0);

  // update time on change
  useEffect(() => {
    if (time?.getHours() === hours && time?.getMinutes() === minutes) return;
    onChange(new Date(0, 0, 1, hours, minutes));
    // eslint-disable-next-line
  }, [hours, minutes, onChange]);

  return (
    <div className={className ?? "flex flex-row w-1/4"}>
      <TextInput
        id="time"
        className="w-full"
        readOnly
        disabled={disabled}
        icon={FiClock}
        value={disabled ? "" : formatTime24(hours, minutes)}
        onClick={() => setPopup(true)}
      />
      <div className="relative w-0 h-0 px-2">
        <div className="fixed z-10" hidden={!popup}>
          <div
            className="fixed -z-10 top-0 left-0 w-screen h-screen"
            onClick={() => setPopup(false)}
          />
          <div className="flex flex-col w-64 p-4 space-y-2 select-none bg-white rounded-lg shadow-md">
            <div className="flex flex-row h-64 justify-evenly">
              <div className="flex flex-col h-full py-2 space-y-4 items-center">
                <h5 className="font-semibold text-md">HH</h5>
                <div className="flex flex-col h-full px-4 py-1 space-y-1 overflow-y-scroll border">
                  {Array(24)
                    .fill(undefined)
                    .map((_, i) => (
                      <span
                        key={i}
                        className={
                          "px-4 py-1 border rounded-lg hover:cursor-pointer" +
                          (i === hours
                            ? " hover:bg-primary-800 bg-primary-700 text-white"
                            : " hover:bg-gray-100")
                        }
                        onClick={() => setHours(i)}
                      >
                        {("0" + i).slice(-2)}
                      </span>
                    ))}
                </div>
              </div>
              <div className="flex flex-col h-full py-2 space-y-4 items-center">
                <h5 className="font-semibold text-md">:</h5>
              </div>
              <div className="flex flex-col h-full py-2 space-y-4 items-center">
                <h5 className="font-semibold text-md">MM</h5>
                <div className="flex flex-col h-full px-4 py-1 space-y-1 overflow-y-scroll border">
                  {Array(60)
                    .fill(undefined)
                    .map((_, i) => (
                      <span
                        key={i}
                        className={
                          "px-4 py-1 border rounded-lg hover:cursor-pointer" +
                          (i === minutes
                            ? " hover:bg-primary-800 bg-primary-700 text-white"
                            : " hover:bg-gray-100")
                        }
                        onClick={() => setMinutes(i)}
                      >
                        {("0" + i).slice(-2)}
                      </span>
                    ))}
                </div>
              </div>
            </div>
            <div className="flex flex-row w-full space-x-4">
              <Button
                className="w-1/2"
                size="sm"
                onClick={() => {
                  setHours(new Date().getHours());
                  setMinutes(new Date().getMinutes());
                  setPopup(false);
                }}
              >
                {t("Jetzt")}
              </Button>
              <Button
                className="w-1/2"
                size="sm"
                color="gray"
                onClick={() => {
                  setHours(0);
                  setMinutes(0);
                  setPopup(false);
                }}
              >
                {t("Löschen")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
