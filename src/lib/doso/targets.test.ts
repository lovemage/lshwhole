import assert from "node:assert/strict";
import test from "node:test";

import { getSourceByTargetUrl, getTargetOptionByUrl } from "./targets.ts";

test("recognizes Cheonyu pasted list URLs as a supported sync source", () => {
  const url = "https://cheonyu.com/product/list.html?cateIDX=1";

  assert.equal(getSourceByTargetUrl(url), "cheonyu");
  assert.equal(getTargetOptionByUrl(url)?.label, "Cheonyu 雜貨");
});
