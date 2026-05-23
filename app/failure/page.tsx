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
          {/* Material Design Circular Progress */}
          <svg className="w-16 h-16 animate-spin" viewBox="0 0 50 50">
            <circle
              className="stroke-primario/20"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              strokeWidth="4"
            />
            <circle
              className="stroke-primario"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              strokeWidth="4"
              strokeDasharray="80, 200"
              strokeDashoffset="0"
              strokeLinecap="round"
              style={{
                animation: "material-spinner 1.4s ease-in-out infinite",
              }}
            />
          </svg>
          <p className="text-primario text-lg font-medium">Cargando...</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes material-spinner {
          0% {
            stroke-dasharray: 1, 200;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 100, 200;
            stroke-dashoffset: -15;
          }
          100% {
            stroke-dasharray: 100, 200;
            stroke-dashoffset: -125;
          }
        }
      `}</style>
    </main>
  );
}
