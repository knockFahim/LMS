import ImageKit from "imagekit";
import { NextResponse } from "next/server";

import config from "@/lib/config";

const imagekit = new ImageKit({
  publicKey: config.env.imagekit.publicKey!,
  privateKey: config.env.imagekit.privateKey!,
  urlEndpoint: config.env.imagekit.urlEndpoint!,
});

export async function GET() {
  return NextResponse.json(imagekit.getAuthenticationParameters());
}
