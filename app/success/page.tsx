import Link from "next/link";

export default function SuccessPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-fondo px-6 py-12">
      <div className="max-w-lg w-full rounded-3xl border border-secundario bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-semibold text-primario">Pago aprobado</h1>
        <p className="mt-4 text-primario">¡Gracias por tu contribución! Tu regalo fue procesado con éxito.</p>
        <Link
          href="/"
          className="mt-8 inline-flex w-full justify-center rounded-xl bg-button px-5 py-4 text-center text-base font-semibold text-texto-button shadow-sm transition hover:bg-primary"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
