"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Check, Edit2 } from "lucide-react";

const SERVICE_FEE_RATE = 0.000339;

function formatNumber(num: number): string {
  const str = num.toString();
  if (str.length <= 4) return str;
  if (str.length === 5) return str.slice(0, 2) + ',' + str.slice(2);
  if (str.length === 6) return str.slice(0, 3) + ',' + str.slice(3);
  return str; // Though max is 6
}

function calculateServiceFee(amount: number): number {
  return Math.round(amount * SERVICE_FEE_RATE * 100) / 100;
}

interface FormData {
  amount: string;
  fromName: string;
  message: string;
}

export default function WeddingGiftFlow() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<FormData>({
    amount: "",
    fromName: "",
    message: "",
  });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const amountNum = Number(formData.amount) || 0;
  const serviceFee = calculateServiceFee(amountNum);
  const total = amountNum + serviceFee;

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.history.replaceState({ step: 1 }, "", "");

    const handlePopState = (event: PopStateEvent) => {
      const targetStep = event.state?.step || 1;
      setStep(targetStep === 2 || targetStep === 3 ? targetStep : 1);
    };

    window.onpopstate = handlePopState;
    return () => {
      window.onpopstate = null;
    };
  }, []);

  const syncHistory = (newStep: 1 | 2 | 3, replace = false) => {
    if (typeof window === "undefined") return;
    if (replace) {
      window.history.replaceState({ step: newStep }, "", "");
    } else {
      window.history.pushState({ step: newStep }, "", "");
    }
  };

  const goToStep = (newStep: 1 | 2 | 3, replaceHistory = false) => {
    setError("");
    setIsAnimating(true);
    setTimeout(() => {
      setStep(newStep);
      setIsAnimating(false);
    }, 150);

    if (newStep === 1) {
      syncHistory(1, true);
    } else {
      syncHistory(newStep, replaceHistory);
    }
  };

  const handlePagar = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montoRegalo: amountNum,
          montoComisionMP: serviceFee,
          mensaje: formData.message,
        }),
      });

      const data = await res.json();
      if (data.preference_id && data.init_point) {
        window.location.href = data.init_point;
      } else if (data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        setError("No se pudo iniciar el pago. Intenta nuevamente.");
      }
    } catch (e) {
      setError("Error al conectar con Mercado Pago");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (step === 1) {
      if (amountNum <= 0) {
        setError("Ingresa un monto válido para continuar");
        return;
      }
      setError("");
      goToStep(2);
    } else if (step === 2) {
      handlePagar();
    }
  };

  const handleBack = () => {
    if (step === 2) {
      goToStep(1, true);
    } else if (step === 3) {
      goToStep(2, true);
    }
  };

  const handleNewGift = () => {
    setFormData({ amount: "", fromName: "", message: "" });
    setError("");
    goToStep(1, true);
  };

  const handleAmountChange = useCallback((value: string) => {
    // Remove commas and non-numeric characters, limit to 6 digits
    const numericValue = value.replace(/[^\d]/g, "").slice(0, 6);
    setFormData((prev) => ({ ...prev, amount: numericValue }));
  }, []);

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow numeric keys and navigation
    const allowedKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
    ];
    if (!/^\d$/.test(e.key) && !allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[390px] min-h-[720px] bg-background rounded-[36px] border border-border overflow-hidden flex flex-col shadow-[0_28px_80px_rgba(74,74,74,0.08)]">
        <header className="pt-8 pb-4 px-6 relative">
          {step > 1 && step < 3 && (
            <button
              onClick={handleBack}
              className="absolute left-4 top-8 p-2 text-foreground/70 hover:text-foreground transition-colors"
              aria-label="Volver"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div className="text-center">
            <p
              className="text-foreground/60 text-sm"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              Briana y Alexandre
            </p>
            <h1
              className="text-3xl font-semibold text-foreground mt-2"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              Regalo de boda
            </h1>
          </div>
        </header>

        <main
          className={`flex-1 px-6 pb-6 flex flex-col transition-opacity duration-150 ${
            isAnimating ? "opacity-0" : "opacity-100"
          }`}
        >
          {step === 1 && (
            <Step1Form
              formData={formData}
              setFormData={setFormData}
              handleAmountChange={handleAmountChange}
              handleAmountKeyDown={handleAmountKeyDown}
              onContinue={handleContinue}
              error={error}
            />
          )}

          {step === 2 && (
            <Step2Summary
              formData={formData}
              amountNum={amountNum}
              serviceFee={serviceFee}
              total={total}
              onContinue={handleContinue}
              onEdit={() => goToStep(1, true)}
            />
          )}

          {step === 3 && <Step3Confirmation onNewGift={handleNewGift} />}
        </main>
      </div>
    </div>
  );
}

function Step1Form({
  formData,
  setFormData,
  handleAmountChange,
  handleAmountKeyDown,
  onContinue,
  error,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleAmountChange: (value: string) => void;
  handleAmountKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onContinue: () => void;
  error: string;
}) {
  const displayAmount = formData.amount
    ? formatNumber(Number(formData.amount))
    : "";

  return (
    <>
      <div className="flex-1 flex flex-col justify-center py-8">
        <div className="text-center">
          <p
            className="text-sm text-foreground/60 mb-2"
            style={{ fontFamily: "var(--font-handwriting)" }}
          >
            Ingresa el monto del regalo
          </p>
          <div className="inline-flex items-end justify-center gap-2">
            <span
              className="text-4xl font-semibold text-foreground/40"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              S/
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={displayAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              onKeyDown={handleAmountKeyDown}
              className="text-6xl font-semibold text-foreground bg-transparent border-none outline-none text-center w-36 placeholder:text-foreground/30"
              style={{ fontFamily: "var(--font-handwriting)" }}
              placeholder="0"
            />
          </div>
          <p
            className="text-sm text-foreground/50 mt-4 max-w-[280px] mx-auto"
            style={{ fontFamily: "var(--font-handwriting)" }}
          >
            El monto ingresado es el total que deseas regalar. El costo de
            servicio se calculará en la siguiente pantalla.
          </p>
          {error ? (
            <p
              className="text-sm text-red-500 mt-4"
              role="alert"
              aria-live="assertive"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 mt-auto">
        <div>
          <input
            type="text"
            placeholder="De parte de (opcional)"
            value={formData.fromName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, fromName: e.target.value }))
            }
            className="w-full px-4 py-4 bg-muted rounded-3xl text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            style={{ fontFamily: "var(--font-handwriting)", fontSize: "1.05rem" }}
          />
        </div>

        <div>
          <textarea
            placeholder="Agregar un mensaje..."
            value={formData.message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev) => ({ ...prev, message: e.target.value }))
            }
            rows={4}
            className="w-full px-4 py-4 bg-muted rounded-3xl text-foreground placeholder:text-muted-foreground/60 outline-none resize-none focus:ring-2 focus:ring-primary/30 transition-all"
            style={{ fontFamily: "var(--font-handwriting)", fontSize: "1.05rem" }}
          />
        </div>

        <button
          onClick={onContinue}
          disabled={amountNum <= 0}
          className="w-full py-4 bg-primary text-primary-foreground rounded-3xl font-semibold text-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: "var(--font-handwriting)" }}
        >
          Continuar
        </button>
      </div>
    </>
  );
}

