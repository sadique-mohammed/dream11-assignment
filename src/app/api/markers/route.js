import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const markerFile = path.join(process.cwd(), "data", "match-minute-markers.json");

async function readMarkers() {
  try {
    const contents = await readFile(markerFile, "utf8");
    const parsed = JSON.parse(contents);
    return Array.isArray(parsed.markers) ? parsed.markers : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeMarkers(markers) {
  await mkdir(path.dirname(markerFile), { recursive: true });
  await writeFile(markerFile, `${JSON.stringify({ markers }, null, 2)}\n`, "utf8");
}

function unavailable() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "The marker tool is available only in local development." }, { status: 404 });
  }
  return null;
}

export async function GET() {
  const response = unavailable();
  if (response) return response;
  try {
    return NextResponse.json({ markers: await readMarkers() });
  } catch {
    return NextResponse.json({ error: "Could not read the marker JSON file." }, { status: 500 });
  }
}

export async function POST(request) {
  const response = unavailable();
  if (response) return response;
  try {
    const body = await request.json();
    const matchMinute = typeof body.matchMinute === "string" ? body.matchMinute.trim() : "";
    const videoTimeSeconds = body.videoTimeSeconds;
    if (!matchMinute || matchMinute.length > 24 || !Number.isFinite(videoTimeSeconds) || videoTimeSeconds < 0) {
      return NextResponse.json({ error: "Provide a match clock label and a valid nonnegative video time." }, { status: 400 });
    }
    const markers = await readMarkers();
    markers.push({ id: randomUUID(), matchMinute, videoTimeSeconds, savedAt: new Date().toISOString() });
    await writeMarkers(markers);
    return NextResponse.json({ markers }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save the marker JSON file." }, { status: 500 });
  }
}

export async function DELETE(request) {
  const response = unavailable();
  if (response) return response;
  try {
    const { id } = await request.json();
    if (typeof id !== "string") return NextResponse.json({ error: "Provide a marker ID." }, { status: 400 });
    const markers = (await readMarkers()).filter((marker) => marker.id !== id);
    await writeMarkers(markers);
    return NextResponse.json({ markers });
  } catch {
    return NextResponse.json({ error: "Could not update the marker JSON file." }, { status: 500 });
  }
}
