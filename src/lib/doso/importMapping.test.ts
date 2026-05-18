import assert from "node:assert/strict";
import test from "node:test";

import { mapRawCrawlerImportItem } from "./importMapping.ts";

test("maps Cheonyu description images as description-only candidates", () => {
  const mapped = mapRawCrawlerImportItem({
    productCode: "cy-88004",
    title: "미피 미니 백팩",
    description: "",
    images: ["https://cheonyu.com/_DATA/product/88000/thumb/88004.jpg"],
    descriptionImages: [
      "https://image4.cheonyu.com/202601061767672666.jpg",
      "https://image4.cheonyu.com/202601061767672671.jpg",
    ],
  });

  assert.deepEqual(mapped._images, [
    {
      url: "https://cheonyu.com/_DATA/product/88000/thumb/88004.jpg",
      isProduct: true,
      isDescription: false,
    },
    {
      url: "https://image4.cheonyu.com/202601061767672666.jpg",
      isProduct: false,
      isDescription: true,
    },
    {
      url: "https://image4.cheonyu.com/202601061767672671.jpg",
      isProduct: false,
      isDescription: true,
    },
  ]);
});

test("preserves existing crawler image roles", () => {
  const mapped = mapRawCrawlerImportItem({
    productCode: "x-1",
    title: "Existing roles",
    _images: [
      { url: "https://example.com/main.jpg", isProduct: true, isDescription: false },
      { url: "https://example.com/detail.jpg", isProduct: false, isDescription: true },
    ],
  });

  assert.deepEqual(mapped._images, [
    { url: "https://example.com/main.jpg", isProduct: true, isDescription: false },
    { url: "https://example.com/detail.jpg", isProduct: false, isDescription: true },
  ]);
});
