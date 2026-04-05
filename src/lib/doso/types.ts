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
