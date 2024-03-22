"use server";
import { kv } from "@vercel/kv";

export const getCacheKey = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await kv.get<T>(key);
    return data;
  } catch (error) {
    return null;
  }
};

export const setCacheKey = async <T = unknown>(key: string, value: T) => {
  try {
    await kv.set(key, value);
  } catch (error) {}
};
