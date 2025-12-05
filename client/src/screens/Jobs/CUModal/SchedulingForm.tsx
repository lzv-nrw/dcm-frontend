import { useState, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { Label, Select } from "flowbite-react";

import t from "../../../utils/translation";
import { Validator } from "../../../utils/forms";
import { FormSectionComponentProps } from "../../../components/SectionedForm";
import Datepicker from "../../../components/Datepicker";
import Timepicker from "../../../components/Timepicker";
import { useFormStore } from "./store";

export type SchedulingFormChildren = never;
export type SchedulingFormValidator = Validator<SchedulingFormChildren>;

export type ScheduleType = "onetime" | "day" | "week" | "month";

export const ScheduleTypeInfo: Record<ScheduleType, { label: string }> = {
  onetime: { label: "einmalig" },
  day: { label: "täglich" },
  week: { label: "wöchentlich" },
  month: { label: "monatlich" },
};

export interface Scheduling {
  date?: Date;
  time?: Date;
  schedule?: ScheduleType;
  active?: boolean;
}

/**
 * Combines date- and time-info into single Date-object.
 * @param date date
 * @param time time
 * @returns combined date and time (or undefined if one input is undefined)
 */
export function combineDateAndTime(date?: Date, time?: Date): Date | undefined {
  if (!date || !time) return;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes()
  );
}

export function SchedulingForm({ name, active }: FormSectionComponentProps) {
  const [scheduling, setScheduling] = useFormStore(
    useShallow((state) => [state.scheduling, state.setScheduling])
  );
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const scheduleSelectRef = useRef<HTMLSelectElement>(null);

  const [formVisited, setFormVisited] = useState(active);

  // track visited
  useEffect(() => {
    if (active) setFormVisited(true);
  }, [active]);

  // handle validation
  // * form section
  useEffect(() => {
    if (!formVisited) return;
    if (validator.children?.scheduling?.report?.ok === undefined && active)
      return;
    setCurrentValidationReport({
      children: {
        scheduling: validator.children?.scheduling?.validate(true),
      },
    });
    // eslint-disable-next-line
  }, [active]);

  useEffect(() => {
    setScheduling({
      schedule:
        scheduling?.date && scheduling?.time
          ? (scheduleSelectRef.current?.value as ScheduleType)
          : undefined,
    });
    // eslint-disable-next-line
  }, [scheduling?.date, scheduling?.time]);

  return (
    <>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="flex flex-col w-full space-y-2">
        <div className="flex items-center space-y-2 space-x-2">
          <Label value={t("Startdatum")} />
          <Datepicker
            className="flex flex-row w-1/2"
            date={scheduling?.date ?? null}
            minDate={new Date()}
            onChange={(date) => setScheduling({ date: date ?? undefined })}
          />
          <Timepicker
            time={scheduling?.time ?? null}
            onChange={(time) => setScheduling({ time: time ?? undefined })}
            disabled={!scheduling?.date}
          />
        </div>
        <div className="flex items-center space-y-2 space-x-2">
          <Label htmlFor="schedule" value={t("Wiederholungen")} />
          <Select
            ref={scheduleSelectRef}
            id="schedule"
            disabled={!scheduling?.date || !scheduling?.time}
            value={scheduling?.schedule ?? "onetime"}
            onChange={(e) =>
              setScheduling({
                schedule:
                  scheduling?.date && scheduling?.time
                    ? (e.target.value as ScheduleType)
                    : undefined,
              })
            }
          >
            {Object.entries(ScheduleTypeInfo).map(([id, info]) => (
              <option key={id} value={id}>
                {t(info.label)}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </>
  );
}
