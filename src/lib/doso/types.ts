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
  username?: string;
  password?: string;
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
  wholesalePriceTWD?: number | null;
  wholesalePriceJPY?: number | null;
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

export type DosoImportSessionStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export interface DosoImportSessionProgress {
  session_id: number;
  status: DosoImportSessionStatus;
  total_count: number;
  processed_count: number;
  imported_count: number;
  skipped_count: number;
  failed_count: number;
  last_checkpoint_product_code?: string | null;
  error_message?: string | null;
}

export interface DosoImportStartRequest {
  username?: string;
  password?: string;
  target_url: string;
  targetUrl?: string;
}

export interface DosoImportStartResponse {
  ok?: true;
  login_ok: boolean;
  session: DosoImportSessionProgress;
}

export interface DosoImportStartErrorResponse {
  ok?: false;
  error: string;
  session?: DosoImportSessionProgress;
  login_ok?: boolean;
}

export interface DosoImportRunRequest {
  batch_size?: number;
  batchSize?: number;
}

export interface DosoImportRunResponse {
  ok?: true;
  session: DosoImportSessionProgress;
  products: DosoImportProduct[];
  processed_in_batch: number;
  imported_in_batch: number;
  skipped_in_batch: number;
  failed_in_batch: number;
}

export interface DosoImportRunErrorResponse {
  ok?: false;
  error: string;
  session?: DosoImportSessionProgress;
}

export interface DosoImportProgressResponse {
  ok?: true;
  session: DosoImportSessionProgress;
}

export interface DosoImportProgressErrorResponse {
  ok?: false;
  error: string;
  session?: DosoImportSessionProgress;
}

export interface DosoImportPauseResponse {
  ok?: true;
  session: DosoImportSessionProgress;
}

export interface DosoImportPauseErrorResponse {
  ok?: false;
  error: string;
  session?: DosoImportSessionProgress;
}

export type DosoImportStartApiResponse =
  | DosoImportStartResponse
  | DosoImportStartErrorResponse;

export type DosoImportRunApiResponse =
  | DosoImportRunResponse
  | DosoImportRunErrorResponse;

export type DosoImportProgressApiResponse =
  | DosoImportProgressResponse
  | DosoImportProgressErrorResponse;

export type DosoImportPauseApiResponse =
  | DosoImportPauseResponse
  | DosoImportPauseErrorResponse;

export interface DosoCredentialsResponse {
  ok: true;
  username: string;
  has_password: boolean;
}

export interface DosoCredentialsErrorResponse {
  ok: false;
  error: string;
}

export type DosoCredentialsApiResponse =
  | DosoCredentialsResponse
  | DosoCredentialsErrorResponse;
