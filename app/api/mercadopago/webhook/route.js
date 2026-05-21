import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { kv } from '@vercel/kv';
import crypto from 'node:crypto';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

const paymentClient = new Payment(client);

const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
const DISCORD_PAGOS_URL = process.env.DISCORD_PAGOS_URL;
const DISCORD_ERROR_URL = process.env.DISCORD_ERROR_URL;

const sendDiscord = async (url, message) => {
  if (!url) return;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: String(message) }),
  });
};

const sendPagoDiscord = async (message) => sendDiscord(DISCORD_PAGOS_URL, message);
const sendErrorDiscord = async (message) => sendDiscord(DISCORD_ERROR_URL, message);

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const headers = request.headers;
    const url = new URL(request.url);
    const dataIdUrl = (url.searchParams.get('data.id') || body.data?.id || '').toLowerCase();
    const xSignature = headers.get('x-signature');
    const xRequestId = headers.get('x-request-id');

    // Validar la firma del webhook según la documentación de Mercado Pago
    if (WEBHOOK_SECRET) {
      if (!xSignature || !xRequestId || !dataIdUrl) {
        console.error('Datos de validación de webhook incompletos', {
          xSignature,
          xRequestId,
          dataIdUrl,
        });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const signatureParts = xSignature
        .split(',')
        .map(part => part.trim().split('='))
        .reduce((acc, [key, value]) => {
          if (!key || !value) return acc;
          acc[key] = value.trim();
          return acc;
        }, {});

      const ts = signatureParts.ts;
      const hash = signatureParts.v1;

      if (!ts || !hash) {
        console.error('Cabecera x-signature inválida', { xSignature });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const manifest = `id:${dataIdUrl};request-id:${xRequestId};ts:${ts};`;
      const expectedHash = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(manifest)
        .digest('hex');

      if (hash !== expectedHash) {
        await sendErrorDiscord(`⚠️ Firma del webhook inválida para evento ${body.type} con ID ${dataIdUrl}`);
        console.error('Firma del webhook inválida', {
          hash,
          expectedHash,
          manifest,
        });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Procesar notificaciones de pago
    if (body.type === 'payment') {
      const paymentId = body.data.id;

      // Obtener detalles del pago
      let payment;

      try {
        payment = await paymentClient.get({ id: paymentId });
      } catch (e) {
        await sendErrorDiscord(`❌ Error obteniendo detalles del pago ${paymentId}: ${e.message}`);
        console.error(`Error obteniendo detalles del pago ${paymentId}:`, e);
        return NextResponse.json({ error: 'Error fetching payment details' }, { status: 200 });
      }

      console.log('Pago recibido:', {
        id: payment.id,
        status: payment.status,
        amount: payment.transaction_amount,
        description: payment.description,
        date_created: payment.date_created,
        date_approved: payment.date_approved,
      });

      await kv.set(`payment:${paymentId}`, {
        id: payment.id,
        status: payment.status,
        amount: payment.transaction_amount,
        description: payment.description,
        date_created: payment.date_created,
        date_approved: payment.date_approved,
        payer: payment.payer,
        metadata: payment.metadata,
      });

      await sendPagoDiscord(`🎉 Nuevo pago recibido!\n\n` +
        `**ID:** ${payment.id}\n` +
        `**Estado:** ${payment.status}\n` +
        `**Monto:** S/ ${payment.transaction_amount}\n` +
        `**Descripción:** ${payment.description}\n` +
        `**Fecha:** ${payment.date_created}\n` +
        `**Pagador:** ${payment.payer?.email || 'N/A'}`);

      console.log(`Pago con estado ${payment.status} recibido para seguimiento`);
    }

    // Responder con 200 OK para confirmar recepción
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Error procesando webhook:', error);
    await sendErrorDiscord(`❌ Error procesando webhook: ${error.message}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}