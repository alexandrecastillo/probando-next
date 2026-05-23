import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const external = url.searchParams.get("external_reference");
    if (!external) {
      return NextResponse.json({ error: "external_reference required" }, { status: 400 });
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || "";
    const mpUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(external)}`;

    const res = await fetch(mpUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    console.error("Error checking payment:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
