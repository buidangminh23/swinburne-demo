import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

function installLocalStorage(seed = {}) {
  const state = new Map(Object.entries(seed));
  globalThis.localStorage = {
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    setItem(key, value) {
      state.set(key, String(value));
    },
    removeItem(key) {
      state.delete(key);
    }
  };
}

test("every equipment item always has five units", async () => {
  const storeSource = readFileSync(new URL("../src/store.js", import.meta.url), "utf8");
  const seedVersion = storeSource.match(/const SEED_VERSION = "([^"]+)"/)?.[1] ?? "";
  installLocalStorage({ "swin-demo-seed-version": seedVersion });

  const { store } = await import(`../src/store.js?stock=${Date.now()}`);

  const seeded = await store.listEquipment();
  assert.ok(seeded.length > 0);
  assert.ok(seeded.every((item) => item.totalQuantity === 5));

  const created = await store.createEquipment({
    assetCode: "STOCK-TEST",
    name: "Stock Test",
    category: "Teaching",
    location: "HN-ATC-600",
    totalQuantity: 99
  });
  assert.equal(created.totalQuantity, 5);

  const updated = await store.updateEquipment(created.id, { totalQuantity: 1 });
  assert.equal(updated.totalQuantity, 5);
});

test("saved equipment stock is normalized to five units", async () => {
  const storeSource = readFileSync(new URL("../src/store.js", import.meta.url), "utf8");
  const seedVersion = storeSource.match(/const SEED_VERSION = "([^"]+)"/)?.[1] ?? "";
  installLocalStorage({
    "swin-demo-seed-version": seedVersion,
    "swin-demo-equipment": JSON.stringify([
      {
        id: 999,
        assetCode: "OLD-STOCK",
        name: "Old Stock",
        category: "Teaching",
        location: "HN-ATC-600",
        status: "AVAILABLE",
        totalQuantity: 99
      }
    ])
  });

  const { store } = await import(`../src/store.js?savedStock=${Date.now()}`);

  const [item] = await store.listEquipment();
  assert.equal(item.totalQuantity, 5);
});
