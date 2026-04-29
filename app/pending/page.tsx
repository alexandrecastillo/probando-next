import Link from "next/link";

export default function PendingPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-fondo px-6 py-12">
      <div className="max-w-lg w-full rounded-3xl border border-secundario bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-semibold text-primario">Pago en proceso</h1>
        <p className="mt-4 text-primario">Tu pago está pendiente de confirmación. Revisa tu correo o vuelve más tarde para confirmar el estado.</p>
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
