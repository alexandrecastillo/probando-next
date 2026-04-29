"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const SERVICE_FEE_RATE = 0.000339;

export default function WeddingGiftFlow() {
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState("0");
  const [nameInput, setNameInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [charCount, setCharCount] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const measureSpanRef = useRef<HTMLSpanElement>(null);

  const numericAmount = parseInt(amount.replace(/,/g, "") || "0");
  const serviceFee = Math.round(numericAmount * SERVICE_FEE_RATE * 100) / 100;
  const total = numericAmount + serviceFee;

  const adjustInputWidth = useCallback(() => {
    if (!inputRef.current || !measureSpanRef.current) return;
    const value = inputRef.current.value || "0";
    measureSpanRef.current.textContent = value;
    const width = measureSpanRef.current.offsetWidth;
    inputRef.current.style.width = (width + (value === "1" ? 20 : 5)) + "px";
  }, []);

  useEffect(() => {
    adjustInputWidth();
  }, [amount, adjustInputWidth]);

  const formatMoney = (value: string) => {
    // Remover todo lo que no sea número
    let numValue = value.replace(/\D/g, "");

    // Limitar a 6 dígitos
    if (numValue.length > 6) {
      numValue = numValue.substring(0, 6);
    }

    // Si está vacío, mostrar 0
    if (!numValue) {
      setAmount("0");
      return;
    }

    // Remover ceros a la izquierda
    numValue = parseInt(numValue).toString();

    // Formatear con comas para miles
    const formatted = parseInt(numValue).toLocaleString("es-PE");
    setAmount(formatted);
  };

  const handleMoneyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    formatMoney(e.target.value);
  };

  const handleMoneyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!/[0-9]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleMoneyKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleMoneyFocus = () => {
    if (inputRef.current?.value === "0") {
      inputRef.current.select();
    }
  };

  const handleMoneyBlur = () => {
    if (!inputRef.current?.value || inputRef.current.value.trim() === "") {
      setAmount("0");
      adjustInputWidth();
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, 150);
    setMessageInput(value);
    setCharCount(value.length);
  };

  const handleContinue = (currentStep: 1 | 2) => {
    if (currentStep === 1) {
      if (numericAmount <= 0) {
        return;
      }
      setStep(2);
    } else if (currentStep === 2) {
      const name = nameInput.trim();
      const message = messageInput.trim();
      console.log("Monto:", numericAmount);
      console.log("De parte de:", name);
      console.log("Mensaje:", message);
      alert(
        `Monto: S/ ${numericAmount.toLocaleString("es-PE")}\nDe: ${name || "Anónimo"}\nMensaje: ${message || "Sin mensaje"}`
      );
    }
  };

  const handleBack = (currentStep: 1 | 2) => {
    if (currentStep === 2) {
      setStep(1);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-fondo font-sans flex items-center justify-center">
      {/* Step 1 */}
      {step === 1 && (
        <div className="flex flex-col h-full max-w-md mx-auto w-full">
          {/* Header */}
          <div className="relative px-6 pt-8 pb-6">
            <div className="text-center">
              <p className="text-md text-primario">Briana y Alexandre</p>
              <h1 className="text-2xl font-semibold mt-1 text-primario">
                Regalo de Boda
              </h1>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto px-6">
            <div className="flex flex-col min-h-full">
              {/* Input de monto */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative flex items-start">
                  <span className="text-2xl font-medium text-primario mr-1 mt-1">
                    S/
                  </span>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={handleMoneyInput}
                      onKeyDown={handleMoneyKeyDown}
                      onKeyPress={handleMoneyKeyPress}
                      onFocus={handleMoneyFocus}
                      onBlur={handleMoneyBlur}
                      className="text-6xl font-bold text-center text-secundario bg-transparent border-none outline-none focus:ring-0 p-0"
                    />
                    <span
                      ref={measureSpanRef}
                      className="invisible text-6xl font-bold absolute pointer-events-none whitespace-pre"
                    />
                  </div>
                </div>
              </div>

              {/* Campos adicionales */}
              <div className="w-full space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primario mb-2">
                    De parte de
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="Ingrese su nombre"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-4 py-3 bg-fondo-secundario rounded-xl text-primario placeholder-secundario outline-none focus:ring-2 focus:ring-primario transition-all duration-200 overflow-hidden text-ellipsis whitespace-nowrap"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primario mb-2">
                    Mensaje
                    <span className="text-primario text-xs">
                      ({charCount}/150)
                    </span>
                  </label>
                  <textarea
                    maxLength={150}
                    rows={3}
                    placeholder="Escribe un mensaje para los novios..."
                    value={messageInput}
                    onChange={handleMessageChange}
                    className="w-full px-4 py-3 bg-fondo-secundario rounded-xl text-primario placeholder-secundario outline-none focus:ring-2 focus:ring-primario transition-all duration-200 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Button */}
          <div className="px-6 py-4 border-t border-gray-100">
            <button
              onClick={() => handleContinue(1)}
              disabled={numericAmount <= 0}
              className="w-full font-semibold py-4 rounded-xl transition-colors duration-200 shadow-sm bg-button text-lg text-texto-button cursor-pointer disabled:cursor-not-allowed disabled:bg-button-deshabilitado disabled:text-texto-button-deshabilitado"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="flex flex-col h-full max-w-md mx-auto w-full">
          {/* Header */}
          <div className="relative px-6 pt-8 pb-6">
            <button
              onClick={() => handleBack(2)}
              className="absolute left-6 top-1/2 -translate-y-1/2"
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="text-center">
              <p className="text-md text-primario">Briana y Alexandre</p>
              <h1 className="text-2xl font-semibold mt-1 text-primario">
                Regalo de Boda
              </h1>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto px-6">
            <div className="flex flex-col min-h-full">
              {/* Monto display */}
              <div className="flex items-center justify-center py-4">
                <div className="relative flex items-start">
                  <span className="text-lg font-medium text-primario mr-1 mt-1">
                    S/
                  </span>
                  <span className="text-5xl font-bold text-center text-primario py-4">
                    {numericAmount}
                  </span>
                </div>
              </div>

              {/* Resumen tipo Checkout */}
              <div className="mt-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-base text-primario">
                    Comisión de servicio
                  </span>
                  <span className="text-base font-medium text-primario">
                    S/ {serviceFee.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-secundario"></div>

                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-primario">
                    Total
                  </span>
                  <span className="text-base font-bold text-primario">
                    S/ {total.toLocaleString("es-PE")}
                  </span>
                </div>

                <div className="border-b border-primario"></div>
              </div>

              {/* Campos de salida */}
              <div className="w-full space-y-4 mt-16">
                <div>
                  <label className="block text-sm font-medium text-primario mb-2">
                    De parte de
                  </label>
                  <p className="w-full px-4 py-3 bg-fondo-secundario rounded-xl text-primario outline-none text-ellipsis whitespace-nowrap">
                    {nameInput || "Sin nombre"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primario mb-2">
                    Mensaje
                  </label>
                  <p className="w-full px-4 py-3 bg-fondo-secundario rounded-xl text-primario placeholder-secundario outline-none resize-none min-h-24">
                    {messageInput || "Sin mensaje"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Button */}
          <div className="px-6 py-4 border-t border-gray-100">
            <button
              onClick={() => handleContinue(2)}
              className="w-full font-semibold py-4 rounded-xl transition-colors duration-200 shadow-sm bg-button text-lg text-texto-button cursor-pointer"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
