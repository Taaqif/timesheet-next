import { type ClassValue, clsx } from "clsx";
import dayjs from "dayjs";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getHoursMinutesTextFromDates = (
  start: Date | string,
  end: Date | string,
  condensed = false,
) => {
  try {
    const ds = dayjs(end);
    const minsTotal = ds.diff(start, "minute");
    if (minsTotal > 0) {
      return getHoursMinutesTextFromMinutes(minsTotal, condensed);
    } else {
      const secTotal = ds.diff(start, "second");
      return getSecondsTextFromSeconds(secTotal, condensed);
    }
  } catch (error) {
    return `N/A`;
  }
};

export const getSecondsTextFromSeconds = (
  secondTotal: number,
  condensed = false,
) => {
  if (condensed) {
    return `${secondTotal}s`;
  } else {
    return `${secondTotal} seconds`;
  }
};
export const getHoursMinutesTextFromMinutes = (
  minsTotal: number,
  condensed = false,
) => {
  const hours = Math.floor(minsTotal / 60);
  const minutes = minsTotal % 60;
  if (condensed) {
    return (
      (hours > 0 ? `${hours}h` : "") +
      (hours > 0 && minutes > 0 ? " " : "") +
      (minutes > 0 ? `${minutes}m` : "")
    );
  } else {
    return (
      (hours > 0 ? `${hours} hours` : "") +
      (minutes > 0 && hours > 0 ? " and " : "") +
      (minutes > 0 ? `${minutes} minutes` : "")
    );
  }
};
