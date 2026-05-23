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
            localStorage.setItem("mp_error_modal", JSON.stringify({ title: "Sin conexión a internet", message: "No pudimos verificar el estado del pago porque no hay conexión a internet. Por favor verifica tu conexión e intenta nuevamente." }));
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
            const res = await fetch(`/api/mercadopago/check?external_reference=${encodeURIComponent(external)}`);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            json = await res.json();
            results = json?.data?.results || [];
            break;
          } catch (err) {
            // Si durante los intentos perdemos la conexión, mostrar modal de sin conexión y salir
            if (typeof navigator !== "undefined" && !navigator.onLine) {
              try {
                localStorage.setItem("mp_error_modal", JSON.stringify({ title: "Sin conexión a internet", message: "No pudimos verificar el estado del pago porque no hay conexión a internet. Por favor verifica tu conexión e intenta nuevamente." }));
              } catch (e) {}
              router.replace("/");
              return;
            }

            console.error(`Intento ${attempt} para verificar pago falló:`, err);
            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
              continue;
            }
            // Último intento falló: restaurar y mostrar error genérico
            try {
              localStorage.setItem("mp_restore", "1");
              localStorage.setItem("mp_error_modal", JSON.stringify({ title: "Error al verificar pago", message: "Ocurrió un error verificando el estado del pago. Puedes intentar nuevamente o usar otra forma de pago." }));
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
                montoRegalo: metadata.monto_regalo || metadata.montoRegalo || null,
                montoComisionMP: metadata.monto_comision_mp || metadata.montoComisionMP || null,
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
              title: "Ocurrió un error",
              message:
                "Detectamos un intento de pago. Si el cobro no se completó, puedes reintentar o usar transferencia / Yape / Plin.",
            }),
          );
        } catch (e) {
          try {
            localStorage.setItem("mp_restore", "1");
            localStorage.setItem(
              "mp_error_modal",
              JSON.stringify({ title: "Ocurrió un error", message: "Detectamos un intento de pago. Intenta nuevamente o usa otra forma de pago." }),
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
            JSON.stringify({ title: "Error", message: "Ocurrió un error inesperado. Intenta nuevamente." }),
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
            <div className="absolute inset-0 border-4 border-primario/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primario border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-primario text-lg font-medium">Cargando...</p>
        </div>
      </div>
    </main>
  );
}
