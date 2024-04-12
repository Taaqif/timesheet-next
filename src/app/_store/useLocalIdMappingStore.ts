import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type LocalIdMapping = {
  key: string;
  oldId: number;
  newId?: number;
};
type LocalIdMappingState = {
  localIdMapping: LocalIdMapping[];
};
type LocalIdMappingActions = {
  generateUniqueLocalId: (key: string) => number;
  addLocalIdMapping: (key: string, oldId: number) => void;
  updateLocalIdMapping: (key: string, oldId: number, newId: number) => void;
  waitForNewLocalIdMapping: (key: string, oldId: number) => Promise<number>;
};

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call*/
export const useLocalIdMappingStore = create<
  LocalIdMappingState & LocalIdMappingActions
>()(
  immer((set, get) => ({
    localIdMapping: [],
    generateUniqueLocalId: (key: string) => {
      const getId = (): number => {
        const id = Math.floor(Math.random() * 90000);
        const foundLocalIdMapping = get().localIdMapping.find(
          (mapping) => mapping.key === key && mapping.oldId === id,
        );
        if (foundLocalIdMapping) {
          return getId();
        }
        return id;
      };
      return getId();
    },

    addLocalIdMapping: (key: string, id: number) =>
      set((state) => {
        const foundLocalIdMapping = state.localIdMapping.find(
          (mapping) => mapping.key === key && mapping.oldId === id,
        );
        if (!foundLocalIdMapping) {
          state.localIdMapping.push({
            oldId: id,
            key: key,
          });
        }
      }),
    updateLocalIdMapping: (key: string, oldId: number, newId: number) =>
      set((state) => {
        const foundLocalIdMapping = state.localIdMapping.find(
          (mapping) => mapping.key === key && mapping.oldId === oldId,
        );
        if (foundLocalIdMapping) {
          foundLocalIdMapping.newId = newId;
        }
      }),
    waitForNewLocalIdMapping: (key: string, oldId: number) => {
      return new Promise<number>((resolve) => {
        const check = () => {
          const foundLocalIdMapping = get().localIdMapping.find(
            (mapping) => mapping.key === key && mapping.oldId === oldId,
          );
          if (foundLocalIdMapping?.newId) {
            resolve(foundLocalIdMapping.newId);
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
