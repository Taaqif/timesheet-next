import {
  MouseSensor as LibMouseSensor,
  TouchSensor as LibTouchSensor,
  PointerSensor as LibPointerSensor,
} from "@dnd-kit/core";
import type { MouseEvent, TouchEvent } from "react";

// Block DnD event propagation if element have "data-no-dnd" attribute
const handler = ({ nativeEvent: event }: MouseEvent | TouchEvent) => {
  let cur = event.target as HTMLElement;

  console.log(cur);
  while (cur) {
    if (cur.dataset.noDnd) {
      return false;
    }
    cur = cur.parentElement!;
  }

  return true;
};

export class MouseSensor extends LibMouseSensor {
  static activators = [
    { eventName: "onMouseDown", handler },
  ] as (typeof LibMouseSensor)["activators"];
}

export class PointerSensor extends LibPointerSensor {
  static activators = [
    { eventName: "onPointerDown", handler },
  ] as (typeof LibPointerSensor)["activators"];
}

export class TouchSensor extends LibTouchSensor {
  static activators = [
    { eventName: "onTouchStart", handler },
  ] as (typeof LibTouchSensor)["activators"];
}
