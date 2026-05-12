import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
})

export async function POST(request) {
  try {
    const url = new URL(request.url)
    const body = await request.json()
    const { mensaje, montoRegalo, montoComisionMP } = body

    // ✅ Validación correcta
    if (!montoRegalo || !montoComisionMP) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || `${url.protocol}//${url.host}`

    const preference = new Preference(client)

    const response = await preference.create({
      body: {
        items: [
          {
            title: 'Regalo de boda B&A + costo servicio pago en línea',
            description: mensaje || 'Regalo para Briana y Alexandre',
            quantity: 1,
            unit_price: Number(montoRegalo) + Number(montoComisionMP),
          },
        ],
        back_urls: {
          success: `${baseUrl}/success`,
          failure: `${baseUrl}/failure`,
          pending: `${baseUrl}/pending`,
        },
        auto_return: 'approved',
        metadata: {
          mensaje: mensaje || '',
          montoRegalo: montoRegalo.toString(),
          montoComisionMP: montoComisionMP.toString(),
        },
      },
    })

    return NextResponse.json({
      preference_id: response.id,
      init_point: response.init_point,
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