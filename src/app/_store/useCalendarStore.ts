import dayjs from "dayjs";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type CalendarState = {
  weekOf: string;
  selectedDate: Date;
  selectedEventId?: number;
};
type CalendarActions = {
  setWeekOf: (date: Date) => void;
  setSelectedDate: (date: Date) => void;
  setSelectedEventId: (eventId?: number) => void;
};

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call*/
export const useCalendarStore = create<CalendarState & CalendarActions>()(
  immer((set) => ({
    weekOf: dayjs(new Date()).startOf("week").format("YYYY-MM-DD"),
    selectedDate: new Date(),
    setSelectedEventId: (eventId?: number) =>
      set((state) => {
        state.selectedEventId = eventId;
      }),
    setSelectedDate: (date: Date) =>
      set((state) => {
        state.selectedDate = date;
        const selectedWeekOf = dayjs(date).startOf("week");
        if (!selectedWeekOf.isSame(state.weekOf, "week")) {
          state.weekOf = selectedWeekOf.format("YYYY-MM-DD");
        }
      }),
    setWeekOf: (date: Date) =>
      set((state) => {
        const selectedWeekOf = dayjs(date);
        state.weekOf = selectedWeekOf.format("YYYY-MM-DD");
      }),
  })),
);
