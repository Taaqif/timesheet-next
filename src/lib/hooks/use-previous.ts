/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import React from "react";

export function usePrevious(value: any) {
  const [current, setCurrent] = React.useState<any>(value);
  const [previous, setPrevious] = React.useState(null);

  if (value !== current) {
    setPrevious(current);
    setCurrent(value);
  }

  return previous;
}
