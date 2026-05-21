import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { log } from 'console';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

const paymentClient = new Payment(client);

const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
};

export async function POST(request) {
  try {
    const body = await request.json();
    const headers = request.headers;

    // Validar la firma del webhook (opcional pero recomendado)
    const xSignature = headers.get('x-signature');
    const xRequestId = headers.get('x-request-id');

    if (xSignature && WEBHOOK_SECRET) {
      // Extraer ts y v1 de x-signature
      const parts = xSignature.split(',');
      let ts, hash;
      parts.forEach(part => {
        const [key, value] = part.split('=');
        if (key?.trim() === 'ts') ts = value?.trim();
        if (key?.trim() === 'v1') hash = value?.trim();
      });

      // Crear el template para validar
      const dataId = body.data?.id || '';
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

      // Calcular HMAC
      const crypto = require('crypto');
      const calculatedHash = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(manifest)
        .digest('hex');

      if (calculatedHash !== hash) {
        console.error('Firma del webhook inválida');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Notificar a Discord
    const discordMessage = {
      content: `🎉 **Nuevo pago recibido!**`
    };


    //await fetch('https://discord.com/api/webhooks/1506870691985621013/Dvl0wGWtrTWyb76S_4-yLkBPh_VjssRD8DH58NSZ1lUOUYUFZqBsDFonQ1kbJkHsSmW5', {
    //  method: 'POST',
    //  headers: { 'Content-Type': 'application/json' },
    //  body: JSON.stringify(discordMessage),
    //});

    // Procesar solo notificaciones de pago
    if (body.type === 'payment') {
      const paymentId = body.data.id;

      // Obtener detalles del pago
      const payment = await paymentClient.get({ id: paymentId });

      console.error(`Payment response: ${JSON.stringify(payment)}`);

      await fetch('https://discord.com/api/webhooks/1506870691985621013/Dvl0wGWtrTWyb76S_4-yLkBPh_VjssRD8DH58NSZ1lUOUYUFZqBsDFonQ1kbJkHsSmW5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payment),
      });

      if (payment.status == 404) {
        console.error(`Payment not found: ${paymentId}`);
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
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

      await fetch('https://discord.com/api/webhooks/1503613064740601866/_wGuqcRzJWjFwWri4IRtFEGqOpUaT64NSL7ODx4KsQoqQbsiKi7i0kx_2Tg0NTcAi-KI', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordMessage),
      });

      // Enviar email con Resend para todos los Estados del pago
      const resendClient = getResendClient();
      if (resendClient) {
        await resendClient.emails.send({
          from: 'Regalo de Boda <onboarding@resend.dev>', // Cambia esto por tu dominio verificado
          to: process.env.NOTIFICATION_EMAIL || 'tuemail@example.com', // Email destinatario
          subject: `Pago ${payment.status} - Seguimiento de regalo de boda`,
          html: `
            <h1>📌 Pago ${payment.status}</h1>
            <p><strong>ID del pago:</strong> ${payment.id}</p>
            <p><strong>Monto:</strong> S/ ${payment.transaction_amount}</p>
            <p><strong>Descripción:</strong> ${payment.description}</p>
            <p><strong>Estado:</strong> ${payment.status}</p>
            <p><strong>Detalle del estado:</strong> ${payment.status_detail || 'N/A'}</p>
            <p><strong>Fecha:</strong> ${payment.date_created}</p>
            <p><strong>Fecha de aprobación:</strong> ${payment.date_approved || 'N/A'}</p>
            <p><strong>Email del pagador:</strong> ${payment.payer?.email || 'N/A'}</p>
            <p>Revisa el pago para seguimiento y diagnóstico.</p>
          `,
        });
      } else {
        console.warn('Resend API key missing. Skipping email notification for webhook event.');
      }

      // Aquí puedes agregar lógica adicional, como:
      // - Actualizar el estado del pedido en tu base de datos
      // - Enviar email de confirmación
      // - etc.

      console.log(`Pago con estado ${payment.status} recibido para seguimiento`);
    }

    // Responder con 200 OK para confirmar recepción
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Error procesando webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}