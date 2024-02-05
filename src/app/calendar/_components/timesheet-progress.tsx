import React, { useEffect, useState } from "react";
import { Progress } from "~/components/ui/progress";

type TimesheetProgressProps = {
  //
};

export const TimesheetProgress = ({}: TimesheetProgressProps) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const now = new Date();

    const timer = setTimeout(() => setProgress(10), 500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div>
      <Progress value={progress} notchValue={25} className="w-full" />
    </div>
  );
};
