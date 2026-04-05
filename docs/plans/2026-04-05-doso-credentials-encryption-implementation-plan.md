# DOSO Credentials Encryption & Guide Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add persistent encrypted DOSO credentials for admin import/probe workflows, and add a "使用方式" link that opens a usage guide modal in the crawler import UI.

**Architecture:** Store a single shared credential record in `system_settings` under `doso_credentials_v1`. Encrypt/decrypt DOSO password server-side using AES-256-GCM and an environment key, never returning plaintext to the frontend. Update start/probe APIs to use request credentials first, then fallback to saved credentials. Add admin credential management UI and a help modal in `CrawlerImport`.

**Tech Stack:** Next.js App Router (API routes), TypeScript, Node `crypto`, Supabase (`system_settings`), React state in `CrawlerImport.tsx`, ESLint, `tsc --noEmit`.

---

### Task 1: Add encryption utility for DOSO credentials

**Files:**
- Create: `src/lib/doso/credentialCrypto.ts`

**Step 1: Write failing compile check in planned API import**

```ts
import { encryptDosoPassword } from "@/lib/doso/credentialCrypto";
```

Expected: module not found before file creation.

**Step 2: Run type check to verify it fails**

Run: `npx tsc --noEmit`
Expected: cannot find module / exported symbol.

**Step 3: Write minimal implementation**

Add functions:

```ts
export function getDosoEncryptionKey(): Buffer;
export function encryptDosoPassword(password: string): { password_encrypted: string; iv: string; tag: string };
export function decryptDosoPassword(input: { password_encrypted: string; iv: string; tag: string }): string;
```

Rules:
- AES-256-GCM
- key from `DOSO_CREDENTIALS_ENCRYPTION_KEY`
- throw stable error codes/messages (`missing_encryption_key`, `decrypt_failed`, etc.)

**Step 4: Run checks**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/lib/doso/credentialCrypto.ts`

Expected: pass.

**Step 5: Commit**

```bash
git add src/lib/doso/credentialCrypto.ts
git commit -m "新增DOSO帳密加解密工具"
```

### Task 2: Add API for reading/saving encrypted DOSO credentials

**Files:**
- Create: `src/app/api/admin/sync/doso/credentials/route.ts`
- Modify: `src/lib/doso/types.ts`

**Step 1: Write failing endpoint checks**

Run:

```bash
curl -i https://lshwholesale.com/api/admin/sync/doso/credentials
curl -i -X PUT https://lshwholesale.com/api/admin/sync/doso/credentials -H 'Content-Type: application/json' -d '{}'
```

Expected: endpoint missing before implementation.

**Step 2: Verify fail state**

Run same commands in local dev route context and confirm missing/invalid.

**Step 3: Write minimal implementation**

`GET`:
- admin auth required
- read `system_settings` key `doso_credentials_v1`
- return `{ ok, username, has_password }`

`PUT`:
- admin auth required
- accept `{ username, password? }`
- if password present and non-empty, encrypt and persist
- if password absent/empty, keep existing encrypted password
- upsert into `system_settings`
- return `{ ok, username, has_password }`

Also add typed DTOs in `src/lib/doso/types.ts`.

**Step 4: Run verification**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/app/api/admin/sync/doso/credentials/route.ts src/lib/doso/types.ts`

Expected: pass.

**Step 5: Commit**

```bash
git add src/app/api/admin/sync/doso/credentials/route.ts src/lib/doso/types.ts
git commit -m "新增DOSO帳密儲存API"
```

### Task 3: Add server-side credential fallback for probe/start

**Files:**
- Modify: `src/app/api/admin/sync/doso/probe/route.ts`
- Modify: `src/app/api/admin/sync/doso/import/start/route.ts`
- Create: `src/lib/doso/credentialStore.ts`

**Step 1: Write failing behavior check**

Case:
- request omits `password`
- saved encrypted credentials exist
- endpoint should still run successfully

Expected now: current logic rejects missing password.

**Step 2: Verify fail state**

Run local request without password and confirm 400.

**Step 3: Write minimal implementation**

In `credentialStore.ts` add:

