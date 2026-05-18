import assert from "node:assert/strict";
import test from "node:test";

import {
  extractCheonyuProductCode,
  parseCheonyuPriceKRW,
  type CheonyuDetailSnapshot,
  type CheonyuListRowSnapshot,
  CHEONYU_LOGIN_SUBMIT_SELECTOR,
  mapCheonyuListRowToProduct,
  mergeCheonyuDetailIntoProduct,
} from "./cheonyu.ts";

test("Cheonyu login submit selector includes image submit buttons", () => {
  assert.match(CHEONYU_LOGIN_SUBMIT_SELECTOR, /input\[type="image"\]/);
});

test("extracts Cheonyu product code from detail URL", () => {
  assert.equal(extractCheonyuProductCode("https://cheonyu.com/product/view.html?qIDX=91879"), "cy-91879");
});

test("parses Cheonyu KRW price text", () => {
  assert.equal(parseCheonyuPriceKRW("2개 이상 구매시 할인 40% 2,520 원"), 2520);
});

test("maps a Cheonyu list card to import product shape", () => {
  const row: CheonyuListRowSnapshot = {
    detailUrl: "https://cheonyu.com/product/view.html?qIDX=91879",
    title: "초등 SKY 스카이 오답노트",
    image: "https://cheonyu.com/_DATA/product/91800/thumb/91879_1777879883.jpg",
    priceText: "2개 이상 40% 2,520원",
    sourceCategoryId: "cheonyu:category:1",
    sourceCategoryName: "문구",
  };

  assert.deepEqual(mapCheonyuListRowToProduct("https://cheonyu.com/product/list.html?cateIDX=1", row), {
    productCode: "cy-91879",
    title: "초등 SKY 스카이 오답노트",
    description: "",
    url: "https://cheonyu.com/product/view.html?qIDX=91879",
    images: ["https://cheonyu.com/_DATA/product/91800/thumb/91879_1777879883.jpg"],
    wholesalePriceTWD: 60,
    wholesalePriceKRW: 2520,
    sourceDirectoryUrl: "https://cheonyu.com/product/list.html?cateIDX=1",
    sourceCategoryId: "cheonyu:category:1",
    sourceCategoryName: "문구",
  });
});

test("merges Cheonyu detail data with description long images separated from product images", () => {
  const detail: CheonyuDetailSnapshot = {
    title: "초등 SKY 스카이 오답노트",
    priceKRW: 2520,
    mainImages: ["https://cheonyu.com/_DATA/product/91800/91879_1777879883.jpg"],
    descriptionHtml: '<img src="https://image1.cheonyu.com/202605041777879897.jpg"><br style="clear:both;">',
    descriptionImages: ["https://image1.cheonyu.com/202605041777879897.jpg"],
  };

  const product = mapCheonyuListRowToProduct("https://cheonyu.com/product/list.html?cateIDX=1", {
    detailUrl: "https://cheonyu.com/product/view.html?qIDX=91879",
    title: "old title",
    image: "https://cheonyu.com/_DATA/product/91800/thumb/91879_1777879883.jpg",
    priceText: "",
  });

  assert.ok(product);
  assert.deepEqual(mergeCheonyuDetailIntoProduct(product, detail), {
    ...product,
    title: "초등 SKY 스카이 오답노트",
    description: "",
    images: [
      "https://cheonyu.com/_DATA/product/91800/thumb/91879_1777879883.jpg",
      "https://cheonyu.com/_DATA/product/91800/91879_1777879883.jpg",
    ],
    descriptionImages: ["https://image1.cheonyu.com/202605041777879897.jpg"],
    wholesalePriceTWD: 60,
    wholesalePriceKRW: 2520,
  });
});

test("keeps Cheonyu textual detail description when present", () => {
  const product = mapCheonyuListRowToProduct("https://cheonyu.com/product/list.html?cateIDX=1", {
    detailUrl: "https://cheonyu.com/product/view.html?qIDX=91880",
    title: "old title",
    image: "https://cheonyu.com/_DATA/product/91800/thumb/91880.jpg",
    priceText: "",
  });

  assert.ok(product);
  assert.equal(
    mergeCheonyuDetailIntoProduct(product, {
      title: "상품명",
      priceKRW: null,
      mainImages: [],
      descriptionHtml: "<p>상품 설명</p>",
      descriptionImages: [],
    }).description,
    "<p>상품 설명</p>"
  );
});
