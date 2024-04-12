import { useCallback, useState } from "react";

type LocalIdMapping = {
  key: string;
  oldId: string | number;
  newId?: string | number;
};
export const useLocalIdMapping = () => {
  const [localIdMapping, setLocalIdMapping] = useState<LocalIdMapping[]>([]);

  const generateUniqueLocalId = useCallback(
    (key: string) => {
      const getId = (): number => {
        const id = Math.floor(Math.random() * 90000);
        const foundLocalIdMapping = localIdMapping.find(
          (mapping) => mapping.key === key && mapping.oldId === id,
        );
        if (foundLocalIdMapping) {
          return getId();
        }
        return id;
      };
      return getId();
    },
    [localIdMapping],
  );

  const addLocalIdMapping = useCallback(
    (key: string, id: string | number) => {
      const foundLocalIdMapping = localIdMapping.find(
        (mapping) => mapping.key === key && mapping.oldId === id,
      );
      if (foundLocalIdMapping) {
        return null;
      }
      setLocalIdMapping([
        ...localIdMapping,
        {
          oldId: id,
          key: key,
        },
      ]);
    },
    [localIdMapping],
  );
  const updateLocalIdMapping = useCallback(
    (key: string, oldId: string | number, newId: string | number) => {
      setLocalIdMapping((localIdMapping) => {
        const foundLocalIdMapping = localIdMapping.find(
          (mapping) => mapping.key === key && mapping.oldId === oldId,
        );
        if (foundLocalIdMapping) {
          foundLocalIdMapping.newId = newId;
        }

        return localIdMapping.slice();
      });
    },
    [localIdMapping],
  );

  const waitForNewLocalIdMapping = useCallback(
    (key: string, oldId: string | number) => {
      return new Promise<string | number>((resolve) => {
        const check = () => {
          const foundLocalIdMapping = localIdMapping.find(
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
    [localIdMapping],
  );
  return {
    generateUniqueLocalId,
    addLocalIdMapping,
    updateLocalIdMapping,
    waitForNewLocalIdMapping,
  };
};
