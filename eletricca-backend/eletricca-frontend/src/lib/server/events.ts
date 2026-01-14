import EventEmitter from "events";

export const chatEvents = new EventEmitter();

chatEvents.setMaxListeners(100);