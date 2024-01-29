import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type CalendarState = {
  selectedDate: Date;
};
type CalendarActions = {
  setSelectedDate: (date: Date) => void;
};

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call*/
export const useCalendarStore = create<CalendarState & CalendarActions>()(
  immer((set) => ({
    selectedDate: new Date(),
    setSelectedDate: (date: Date) =>
      set((state) => {
        state.selectedDate = date;
      }),
  })),
);
