import assert from "node:assert/strict";
import test from "node:test";

import { evaluateTicket, generateQuickPick, validateNumbers } from "./mega645.ts";

const draw = [1, 2, 3, 4, 5, 6];

test("xếp đúng bốn hạng giải Mega 6/45", () => {
  assert.equal(evaluateTicket([1, 2, 3, 4, 5, 6], draw).tier, "JACKPOT");
  assert.equal(evaluateTicket([1, 2, 3, 4, 5, 7], draw).tier, "FIRST");
  assert.equal(evaluateTicket([1, 2, 3, 4, 7, 8], draw).tier, "SECOND");
  assert.equal(evaluateTicket([1, 2, 3, 7, 8, 9], draw).tier, "THIRD");
  assert.equal(evaluateTicket([1, 2, 7, 8, 9, 10], draw).tier, "NONE");
});

test("từ chối vé trùng số hoặc ngoài khoảng 01–45", () => {
  assert.equal(validateNumbers([1, 1, 2, 3, 4, 5]), false);
  assert.equal(validateNumbers([0, 1, 2, 3, 4, 5]), false);
  assert.equal(validateNumbers([1, 2, 3, 4, 5, 46]), false);
});

test("Quick Pick luôn tạo 6 số duy nhất và hợp lệ", () => {
  for (let run = 0; run < 100; run += 1) {
    assert.equal(validateNumbers(generateQuickPick()), true);
  }
});
