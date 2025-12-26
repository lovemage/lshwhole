import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const DATA_FILE_PATH = path.join(process.cwd(), "src", "data", "admin_sub_accounts.json");

function getSubAccountsData(): { user_id: string; permissions: string[] }[] {
    if (!fs.existsSync(DATA_FILE_PATH)) {
        return [];
    }
    const fileContent = fs.readFileSync(DATA_FILE_PATH, "utf-8");
    try {
        return JSON.parse(fileContent);
    } catch (error) {
        return [];
    }
}

function saveSubAccountsData(data: { user_id: string; permissions: string[] }[]) {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

async function requireAdmin(request: NextRequest) {
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
        return { ok: false as const, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await client.auth.getUser();
    if (userErr || !user) {
        return { ok: false as const, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }

    const admin = supabaseAdmin();
    const { data: profile } = await admin
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();

    if (!profile || !profile.is_admin) {
        return { ok: false as const, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }

    return { ok: true as const };
}

export async function GET(request: NextRequest) {
    try {
        const guard = await requireAdmin(request);
        if (!guard.ok) return guard.error;

        const admin = supabaseAdmin();
        const subAccountsData = getSubAccountsData();

        // Fetch user details for each sub-account
        const subAccountsWithDetails = await Promise.all(
            subAccountsData.map(async (account) => {
                const { data: { user }, error } = await admin.auth.admin.getUserById(account.user_id);
                if (error || !user) {
                    return { ...account, email: "Unknown", name: "Unknown", active: false };
                }

                // Fetch profile for name
                const { data: profile } = await admin
                    .from("profiles")
                    .select("display_name")
                    .eq("user_id", account.user_id)
                    .single();

                return {
                    ...account,
                    email: user.email,
                    name: profile?.display_name || user.user_metadata?.full_name || "Admin",
                    active: true,
                    created_at: user.created_at
                };
            })
        );

        return NextResponse.json(subAccountsWithDetails);
    } catch (error) {
        console.error("GET /api/admin/sub-accounts error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const guard = await requireAdmin(request);
        if (!guard.ok) return guard.error;

        const body = await request.json();
        const { email, password, name, permissions } = body as {
            email?: string;
            password?: string;
            name?: string;
            permissions?: string[];
        };

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const admin = supabaseAdmin();

        // 1. Create user in Supabase Auth
        const { data: { user }, error: createError } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: name }
        });

        if (createError || !user) {
            return NextResponse.json({ error: createError?.message || "Failed to create user" }, { status: 400 });
        }

        // 2. Update profile is_admin
        const { error: updateError } = await admin
            .from("profiles")
            .update({ display_name: name, is_admin: true })
            .eq("user_id", user.id);

        if (updateError) {
            // If update failed (maybe profile doesn't exist yet?), try insert (upsert)
            await admin.from("profiles").upsert({
                user_id: user.id,
                email: email,
                display_name: name,
                is_admin: true
            });
        }

        // 3. Save to JSON
        const subAccountsData = getSubAccountsData();
        const newAccount = {
            user_id: user.id,
            permissions: permissions || []
        };
        subAccountsData.push(newAccount);
        saveSubAccountsData(subAccountsData);

        return NextResponse.json({ success: true, user: newAccount });
    } catch (error) {
        console.error("POST /api/admin/sub-accounts error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const guard = await requireAdmin(request);
        if (!guard.ok) return guard.error;

        const body = await request.json();
        const { user_id, permissions, password, name } = body as {
            user_id?: string;
            permissions?: string[];
            password?: string;
            name?: string;
        };

        if (!user_id) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const admin = supabaseAdmin();

        // 1. Update password if provided
        if (password) {
            const { error: passError } = await admin.auth.admin.updateUserById(user_id, { password });
            if (passError) {
                return NextResponse.json({ error: passError.message }, { status: 400 });
            }
        }

        // 2. Update name if provided
        if (name) {
            await admin
                .from("profiles")
                .update({ display_name: name })
                .eq("user_id", user_id);
        }

        // 3. Update permissions in JSON
        const subAccountsData = getSubAccountsData();
        const index = subAccountsData.findIndex((acc) => acc.user_id === user_id);

        if (index !== -1) {
            subAccountsData[index].permissions = permissions || [];
            saveSubAccountsData(subAccountsData);
        } else {
            // If not in JSON but exists (maybe manually added?), add it
            subAccountsData.push({ user_id, permissions: permissions || [] });
            saveSubAccountsData(subAccountsData);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PUT /api/admin/sub-accounts error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const guard = await requireAdmin(request);
        if (!guard.ok) return guard.error;

        const { searchParams } = new URL(request.url);
        const user_id = searchParams.get("user_id");

        if (!user_id) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const admin = supabaseAdmin();

        // 1. Delete user from Supabase Auth
        const { error: deleteError } = await admin.auth.admin.deleteUser(user_id);
        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 400 });
        }

        // 2. Remove from JSON
        const subAccountsData = getSubAccountsData();
        const newData = subAccountsData.filter((acc) => acc.user_id !== user_id);
        saveSubAccountsData(newData);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/admin/sub-accounts error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
