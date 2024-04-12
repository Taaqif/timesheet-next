import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type ProcessQueueItem = {
  key: string;
  processing: boolean;
};
type LocalIdMappingState = {
  processQueue: ProcessQueueItem[];
};
type LocalIdMappingActions = {
  setProcessing: (key: string, processing: boolean) => void;
  waitForProcessingComplete: (key: string) => Promise<void>;
};

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call*/
export const useProcessQueueStore = create<
  LocalIdMappingState & LocalIdMappingActions
>()(
  immer((set, get) => ({
    processQueue: [],
    setProcessing: (key: string, processing: boolean) =>
      set((state) => {
        const foundProcess = state.processQueue.find(
          (mapping) => mapping.key === key,
        );
        if (foundProcess) {
          foundProcess.processing = processing;
        } else {
          state.processQueue.push({
            processing: processing,
            key: key,
          });
        }
      }),
    waitForProcessingComplete: (key: string) => {
      return new Promise<void>((resolve) => {
        const check = () => {
          const foundLocalIdMapping = get().processQueue.find(
            (mapping) => mapping.key === key,
          );
          if (!foundLocalIdMapping?.processing) {
            resolve();
          } else {
            //check again
            setTimeout(check, 100);
          }
        };
        check();
      });
    },
  })),
);