```ts
export async function getSavedDosoCredentials(): Promise<{ username: string; password: string } | null>
```

Then in `probe/start` route:
- parse request credentials
- if missing, fallback to saved credentials
- enforce priority: request > saved > 400

**Step 4: Run verification**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/app/api/admin/sync/doso/probe/route.ts src/app/api/admin/sync/doso/import/start/route.ts src/lib/doso/credentialStore.ts`

Expected: pass and behavior works.

**Step 5: Commit**

```bash
git add src/app/api/admin/sync/doso/probe/route.ts src/app/api/admin/sync/doso/import/start/route.ts src/lib/doso/credentialStore.ts
git commit -m "導入流程支援已儲存DOSO帳密"
```

### Task 4: Add credential save UI in crawler import

**Files:**
- Modify: `src/components/admin/CrawlerImport.tsx`

**Step 1: Write failing UI checklist**

Current expected failures:
- cannot load saved username/has_password state
- no save credentials action
- password always treated as required for start/probe form

**Step 2: Verify fail state manually**

Run: `npm run dev`
Expected: no credential management area beyond transient input.

**Step 3: Write minimal implementation**

Add UI behavior:
- on mount call `GET /api/admin/sync/doso/credentials`
- show username + `has_password` status
- add `儲存帳密` button calling `PUT /credentials`
- keep password input empty by default and only send if user typed

**Step 4: Run verification**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/components/admin/CrawlerImport.tsx`

Expected: pass.

**Step 5: Commit**

```bash
git add src/components/admin/CrawlerImport.tsx
git commit -m "後台新增DOSO帳密儲存介面"
```

### Task 5: Add "使用方式" link and modal guide

**Files:**
- Modify: `src/components/admin/CrawlerImport.tsx`

**Step 1: Write failing UI checklist**

Current expected failures:
- no usage guide link
- no modal with step-by-step import instructions

**Step 2: Verify fail state manually**

Run UI and confirm no link/modal.

**Step 3: Write minimal implementation**

Add:
- text link `使用方式` near DOSO section title
- modal with ordered steps:
  1) 儲存帳密
  2) 選目錄
  3) 開始導入
  4) 繼續導入
  5) 看進度
  6) 中斷續傳
- close button `我知道了`
- optional `localStorage` guide-seen flag

**Step 4: Run verification**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/components/admin/CrawlerImport.tsx`

Expected: pass and modal works.

**Step 5: Commit**

```bash
git add src/components/admin/CrawlerImport.tsx
git commit -m "新增DOSO導入使用方式彈窗"
```

### Task 6: Add docs and deployment notes

**Files:**
- Modify: `doc/問題描述.md`
- Modify: `docs/plans/2026-04-05-doso-credentials-encryption-design.md` (if implementation deltas)

**Step 1: Write failing docs checklist**

Checklist:
- docs mention encrypted credential storage
- docs mention required env var
- docs mention fallback priority

**Step 2: Verify missing items**

Read docs and mark gaps.

**Step 3: Write minimal doc updates**

Add:
- `DOSO_CREDENTIALS_ENCRYPTION_KEY` requirement
- API usage summary for `/credentials`
- operational notes: rotate key carefully, invalid old ciphertext behavior

**Step 4: Run verification**

Run:
- `npx tsc --noEmit`
- `npm run lint`

Expected: no errors (warnings acceptable per repo baseline).

**Step 5: Commit**

```bash
git add doc/問題描述.md docs/plans/2026-04-05-doso-credentials-encryption-design.md
git commit -m "補充DOSO帳密加密儲存文件"
```

## Final Verification Checklist

- Admin can save shared DOSO username/password.
- Password is encrypted at rest, never returned plaintext.
- Start/probe works without entering password when saved credentials exist.
- Start/probe still works with explicit per-request credentials.
- UI shows `has_password` state.
- Usage guide link opens modal with required steps.
- `npx tsc --noEmit` passes.
- `npm run lint` has no new errors.

## Deployment Checklist

- Set `DOSO_CREDENTIALS_ENCRYPTION_KEY` in production.
- Deploy backend APIs and frontend together.
- Validate with one test import session on production admin account.
