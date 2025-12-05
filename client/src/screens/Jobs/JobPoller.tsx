import { useEffect } from "react";
import useGlobalStore from "../../store";

interface JobPollerProps {
  jobConfigId: string;
  interval?: number;
}

export default function JobPoller({
  jobConfigId,
  interval = 1000,
}: JobPollerProps) {
  const jobStore = useGlobalStore((state) => state.job);

  useEffect(() => {
    let fetchRunning = false;

    async function poll() {
      if (fetchRunning) return;

      fetchRunning = true;
      jobStore.fetchJobConfig({
        jobConfigId,
        onFail: () => {
          fetchRunning = false;
        },
        onSuccess: (config) => {
          if (config?.latestExec) {
            jobStore.fetchJobInfo({
              token: config.latestExec,
              keys: ["status", "datetimeStarted", "triggerType"],
              forceReload: true,
            });
          }
          fetchRunning = false;
        },
      });
    }

    // start interval
    const currentInterval = setInterval(poll, interval);

    return () => {
      clearInterval(currentInterval);
    };
    // eslint-disable-next-line
  }, []);

  return null;
}
