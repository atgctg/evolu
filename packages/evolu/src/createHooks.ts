import { readonlyArray } from "fp-ts";
import { constNull, pipe } from "fp-ts/lib/function.js";
import { useMemo, useRef, useSyncExternalStore } from "react";
import { createConfig } from "./createConfig.js";
import { createDbWorker } from "./createDbWorker.js";
import { createEvolu } from "./createEvolu.js";
import { kysely } from "./kysely.js";
import {
  Config,
  DbSchema,
  Hooks,
  SqliteRow,
  SqlQuery,
  sqlQueryToString,
  UseMutation,
  UseQuery,
} from "./types.js";

/**
 * Create React Hooks for a given DB schema.
 *
 * @example
 * const { useQuery, useMutation, useOwner } = createHooks({
 *   todo: {
 *     id: TodoId,
 *     title: model.NonEmptyString1000,
 *     isCompleted: model.SqliteBoolean,
 *   },
 * });
 */
export const createHooks = <S extends DbSchema>(
  dbSchema: S,
  config?: Partial<Config>
): Hooks<S> => {
  const evolu = createEvolu(dbSchema)({
    config: createConfig(config),
    createDbWorker,
  });
  const cache = new WeakMap<SqliteRow, SqliteRow>();

  // @ts-expect-error Function overloading sucks. It's internal, so it's OK.
  const useQuery: UseQuery<S> = (query, initialFilterMap) => {
    const sqlQueryString = query
      ? pipe(query(kysely as never).compile() as SqlQuery, sqlQueryToString)
      : null;

    const rawRows = useSyncExternalStore(
      useMemo(() => evolu.subscribeQuery(sqlQueryString), [sqlQueryString]),
      evolu.getQuery(sqlQueryString),
      constNull
    );

    const filterMapRef = useRef(initialFilterMap);

    const getRowFromCache = (rawRow: SqliteRow): SqliteRow => {
      if (cache.has(rawRow)) return cache.get(rawRow) as SqliteRow;
      const row = filterMapRef.current(rawRow as never) as SqliteRow;
      cache.set(rawRow, row);
      return row;
    };

    const rows = useMemo(() => {
      if (!filterMapRef.current || rawRows == null) return rawRows;
      const rows: Array<SqliteRow> = [];
      for (let i = 0; i < rawRows.length; i++) {
        const row = getRowFromCache(rawRows[i]);
        if (row != null) rows.push(row);
      }
      return rows;
    }, [rawRows]);

    return useMemo(
      () => ({
        rows: rows || readonlyArray.empty,
        row: (rows && rows[0]) || null,
        isLoaded: rows != null,
      }),
      [rows]
    );
  };

  const useMutation: UseMutation<S> = () =>
    useMemo(() => ({ mutate: evolu.mutate }), []);

  const useEvoluError: Hooks<S>["useEvoluError"] = () =>
    useSyncExternalStore(evolu.subscribeError, evolu.getError, constNull);

  const useOwner: Hooks<S>["useOwner"] = () =>
    useSyncExternalStore(evolu.subscribeOwner, evolu.getOwner, constNull);

  const useOwnerActions: Hooks<S>["useOwnerActions"] = () => evolu.ownerActions;

  return {
    useQuery,
    useMutation,
    useEvoluError,
    useOwner,
    useOwnerActions,
  };
};
