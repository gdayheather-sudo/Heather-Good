import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, extra?: unknown) {
  return NextResponse.json({ error: message, details: extra }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof HttpError) return fail(err.status, err.message);
  if (err instanceof ZodError) {
    return fail(400, "Invalid input", err.flatten());
  }
  console.error("[api] unhandled error", err);
  return fail(500, "Something went wrong");
}
