import { taskEither } from "fp-ts";
import { constVoid, pipe } from "fp-ts/lib/function.js";
import { ReaderTaskEither } from "fp-ts/ReaderTaskEither";
import { timestampToString } from "./timestamp.js";
import { CrdtClock, DbEnv, merkleTreeToString, UnknownError } from "./types.js";

export const updateClock =
  (clock: CrdtClock): ReaderTaskEither<DbEnv, UnknownError, void> =>
  ({ db }) =>
    pipe(
      db.execSqlQuery({
        sql: `
          update "__clock"
          set
            "timestamp" = ?,
            "merkleTree" = ?
        `,
        parameters: [
          timestampToString(clock.timestamp),
          merkleTreeToString(clock.merkleTree),
        ],
      }),
      taskEither.map(constVoid)
    );
