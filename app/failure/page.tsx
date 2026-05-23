"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FailurePage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      try {
        // Prioridad: query param external_reference (desde window), luego localStorage
        let external = null;
        if (typeof window !== "undefined") {
          const qp = new URLSearchParams(window.location.search);
          external = qp.get("external_reference");
        } else {
          external = null;
        }

        // If no external reference, just restore local saved attempt
        if (!external) {
          try {
            localStorage.setItem("mp_restore", "1");
          } catch (e) {}
          router.replace("/");
          return;
        }

        // Validar conexión antes de intentar
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          try {
            localStorage.setItem(
              "mp_error_modal",
              JSON.stringify({
                title: "Sin conexión a internet",
                message:
                  "No pudimos verificar el estado del pago porque no hay conexión a internet. Por favor verifica tu conexión e intenta nuevamente.",
              }),
            );
          } catch (e) {}
          router.replace("/");
          return;
        }

        // Intentar llamar al backend hasta 5 veces con backoff
        const maxRetries = 5;
        let json = null;
        let results = [];
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const res = await fetch(
              `/api/mercadopago/check?external_reference=${encodeURIComponent(external)}`,
            );
            if (!res.ok) throw new Error(`Status ${res.status}`);
            json = await res.json();
            results = json?.data?.results || [];
            break;
          } catch (err) {
            // Si durante los intentos perdemos la conexión, mostrar modal de sin conexión y salir
            if (typeof navigator !== "undefined" && !navigator.onLine) {
              try {
                localStorage.setItem(
                  "mp_error_modal",
                  JSON.stringify({
                    title: "Sin conexión a internet",
                    message:
                      "No pudimos verificar el estado del pago porque no hay conexión a internet. Por favor verifica tu conexión e intenta nuevamente.",
                  }),
                );
              } catch (e) {}
              router.replace("/");
              return;
            }

            console.error(`Intento ${attempt} para verificar pago falló:`, err);
            if (attempt < maxRetries) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * attempt),
              );
              continue;
            }
            // Último intento falló: restaurar y mostrar error genérico
            try {
              localStorage.setItem("mp_restore", "1");
              localStorage.setItem(
                "mp_error_modal",
                JSON.stringify({
                  title: "Error al verificar pago",
                  message:
                    "Ocurrió un error verificando el estado del pago. Puedes intentar nuevamente o usar otra forma de pago.",
                }),
              );
            } catch (e) {}
            router.replace("/");
            return;
          }
        }

        if (!results || results.length === 0) {
          // No payment found: restore previous attempt and go back to step 2
          try {
            localStorage.setItem("mp_restore", "1");
          } catch (e) {}
          router.replace("/");
          return;
        }
        // If there is at least one payment, try to extract metadata and save attempt if missing
        try {
          const first = results[0];
          const payment = first.payment || first;
          const metadata = payment?.metadata || {};

          // If we don't have a saved attempt in localStorage, try to create it from metadata
          const existing = localStorage.getItem("mp_saved_attempt");
          if (!existing) {
            try {
              const saved = {
                nombre: metadata.nombre || "",
                mensaje: metadata.mensaje || "",
                montoRegalo:
                  metadata.monto_regalo || metadata.montoRegalo || null,
                montoComisionMP:
                  metadata.monto_comision_mp ||
                  metadata.montoComisionMP ||
                  null,
                total: payment?.transaction_amount || null,
                formattedAmount: metadata.monto_regalo
                  ? Number(metadata.monto_regalo).toLocaleString("es-PE")
                  : "",
                externalReference: external,
                browserId: metadata.browser_id || "",
              };
              localStorage.setItem("mp_saved_attempt", JSON.stringify(saved));
            } catch (e) {}
          }

          localStorage.setItem("mp_restore", "1");
          localStorage.setItem(
            "mp_error_modal",
            JSON.stringify({
              title: "Tu regalo no se completó",
              message:
                "El pago no llegó a completarse. Reintenta o haz tu regalo mediante una transferencia, Yape o Plin en pocos minutos.",
            }),
          );
        } catch (e) {
          try {
            localStorage.setItem("mp_restore", "1");
            localStorage.setItem(
              "mp_error_modal",
              JSON.stringify({
                title: "Tu regalo no se completó",
                message:
                  "Detectamos un intento de pago. Intenta nuevamente o usa otra forma de pago.",
              }),
            );
          } catch (e) {}
        }

        router.replace("/");
      } catch (error) {
        console.error("Failure page error:", error);
        try {
          localStorage.setItem("mp_restore", "1");
          localStorage.setItem(
            "mp_error_modal",
            JSON.stringify({
              title: "Tu regalo no se completó",
              message: "Ocurrió un error inesperado. Intenta nuevamente.",
            }),
          );
        } catch (e) {}
        router.replace("/");
      }
    };

    run();
  }, [router]);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-fondo px-6 py-12">
      <div className="flex flex-col h-full max-w-md mx-auto w-full items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <svg
              className="text-secundario animate-spin"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              width="w-16"
              height="w-16"
            >
              <path
                d="M32 3C35.8083 3 39.5794 3.75011 43.0978 5.20749C46.6163 6.66488 49.8132 8.80101 52.5061 11.4939C55.199 14.1868 57.3351 17.3837 58.7925 20.9022C60.2499 24.4206 61 28.1917 61 32C61 35.8083 60.2499 39.5794 58.7925 43.0978C57.3351 46.6163 55.199 49.8132 52.5061 52.5061C49.8132 55.199 46.6163 57.3351 43.0978 58.7925C39.5794 60.2499 35.8083 61 32 61C28.1917 61 24.4206 60.2499 20.9022 58.7925C17.3837 57.3351 14.1868 55.199 11.4939 52.5061C8.801 49.8132 6.66487 46.6163 5.20749 43.0978C3.7501 39.5794 3 35.8083 3 32C3 28.1917 3.75011 24.4206 5.2075 20.9022C6.66489 17.3837 8.80101 14.1868 11.4939 11.4939C14.1868 8.80099 17.3838 6.66487 20.9022 5.20749C24.4206 3.7501 28.1917 3 32 3L32 3Z"
                stroke="currentColor"
                stroke-width="5"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>
              <path
                d="M32 3C36.5778 3 41.0906 4.08374 45.1692 6.16256C49.2477 8.24138 52.7762 11.2562 55.466 14.9605C58.1558 18.6647 59.9304 22.9531 60.6448 27.4748C61.3591 31.9965 60.9928 36.6232 59.5759 40.9762"
                stroke="currentColor"
                stroke-width="5"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="text-primario"
              ></path>
            </svg>
          </div>
          <p className="text-primario text-lg font-medium">Cargando...</p>
        </div>
      </div>
    </main>
  );
}
