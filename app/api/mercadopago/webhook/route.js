import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { kv } from '@vercel/kv';
import crypto from 'crypto';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

const paymentClient = new Payment(client);

const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
const DISCORD_PAGOS_URL = process.env.DISCORD_PAGOS_URL;
const DISCORD_ERROR_URL = process.env.DISCORD_ERROR_URL;

const sendPagoDiscord = async (message) => {
  await fetch(DISCORD_PAGOS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  });
}

const sendErrorDiscord = async (message) => {
  await fetch(DISCORD_ERROR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  });
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const headers = request.headers;

    // Validar la firma del webhook con el cuerpo crudo
    const xSignature = headers.get('x-signature');

    if (xSignature && WEBHOOK_SECRET) {
      const signature = xSignature
        .split(',')
        .map(part => part.trim())
        .map(part => part.split('='))
        .find(([key]) => key === 'sha256' || key === 'v1')
        ? xSignature
            .split(',')
            .map(part => part.trim())
            .map(part => part.split('='))
            .find(([key]) => key === 'sha256' || key === 'v1')[1]
        : xSignature.trim();

      const expectedHex = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      const expectedBase64 = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(rawBody)
        .digest('base64');

      if (signature !== expectedHex && signature !== expectedBase64) {
        const dataId = body.data?.id || '';
        await sendErrorDiscord(`⚠️ Firma del webhook inválida para evento ${body.type} con ID ${dataId}`);
        console.error('Firma del webhook inválida', {
          signature,
          expectedHex,
          expectedBase64,
          rawBodyLength: rawBody.length,
        });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Procesar solo notificaciones de pago
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

      // Notificar a Discord
      const discordMessage = {
        content: `🎉 **Nuevo pago recibido!**\n\n` +
          `**ID:** ${payment.id}\n` +
          `**Estado:** ${payment.status}\n` +
          `**Monto:** S/ ${payment.transaction_amount}\n` +
          `**Descripción:** ${payment.description}\n` +
          `**Fecha:** ${payment.date_created}\n` +
          `**Pagador:** ${payment.payer?.email || 'N/A'}`,
      };

      await sendPagoDiscord(discordMessage);

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