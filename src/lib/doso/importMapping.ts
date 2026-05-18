export interface CrawlerCandidateImage {
  url: string;
  isProduct: boolean;
  isDescription: boolean;
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x || "").trim()).filter(Boolean);
};

const unique = (values: string[]) => Array.from(new Set(values));

const normalizeCandidateImages = (value: unknown): CrawlerCandidateImage[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((img) => ({
      url: String(img?.url || "").trim(),
      isProduct: Boolean(img?.isProduct),
      isDescription: Boolean(img?.isDescription),
    }))
    .filter((img) => img.url);
};

export const mapRawCrawlerImportItem = (it: any) => {
  const images = Array.isArray(it.images)
    ? toStringArray(it.images)
    : Array.isArray(it.imgs)
      ? toStringArray(it.imgs)
      : Array.isArray(it.imageUrls)
        ? toStringArray(it.imageUrls)
        : it.image
          ? [String(it.image).trim()].filter(Boolean)
          : [];

  const descriptionImages = unique([
    ...toStringArray(it.descriptionImages),
    ...toStringArray(it.description_images),
    ...toStringArray(it.descImages),
  ]);
  const descriptionImageSet = new Set(descriptionImages);
  const existingImages = normalizeCandidateImages(it._images);
  const _images = existingImages.length > 0
    ? existingImages
    : [
        ...images
          .filter((url) => !descriptionImageSet.has(url))
          .map((url) => ({ url, isProduct: true, isDescription: false })),
        ...descriptionImages.map((url) => ({ url, isProduct: false, isDescription: true })),
      ];

  return {
    productCode: it.productCode || it.code || it.sku || it.id || "無代碼",
    title: it.title || it.name || "無標題",
    description: it.description || it.desc || "",
    wholesalePriceJPY: it.wholesalePriceJPY || it.priceJPY || it.price_jpy || it.jpy || null,
    wholesalePriceKRW: it.wholesalePriceKRW || it.priceKRW || it.price_krw || it.krw || null,
    wholesalePriceTWD: it.wholesalePriceTWD || it.priceTWD || it.twd || null,
    url: it.url || it.link || null,
    sourceCategoryId: it.sourceCategoryId || it.source_category_id || it.category_id || null,
    sourceCategoryName: it.sourceCategoryName || it.source_category_name || it.category_name || null,
    sourceDirectoryUrl: it.sourceDirectoryUrl || it.source_directory_url || null,
    images,
    descriptionImages,
    _images,
  };
};
