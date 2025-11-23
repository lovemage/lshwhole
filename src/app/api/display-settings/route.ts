import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE_PATH = path.join(process.cwd(), "src", "data", "display_settings.json");

function getSettings() {
    if (!fs.existsSync(DATA_FILE_PATH)) {
        return { popular: [], korea: [], japan: [], thailand: [] };
    }
    try {
        const data = fs.readFileSync(DATA_FILE_PATH, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading display settings:", error);
        return { popular: [], korea: [], japan: [], thailand: [] };
    }
}

function saveSettings(settings: any) {
    try {
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(settings, null, 2), "utf-8");
        return true;
    } catch (error) {
        console.error("Error saving display settings:", error);
        return false;
    }
}

export async function GET(request: NextRequest) {
    const settings = getSettings();
    return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        // Validate body structure if needed, for now assume it's correct
        const currentSettings = getSettings();
        const newSettings = { ...currentSettings, ...body };

        if (saveSettings(newSettings)) {
            return NextResponse.json({ success: true, settings: newSettings });
        } else {
            return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
