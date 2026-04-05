import { supabaseAdmin } from "@/lib/supabase";
import { decryptDosoPassword, encryptDosoPassword } from "@/lib/doso/credentialCrypto";

const DOSO_CREDENTIALS_KEY = "doso_credentials_v1";

interface StoredDosoCredentialsValue {
  username: string;
  password_encrypted?: string;
  iv?: string;
  tag?: string;
  updated_at?: string;
}

const readStoredValue = async (): Promise<StoredDosoCredentialsValue | null> => {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("system_settings")
    .select("value")
    .eq("key", DOSO_CREDENTIALS_KEY)
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
  const value = await readStoredValue();
  return {
    username: value?.username || "",
    has_password: Boolean(value?.password_encrypted && value?.iv && value?.tag),
  };
};

export const saveDosoCredentials = async (input: {
  username: string;
  password?: string;
}) => {
  const username = input.username.trim();
  if (!username) {
    throw new Error("missing_username");
  }

  const current = await readStoredValue();
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
        key: DOSO_CREDENTIALS_KEY,
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
  const value = await readStoredValue();
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
