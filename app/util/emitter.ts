import { EventEmitter } from "events";

export const emitter = new EventEmitter();

export type ProcessingStatus = {
    id: string;
    message: string;
    itemType?: string;
    success?: boolean;
};
