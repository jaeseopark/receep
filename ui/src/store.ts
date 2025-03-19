import { Signal, signal } from "@preact/signals";

import { Category, Receipt, Transaction, UserInfo, Vendor } from "@/types";

const useUpdatingSignal = <T>({ uniqueKey }: { uniqueKey: keyof T }) => {
  const sig: Signal<T[]> = signal([]);
  const upsert = (items: T[]) => {
    const keyToIndexMap = sig.value.reduce(
      (acc, next, i) => {
        acc[next[uniqueKey] as number | string] = i;
        return acc;
      },
      {} as Record<number | string, number>,
    );
    sig.value = [...sig.value, ...items].reduce((acc, next) => {
      const key = next[uniqueKey] as number | string;
      const i = keyToIndexMap[key];
      if (typeof i === "undefined") {
        acc.push(next);
        keyToIndexMap[key] = acc.length - 1;
      } else {
        acc[i] = next;
      }
      return acc;
    }, [] as T[]);
  };
  /**
   * Removes old item with key == oldKey and inserts the new item at the same index.
   * @param oldKey The key of the old item to remove.
   * @param item The item to replace the old item with.
   */
  const replace = (oldKey: number | string, item: T) => {
    sig.value = sig.value.reduce((acc, next) => {
      const resolvedKey = next[uniqueKey];
      if (resolvedKey === oldKey) {
        acc.push(item);
      } else {
        acc.push(next);
      }
      return acc;
    }, [] as T[]);
  };

  const remove = (key: number | string) => {
    sig.value = sig.value.filter((item) => item[uniqueKey] !== key);
  };

  return { sig, upsert, replace, remove };
};

export const { sig: sigTransactions, upsert: upsertTransactions } = useUpdatingSignal<Transaction>({ uniqueKey: "id" });

export const {
  sig: sigReceipts,
  upsert: upsertReceipts,
  replace: replaceReceipt,
  remove: removeReceipt,
} = useUpdatingSignal<Receipt>({ uniqueKey: "id" });

export const { sig: sigVendors, upsert: upsertVendors } = useUpdatingSignal<Vendor>({ uniqueKey: "id" });

export const { sig: sigCategories, upsert: upsertCategories } = useUpdatingSignal<Category>({ uniqueKey: "id" });

export const sigUserInfo = signal<UserInfo>();
