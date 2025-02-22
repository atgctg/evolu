import { IO } from "fp-ts/IO";

export const createSyncWorker: IO<Worker> = () =>
  new Worker(new URL("./sync.worker.js", import.meta.url));
