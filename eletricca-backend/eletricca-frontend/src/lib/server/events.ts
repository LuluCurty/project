import EventEmitter from "events";

export const chatEvents = new EventEmitter();
chatEvents.setMaxListeners(100);

export const notificationEvents = new EventEmitter();
notificationEvents.setMaxListeners(200);