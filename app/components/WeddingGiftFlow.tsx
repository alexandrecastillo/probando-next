"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, Check } from "lucide-react";

const SERVICE_FEE_RATE = 0.000339; // Results in S/ 3.39 for S/ 10,000

function formatNumber(num: number): string {
  return num.toLocaleString("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
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
  const [isAnimating, setIsAnimating] = useState(false);

  const amountNum = Number(formData.amount) || 0;
  const serviceFee = calculateServiceFee(amountNum);
  const total = amountNum + serviceFee;

  const handleAmountChange = useCallback((value: string) => {
    // Remove non-numeric characters except for the comma
    const numericValue = value.replace(/[^\d]/g, "");
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

  const goToStep = (newStep: 1 | 2 | 3) => {
    setIsAnimating(true);
    setTimeout(() => {
      setStep(newStep);
      setIsAnimating(false);
    }, 150);
  };

  const handleContinue = () => {
    if (step === 1) {
      goToStep(2);
    } else if (step === 2) {
      goToStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      goToStep(1);
    } else if (step === 3) {
      goToStep(2);
    }
  };

  const handleNewGift = () => {
    setFormData({ amount: "", fromName: "", message: "" });
    goToStep(1);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[390px] min-h-[700px] bg-background rounded-3xl relative overflow-hidden flex flex-col">
        {/* Header */}
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
              className="text-foreground/60 text-lg"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              Briana y Alexandre
            </p>
            <h1
              className="text-3xl font-semibold text-foreground mt-1"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              Regalo de Boda
            </h1>
          </div>
        </header>

        {/* Content */}
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
            />
          )}

          {step === 2 && (
            <Step2Summary
              formData={formData}
              amountNum={amountNum}
              serviceFee={serviceFee}
              total={total}
              onContinue={handleContinue}
              onEdit={() => goToStep(1)}
            />
          )}

          {step === 3 && <Step3Confirmation onNewGift={handleNewGift} />}
        </main>
      </div>
    </div>
  );
}

// Step 1: Form
function Step1Form({
  formData,
  setFormData,
  handleAmountChange,
  handleAmountKeyDown,
  onContinue,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleAmountChange: (value: string) => void;
  handleAmountKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onContinue: () => void;
}) {
  const displayAmount = formData.amount
    ? formatNumber(Number(formData.amount))
    : "0";

  return (
    <>
      {/* Amount Display */}
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="text-center">
          <span
            className="text-5xl font-medium text-foreground/30"
            style={{ fontFamily: "var(--font-handwriting)" }}
          >
            S/{" "}
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={formData.amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            onKeyDown={handleAmountKeyDown}
            className="text-6xl font-medium text-foreground/30 bg-transparent border-none outline-none text-center w-40 placeholder:text-foreground/30"
            style={{ fontFamily: "var(--font-handwriting)" }}
            placeholder="0"
          />
          {formData.amount && (
            <div
              className="text-5xl font-medium text-foreground/30 sr-only"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              S/ {displayAmount}
            </div>
          )}
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 mt-auto">
        <div>
          <input
            type="text"
            placeholder="De parte de (opcional)"
            value={formData.fromName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, fromName: e.target.value }))
            }
            className="w-full px-4 py-4 bg-muted rounded-2xl text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            style={{ fontFamily: "var(--font-handwriting)", fontSize: "1.1rem" }}
          />
        </div>

        <div>
          <textarea
            placeholder="Agregar un mensaje..."
            value={formData.message}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, message: e.target.value }))
            }
            rows={3}
            className="w-full px-4 py-4 bg-muted rounded-2xl text-foreground placeholder:text-muted-foreground/60 outline-none resize-none focus:ring-2 focus:ring-primary/30 transition-all"
            style={{ fontFamily: "var(--font-handwriting)", fontSize: "1.1rem" }}
          />
        </div>

        <button
          onClick={onContinue}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-medium text-lg transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ fontFamily: "var(--font-handwriting)" }}
        >
          Continuar
        </button>
      </div>
    </>
  );
}

// Step 2: Summary
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
      {/* Amount Display */}
      <div className="py-4">
        <div
          className="text-6xl font-semibold text-foreground"
          style={{ fontFamily: "var(--font-handwriting)" }}
        >
          <span className="text-3xl align-top">S/</span>
          {formatNumber(amountNum)}
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="py-4 space-y-3">
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
        <div className="border-t border-border pt-3">
          <div className="flex justify-between items-center">
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

      {/* Message Card */}
      {(formData.fromName || formData.message) && (
        <div
          className="bg-card rounded-2xl p-5 my-4 cursor-pointer hover:bg-card/80 transition-colors"
          onClick={onEdit}
        >
          {formData.fromName && (
            <div className="mb-2">
              <p
                className="text-foreground/60 text-sm"
                style={{ fontFamily: "var(--font-handwriting)" }}
              >
                De parte de
              </p>
              <p
                className="text-foreground text-lg"
                style={{ fontFamily: "var(--font-handwriting)" }}
              >
                {formData.fromName}
              </p>
            </div>
          )}
          {formData.message && (
            <div>
              <p
                className="text-foreground/60 text-sm"
                style={{ fontFamily: "var(--font-handwriting)" }}
              >
                Mensaje
              </p>
              <p
                className="text-foreground text-lg leading-relaxed"
                style={{ fontFamily: "var(--font-handwriting)" }}
              >
                {formData.message}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Continue Button */}
      <div className="mt-auto">
        <button
          onClick={onContinue}
          disabled={amountNum <= 0}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-medium text-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: "var(--font-handwriting)" }}
        >
          Continuar
        </button>
      </div>
    </>
  );
}

// Step 3: Confirmation
function Step3Confirmation({ onNewGift }: { onNewGift: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
        <Check className="w-10 h-10 text-primary" />
      </div>
      <h2
        className="text-3xl font-semibold text-foreground mb-2"
        style={{ fontFamily: "var(--font-handwriting)" }}
      >
        ¡Gracias!
      </h2>
      <p
        className="text-foreground/60 text-lg mb-8"
        style={{ fontFamily: "var(--font-handwriting)" }}
      >
        Tu regalo ha sido registrado con éxito
      </p>
      <button
        onClick={onNewGift}
        className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-medium text-lg transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ fontFamily: "var(--font-handwriting)" }}
      >
        Enviar otro regalo
      </button>
    </div>
  );
}
