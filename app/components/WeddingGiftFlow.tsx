"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, Check } from "lucide-react";

const SERVICE_FEE_RATE = 0.000339;

function formatNumber(num: number): string {
  if (num === 0) return "0";
  return num.toLocaleString("es-PE");
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
  const inputRef = useRef<HTMLInputElement>(null);
  const measureSpanRef = useRef<HTMLSpanElement>(null);

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

  const adjustInputWidth = useCallback(() => {
    if (!inputRef.current || !measureSpanRef.current) return;
    const value = inputRef.current.value || "0";
    measureSpanRef.current.textContent = value;
    const width = measureSpanRef.current.offsetWidth;
    inputRef.current.style.width = (width + (value === "1" ? 20 : 5)) + "px";
  }, []);

  useEffect(() => {
    adjustInputWidth();
  }, [formData.amount, adjustInputWidth]);

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
    const numericValue = value.replace(/[^\d]/g, "").slice(0, 6);
    const formatted = numericValue ? parseInt(numericValue).toLocaleString("es-PE") : "0";
    setFormData((prev) => ({ ...prev, amount: numericValue }));
  }, []);

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];
    if (!/^\d$/.test(e.key) && !allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-97.5 min-h-180 bg-background rounded-[36px] border-2 border-muted overflow-hidden flex flex-col shadow-[0_28px_80px_rgba(104,95,93,0.15)]">
        {/* Header */}
        <header className="pt-8 pb-6 px-6 relative">
          {step > 1 && step < 3 && (
            <button
              onClick={handleBack}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-foreground/70 hover:text-foreground transition-colors"
              aria-label="Volver"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div className="text-center">
            <p className="text-foreground/70 text-base font-light">
              Briana y Alexandre
            </p>
            <h1 className="text-3xl font-light text-foreground mt-2">
              Regalo de boda
            </h1>
          </div>
        </header>

        {/* Main Content */}
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
              amountNum={amountNum}
              inputRef={inputRef}
              measureSpanRef={measureSpanRef}
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
              error={error}
              loading={loading}
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
  amountNum,
  inputRef,
  measureSpanRef,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleAmountChange: (value: string) => void;
  handleAmountKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onContinue: () => void;
  error: string;
  amountNum: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  measureSpanRef: React.RefObject<HTMLSpanElement | null>;
}) {
  const displayAmount = formData.amount
    ? parseInt(formData.amount).toLocaleString("es-PE")
    : "0";

  return (
    <>
      <div className="flex-1 flex flex-col justify-center py-8">
        <div className="text-center">
          <p className="text-base text-foreground/60 mb-4 font-light">
            Ingresa el monto del regalo
          </p>
          <div className="inline-flex items-end justify-center gap-1">
            <span className="text-4xl font-light text-foreground/60">
              S/
            </span>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={displayAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                onKeyDown={handleAmountKeyDown}
                className="text-6xl font-light text-foreground bg-transparent border-none outline-none text-center placeholder:text-foreground/30"
                placeholder="0"
              />
              <span
                ref={measureSpanRef}
                className="invisible text-6xl font-light absolute pointer-events-none whitespace-pre left-0"
              />
            </div>
          </div>
          <p className="text-sm text-foreground/50 mt-6 max-w-70 mx-auto font-light">
            El monto ingresado es el total que deseas regalar. El costo de
            servicio se calculará en la siguiente pantalla.
          </p>
          {error ? (
            <p
              className="text-sm text-red-600 mt-4 font-light"
              role="alert"
              aria-live="assertive"
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
            maxLength={50}
            className="w-full px-4 py-3 bg-muted rounded-2xl text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/40 transition-all font-light"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-foreground font-light">
              Agregar un mensaje
            </label>
            <span className="text-xs text-foreground/50 font-light">
              {formData.message.length}/150
            </span>
          </div>
          <textarea
            placeholder="Escribe un mensaje..."
            value={formData.message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev) => ({ ...prev, message: e.target.value.slice(0, 150) }))
            }
            rows={4}
            className="w-full px-4 py-3 bg-muted rounded-2xl text-foreground placeholder:text-muted-foreground/60 outline-none resize-none focus:ring-2 focus:ring-primary/40 transition-all font-light"
          />
        </div>

        <button
          onClick={onContinue}
          disabled={amountNum <= 0}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-light text-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
  error,
  loading,
}: {
  formData: FormData;
  amountNum: number;
  serviceFee: number;
  total: number;
  onContinue: () => void;
  onEdit: () => void;
  error: string;
  loading: boolean;
}) {
  return (
    <>
      <div className="mb-6">
        <div>
          <p className="text-sm text-foreground/60 font-light">
            Revisa tu regalo
          </p>
          <h2 className="text-2xl font-light text-foreground mt-2">
            Confirmación
          </h2>
        </div>
      </div>

      <div className="rounded-3xl bg-muted p-6 mb-6 shadow-sm">
        <div className="pb-4 border-b border-muted-foreground/20">
          <div className="text-5xl font-light text-foreground">
            <span className="text-3xl align-top">S/</span>{" "}
            {formatNumber(amountNum)}
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <div className="flex justify-between items-center text-foreground/70">
            <span className="text-base font-light">Costo servicio pago en línea</span>
            <span className="text-base font-light">S/ {serviceFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-muted-foreground/20">
            <span className="text-lg font-light text-foreground">Total a pagar</span>
            <span className="text-lg font-light text-foreground">
              S/ {formatNumber(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="rounded-2xl bg-card p-4">
          <p className="text-sm text-foreground/60 mb-2 font-light">
            De parte de
          </p>
          <p className="text-base text-foreground font-light">
            {formData.fromName || "Sin nombre agregado"}
          </p>
        </div>

        <div className="rounded-2xl bg-card p-4">
          <p className="text-sm text-foreground/60 mb-2 font-light">
            Mensaje
          </p>
          <p className="text-base leading-relaxed text-foreground font-light">
            {formData.message || "Sin mensaje agregado"}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4 font-light" role="alert">
          {error}
        </p>
      )}

      <div className="mt-auto">
        <button
          onClick={onEdit}
          className="w-full py-3 mb-3 bg-muted text-foreground rounded-2xl font-light text-base transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Editar
        </button>
        <button
          onClick={onContinue}
          disabled={loading}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-light text-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
      <h2 className="text-3xl font-light text-foreground mb-2">
        ¡Gracias!
      </h2>
      <p className="text-foreground/60 text-base mb-8 max-w-[320px] font-light">
        Tu regalo ha sido registrado con éxito y estamos listos para procesarlo.
      </p>
      <button
        onClick={onNewGift}
        className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-light text-lg transition-all hover:opacity-90 active:scale-[0.98]"
      >
        Enviar otro regalo
      </button>
    </div>
  );
}
