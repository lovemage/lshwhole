import { supabaseAdmin } from "@/lib/supabase";
import { decryptDosoPassword, encryptDosoPassword } from "@/lib/doso/credentialCrypto";
import type { DosoCredentialSource } from "@/lib/doso/targets";

const CREDENTIALS_KEYS: Record<DosoCredentialSource, string> = {
  doso: "doso_credentials_v1",
  toybox: "toybox_credentials_v1",
  kidsvillage: "kidsvillage_credentials_v1",
};

export type CredentialSource = DosoCredentialSource;

interface StoredDosoCredentialsValue {
  username: string;
  password_encrypted?: string;
  iv?: string;
  tag?: string;
  updated_at?: string;
}

const readStoredValue = async (source: CredentialSource): Promise<StoredDosoCredentialsValue | null> => {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("system_settings")
    .select("value")
    .eq("key", CREDENTIALS_KEYS[source])
    .maybeSingle<{ value: StoredDosoCredentialsValue }>();

  if (error) {
    throw new Error(error.message);
  }

  const value = data?.value;
  if (!value || typeof value !== "object") {
    return null;
  }

  return value;
};

export const getSavedDosoCredentialStatus = async () => {
  const value = await readStoredValue("doso");
  return {
    username: value?.username || "",
    has_password: Boolean(value?.password_encrypted && value?.iv && value?.tag),
  };
};

export const getSavedCredentialStatus = async (source: CredentialSource) => {
  const value = await readStoredValue(source);
  return {
    username: value?.username || "",
    has_password: Boolean(value?.password_encrypted && value?.iv && value?.tag),
  };
};

export const saveDosoCredentials = async (input: {
  username: string;
  password?: string;
}) => {
  return saveCredentials("doso", input);
};

export const saveCredentials = async (
  source: CredentialSource,
  input: {
    username: string;
    password?: string;
  }
) => {
  const username = input.username.trim();
  if (!username) {
    throw new Error("missing_username");
  }

  const current = await readStoredValue(source);
  const hasIncomingPassword = typeof input.password === "string" && input.password.length > 0;
  const usernameChanged = Boolean(current?.username && current.username !== username);

  let encrypted = {
    password_encrypted: current?.password_encrypted,
    iv: current?.iv,
    tag: current?.tag,
  };

  if (hasIncomingPassword) {
    encrypted = encryptDosoPassword(input.password as string);
  } else if (usernameChanged) {
    encrypted = {
      password_encrypted: undefined,
      iv: undefined,
      tag: undefined,
    };
  }

  const admin = supabaseAdmin();
  const value: StoredDosoCredentialsValue = {
    username,
    password_encrypted: encrypted.password_encrypted,
    iv: encrypted.iv,
    tag: encrypted.tag,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("system_settings")
    .upsert(
      {
        key: CREDENTIALS_KEYS[source],
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

  if (error) {
    throw new Error(error.message);
  }

  return {
    username,
    has_password: Boolean(value.password_encrypted && value.iv && value.tag),
  };
};

export const getSavedDosoCredentialsForLogin = async () => {
  return getSavedCredentialsForLogin("doso");
};

export const getSavedCredentialsForLogin = async (source: CredentialSource) => {
  const value = await readStoredValue(source);
  if (!value?.username || !value.password_encrypted || !value.iv || !value.tag) {
    return null;
  }

  let password = "";
  try {
    password = decryptDosoPassword({
      password_encrypted: value.password_encrypted,
      iv: value.iv,
      tag: value.tag,
    });
  } catch {
    return null;
  }

  return {
    username: value.username,
    password,
  };
};
