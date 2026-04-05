export interface DosoProbeTargetResult {
  url: string;
  title: string;
  list_ok: boolean;
  list_count_page: number;
  samples: Array<{
    id: string;
    title: string;
    price_twd?: number | null;
    price_jpy?: number | null;
    detail_url?: string | null;
  }>;
  detail_ok: boolean;
  detail_fields_presence: {
    title: boolean;
    price: boolean;
    images: boolean;
    description: boolean;
    specs: boolean;
  };
  error?: string;
}

export interface DosoProbeRequestBody {
  username: string;
  password: string;
  targets?: string[];
}

export interface DosoProbeResponse {
  login_ok: boolean;
  targets: DosoProbeTargetResult[];
  error?: string;
}

export interface DosoImportProduct {
  productCode: string;
  title: string;
  description: string;
  url: string | null;
  images: string[];
  wholesalePriceTWD?: number;
  wholesalePriceJPY?: number;
}

export interface DosoImportTargetResult {
  url: string;
  title: string;
  count: number;
  error?: string;
}

export interface DosoImportResponse {
  login_ok: boolean;
  products: DosoImportProduct[];
  targets: DosoImportTargetResult[];
  error?: string;
}
