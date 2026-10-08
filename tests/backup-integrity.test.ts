import assert from "node:assert/strict";
import test from "node:test";
import { backupDataChecksum, checksumJson } from "../src/modules/finance/backup-integrity";

test("back-upchecksums zijn deterministisch en reageren op gewijzigde data", () => {
  const data = { accounts: [{ id: "a", balance: 10 }], transactions: [] };
  assert.equal(backupDataChecksum(data), backupDataChecksum(structuredClone(data)));
  assert.notEqual(backupDataChecksum(data), backupDataChecksum({ ...data, accounts: [{ id: "a", balance: 11 }] }));
  assert.equal(checksumJson(data.accounts), checksumJson([{ id: "a", balance: 10 }]));
});
