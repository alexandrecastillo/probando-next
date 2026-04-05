import { NextResponse } from 'next/server';

// Importa el SDK de Mercado Pago
// @ts-ignore
const mercadopago = require('mercadopago');

// Lee el ACCESS_TOKEN desde variables de entorno
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { mensaje, montoRegalo, montoComisionMP } = body;

    if (!mensaje || !montoRegalo || !montoComisionMP) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const preference = {
      items: [
        {
          title: "Regalo de boda - B & A",
          unit_price: Number(montoRegalo),
          quantity: 1,
        },
        {
          title: "Comisión Mercado Pago",
          unit_price: Number(montoComisionMP),
          quantity: 1,
        }
      ],
      back_urls: {
        success: 'https://tusitio.com/success',
        failure: 'https://tusitio.com/failure',
        pending: 'https://tusitio.com/pending',
      },
      auto_return: 'approved',
    };

    const response = await mercadopago.preferences.create(preference);
    const preference_id = response.body.id;
    return NextResponse.json({ preference_id });
  } catch (error) {
    console.error('Error creando preferencia:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
