import { NextResponse } from "next/server";

export async function GET() {
  const BOT_TOKEN_SET = !!process.env.BOT_TOKEN;
  const TOKEN_PREFIX = process.env.BOT_TOKEN?.substring(0, 10) || "NOT SET";

  return NextResponse.json({
    bot_token_set: BOT_TOKEN_SET,
    bot_token_prefix: TOKEN_PREFIX,
    bot_username: BOT_TOKEN_SET ? "tawabeer_bot" : "unknown",
  });
}
