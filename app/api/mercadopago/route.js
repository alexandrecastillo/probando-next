import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
})

export async function POST(request) {
  try {
    const body = await request.json()
    const { mensaje, montoRegalo, montoComisionMP } = body

    // ✅ Validación correcta
    if (!montoRegalo || !montoComisionMP) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    const preference = new Preference(client)

    // ✅ Crear preferencia correctamente
    const response = await preference.create({
      body: {
        items: [
          {
            title: 'Regalo Boda B & A + Comisión Mercado Pago',
            quantity: 1,
            unit_price: Number(montoRegalo) + Number(montoComisionMP),
          },
        ],
        // ✅ URLs reales (IMPORTANTE en producción)
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
          failure: `${process.env.NEXT_PUBLIC_BASE_URL}/failure`,
          pending: `${process.env.NEXT_PUBLIC_BASE_URL}/pending`,
        },

        auto_return: 'approved',

        // ✅ Opcional pero PRO
        metadata: {
          mensaje: mensaje || '',
        },
      },
    })

    return NextResponse.json({
      preference_id: response.id,
      init_point: response.init_point, // 🔥 ESTE ES EL QUE USAS PARA REDIRIGIR
    })
  } catch (error) {
    console.error('Error creando preferencia:', error)

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}