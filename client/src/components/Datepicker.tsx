import { useState } from "react";
import { Datepicker as FBDatepicker, TextInput } from "flowbite-react";
import { FiCalendar } from "react-icons/fi";

import t from "../utils/translation";

interface DatepickerProps {
  date: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  disabled?: boolean;
  locale?: string;
  minDate?: Date;
  maxDate?: Date;
}

export default function Datepicker({
  date,
  onChange,
  className,
  disabled = false,
  locale = "de-DE",
  minDate,
  maxDate,
}: DatepickerProps) {
  const [popup, setPopup] = useState(false);

  return (
    <div className={className ?? "flex flex-row"}>
      {
        /*
        workaround for Datepicker not allowing to change from
        controlled to uncontrolled configuration (which happens when
        clearing the current input);
        the workaround consists of rendering a text-input for
        uncontrolled state and the Datepicker for the controlled state
        */
        date === null ? (
          <TextInput
            // trigger to open selection-popup
            id="date"
            className="w-full"
            readOnly
            disabled={disabled}
            icon={FiCalendar}
            value={""}
            onClick={() => setPopup(true)}
          />
        ) : (
          <FBDatepicker
            // display + trigger to open selection-popup
            id="date"
            className="w-full"
            theme={{ popup: { root: { base: "hidden" } } }}
            disabled={disabled}
            icon={FiCalendar}
            language={locale}
            value={date}
            onClick={() => setPopup(true)}
          />
        )
      }
      <div className="relative w-0 h-0 px-2">
        <div className="fixed z-10" hidden={!popup}>
          <div
            className="fixed -z-10 top-0 left-0 w-screen h-screen"
            onClick={() => setPopup(false)}
          />
          <FBDatepicker
            // selection-popup
            inline
            weekStart={1}
            language={locale}
            labelTodayButton={t("Heute")}
            labelClearButton={t("Löschen")}
            minDate={minDate}
            maxDate={maxDate}
            value={date}
            onChange={(d) => {
                onChange(d);
                setPopup(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}