function Step2Summary({
  formData,
  amountNum,
  serviceFee,
  total,
  onContinue,
  onEdit,
}: {
  formData: FormData;
  amountNum: number;
  serviceFee: number;
  total: number;
  onContinue: () => void;
  onEdit: () => void;
}) {
  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p
              className="text-sm text-foreground/60"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              Revisa tu regalo
            </p>
            <h2
              className="text-2xl font-semibold text-foreground mt-1"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              Confirmación
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {error ? (
              <p
                className="text-sm text-red-500"
                style={{ fontFamily: "var(--font-handwriting)" }}
              >
                {error}
              </p>
            ) : null}
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-3xl border border-border bg-muted px-4 py-3 text-sm text-foreground/80 hover:bg-muted/90 transition-colors"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </button>
          </div>
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-3xl border border-border bg-muted px-4 py-3 text-sm text-foreground/80 hover:bg-muted/90 transition-colors"
            style={{ fontFamily: "var(--font-handwriting)" }}
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
        </div>
      </div>

      <div className="rounded-[32px] bg-muted p-5 mb-6 shadow-sm shadow-foreground/5">
        <div className="pb-4 border-b border-border">
          <div
            className="text-5xl font-semibold text-foreground"
            style={{ fontFamily: "var(--font-handwriting)" }}
          >
            <span className="text-3xl align-top">S/</span> {formatNumber(amountNum)}
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <div className="flex justify-between items-center text-foreground/70">
            <span
              className="text-base"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              Costo servicio pago en línea
            </span>
            <span
              className="text-base"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              S/ {serviceFee.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              Total a pagar
            </span>
            <span
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              S/ {formatNumber(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="rounded-[28px] bg-card p-4">
          <p
            className="text-sm text-foreground/60 mb-2"
            style={{ fontFamily: "var(--font-handwriting)" }}
          >
            De parte de
          </p>
          <p
            className="text-lg text-foreground"
            style={{ fontFamily: "var(--font-handwriting)" }}
          >
            {formData.fromName || "Sin nombre agregado"}
          </p>
        </div>

        <div className="rounded-[28px] bg-card p-4">
          <p
            className="text-sm text-foreground/60 mb-2"
            style={{ fontFamily: "var(--font-handwriting)" }}
          >
            Mensaje
          </p>
          <p
            className="text-lg leading-relaxed text-foreground"
            style={{ fontFamily: "var(--font-handwriting)" }}
          >
            {formData.message || "Sin mensaje agregado"}
          </p>
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={onContinue}
          disabled={loading}
          className="w-full py-4 bg-primary text-primary-foreground rounded-3xl font-semibold text-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ fontFamily: "var(--font-handwriting)" }}
        >
          {loading ? "Redirigiendo..." : "Enviar regalo"}
        </button>
      </div>
    </>
  );
}

function Step3Confirmation({ onNewGift }: { onNewGift: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-6">
        <Check className="w-10 h-10 text-primary" />
      </div>
      <h2
        className="text-3xl font-semibold text-foreground mb-2"
        style={{ fontFamily: "var(--font-handwriting)" }}
      >
        ¡Gracias!
      </h2>
      <p
        className="text-foreground/60 text-base mb-8 max-w-[320px]"
        style={{ fontFamily: "var(--font-handwriting)" }}
      >
        Tu regalo ha sido registrado con éxito y estamos listos para procesarlo.
      </p>
      <button
        onClick={onNewGift}
        className="px-8 py-3 bg-primary text-primary-foreground rounded-3xl font-semibold text-lg transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ fontFamily: "var(--font-handwriting)" }}
      >
        Enviar otro regalo
      </button>
    </div>
  );
}
