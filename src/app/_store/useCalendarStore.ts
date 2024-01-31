import dayjs from "dayjs";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type CalendarState = {
  weekOf: Date;
  selectedDate: Date;
};
type CalendarActions = {
  setWeekOf: (date: Date) => void;
  setSelectedDate: (date: Date) => void;
};

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call*/
export const useCalendarStore = create<CalendarState & CalendarActions>()(
  immer((set) => ({
    weekOf: dayjs(new Date()).startOf("week").toDate(),
    selectedDate: new Date(),
    setSelectedDate: (date: Date) =>
      set((state) => {
        state.selectedDate = date;
      }),
    setWeekOf: (date: Date) =>
      set((state) => {
        state.weekOf = date;
      }),
  })),
);
