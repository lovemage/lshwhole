import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SETTING_KEY = 'display_settings';
const DEFAULT_SETTINGS = { popular: [], korea: [], japan: [], thailand: [] };

async function getSettingsFromDB() {
    const admin = supabaseAdmin();
    const { data, error } = await admin
        .from('system_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .single();

    if (error) {
        console.warn("Error reading display settings from DB (might not exist yet):", error);
        return DEFAULT_SETTINGS;
    }

    return data?.value || DEFAULT_SETTINGS;
}

async function saveSettingsToDB(settings: any) {
    const admin = supabaseAdmin();
    const { error } = await admin
        .from('system_settings')
        .upsert({
            key: SETTING_KEY,
            value: settings,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

    if (error) {
        console.error("Error saving display settings to DB:", error);
        return false;
    }
    return true;
}

export async function GET(request: NextRequest) {
    const settings = await getSettingsFromDB();
    return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const currentSettings = await getSettingsFromDB();
        const newSettings = { ...currentSettings, ...body };

        if (await saveSettingsToDB(newSettings)) {
            return NextResponse.json({ success: true, settings: newSettings });
        } else {
            return NextResponse.json({ error: "Failed to save settings to database" }, { status: 500 });
        }
    } catch (error) {
        console.error("Error in POST /api/display-settings:", error);
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
