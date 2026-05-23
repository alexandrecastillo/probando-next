"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export default function WeddingGiftFlow() {
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState("0");
  const [nameInput, setNameInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: "", message: "" });

  const inputRef = useRef<HTMLInputElement>(null);
  const measureSpanRef = useRef<HTMLSpanElement>(null);

  const numericAmount = parseInt(amount.replace(/,/g, "") || "0");
  const formattedAmount = numericAmount.toLocaleString("es-PE");
  const isStep1ContinueDisabled = numericAmount <= 0;

  
  const adjustInputWidth = useCallback(() => {
    if (!inputRef.current || !measureSpanRef.current) return;
    const value = inputRef.current.value || "0";
    measureSpanRef.current.textContent = value;
    const width = measureSpanRef.current.offsetWidth;
    inputRef.current.style.width = width + (value === "1" ? 20 : 5) + "px";
  }, []);

  useEffect(() => {
    adjustInputWidth();
  }, [amount, adjustInputWidth]);

  const { totalToCharge, commission } = useMemo(() => calculatePrice(numericAmount), [numericAmount]);
  const serviceFee = commission;
  const total = totalToCharge;
  const formattedTotal = total.toLocaleString("es-PE");

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

  const moveMoneyCursorToEnd = () => {
    const input = inputRef.current;
    if (!input) return;

    const position = input.value.length;
    input.setSelectionRange(position, position);
  };

  const handleMoneyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    formatMoney(e.target.value);
    window.requestAnimationFrame(moveMoneyCursorToEnd);
  };

  const handleMoneyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      !/[0-9]/.test(e.key) &&
      !["Backspace", "Delete", "Tab"].includes(e.key)
    ) {
      e.preventDefault();
      return;
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      moveMoneyCursorToEnd();
    }
  };

  const handleMoneyKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleMoneyFocus = () => {
    moveMoneyCursorToEnd();
  };

  const handleMoneyBlur = () => {
    if (!inputRef.current?.value || inputRef.current.value.trim() === "") {
      setAmount("0");
      adjustInputWidth();
    }
  };

  function calculatePrice(net: number) {
    const rate = 0.0329;
    const igv = 0.18;
    const fixed = 1.0;

    let assume = 1;

    if (net >= 200) {
      assume = 0.75;
    } else if (net >= 300) {
      assume = 0.5;
    }

    // real commission
    const r = rate * (1 + igv);
    const f = fixed * (1 + igv);

    const total = (net + assume * f) / (1 - assume * r);
    const commission = total - net;

    return {
      net,
      totalToCharge: +total.toFixed(2),
      commission: +commission.toFixed(2),
    };
  }

  useEffect(() => {
    if (step !== 1) return;
    const input = inputRef.current;
    if (!input) return;

    input.focus();
    const value = input.value || "";
    const position = value.length;

    window.requestAnimationFrame(() => {
      input.setSelectionRange(position, position);
    });
  }, [step]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, 150);
    setMessageInput(value);
    setCharCount(value.length);
  };

  const createPreference = async () => {
    const name = nameInput.trim();
    const message = messageInput.trim();

    setIsLoading(true);

    const maxRetries = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch("/api/mercadopago", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mensaje: message,
            montoRegalo: String(numericAmount),
            montoComisionMP: String(serviceFee),
            nombre: name,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.init_point) {
          throw new Error(data.error || "No se pudo crear la preferencia");
        }

        alert("Redirigiendo a Mercado Pago...");
        window.location.href = data.init_point;
        return;
      } catch (error) {
        // Detectar si es un error de conexión/internet
        const isNetworkError =
          !navigator.onLine ||
          (error instanceof TypeError &&
            error.message.includes("Failed to fetch"));

        if (isNetworkError) {
          // Si no hay internet, no reintentar
          setIsLoading(false);
          setErrorModal({
            isOpen: true,
            title: "Sin conexión a internet",
            message:
              "No pudimos conectar con el servidor. Por favor, verifica tu conexión a internet e intenta nuevamente.",
          });
          return;
        }

        console.error(
          `Error al crear preferencia de Mercado Pago (intento ${attempt}/${maxRetries}):`,
          error
        );

        if (attempt < maxRetries) {
          // Esperar un poco antes de reintentar
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    setIsLoading(false);
    setErrorModal({
      isOpen: true,
      title: "Error al conectar con Mercado Pago",
      message:
        "Ocurrió un error, en estos momentos no se puede hacer un regalo mediante tarjeta de débito y crédito.\n\nPuedes intentar con otras opciones:\n• Transferencia bancaria\n• Yape\n• Plin",
    });
  };

  const handleContinue = (currentStep: 1 | 2) => {
    if (currentStep === 1) {
      if (numericAmount <= 0) {
        return;
      }
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setStep(2);
      }, 1000);
    } else if (currentStep === 2) {
      createPreference();
    }
  };

  const handleBack = (currentStep: 1 | 2) => {
    if (currentStep === 2) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setStep(1);
      }, 600);
    }
  };

  return (
    <div className="h-dvh overflow-hidden bg-fondo font-sans flex items-center justify-center">
      {/* Error Modal */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg">
            <h2 className="text-xl font-semibold text-primario mb-3">
              {errorModal.title}
            </h2>
            <p className="text-primario mb-6 whitespace-pre-line text-sm leading-relaxed">
              {errorModal.message}
            </p>
            <button
              onClick={() =>
                setErrorModal({ isOpen: false, title: "", message: "" })
              }
              className="w-full bg-button text-texto-button font-semibold py-3 rounded-xl transition-colors duration-200"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
      {/* Loading Screen */}
      {isLoading && (
        <div className="flex flex-col h-full max-w-md mx-auto w-full items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-primario/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primario border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-primario text-lg font-medium">Continuar...</p>
          </div>
        </div>
      )}

      {/* Step 1 */}
      <div
        className={`flex flex-col h-full max-w-md mx-auto w-full ${step !== 1 || isLoading ? "hidden" : ""}`}
      >
        {/* Header */}
        <div className="relative px-6 pt-8 pb-6">
          <div className="text-center">
            <p className="text-md text-primario font-monte-carlo">
              Briana y Alexandre
            </p>
            <h1 className="text-2xl font-semibold mt-1 text-primario">
              Regalo de Boda
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6">
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
                    onKeyUp={handleMoneyKeyPress}
                    onFocus={handleMoneyFocus}
                    onClick={moveMoneyCursorToEnd}
                    onSelect={moveMoneyCursorToEnd}
                    onBlur={handleMoneyBlur}
                    className={`text-6xl font-bold text-center bg-transparent border-none outline-none focus:ring-0 p-0 transition-colors ${
                      numericAmount > 0 ? "text-primario" : "text-secundario"
                    }`}
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
                <label className="block text-md font-medium text-primario mb-2">
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
                <label
                  htmlFor="message"
                  className="block text-md font-medium text-primario mb-2"
                >
                  Mensaje{" "}
                  <span className="text-secundario text-xs">
                    ({charCount}/150)
                  </span>
                </label>
                <textarea
                  id="message"
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
        <div className="px-6 pb-safe py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => handleContinue(1)}
            disabled={isStep1ContinueDisabled}
            className="w-full font-semibold py-4 rounded-xl transition-colors duration-200 bg-button text-lg text-texto-button cursor-pointer disabled:cursor-not-allowed disabled:bg-button-deshabilitado disabled:text-texto-button-deshabilitado"
          >
            Continuar
          </button>
        </div>
      </div>

      {/* Step 2 */}
      <div
        className={`flex flex-col h-full max-w-md mx-auto w-full ${step !== 2 || isLoading ? "hidden" : ""}`}
      >
        {/* Header */}
        <div className="relative px-6 pt-8 pb-6">
          <button
            onClick={() => handleBack(2)}
            className="absolute left-6 top-1/2 -translate-y-1/2"
          >
            <svg
              className="w-6 h-6 text-primario"
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
            <p className="text-md text-primario font-monte-carlo">
              Briana y Alexandre
            </p>
            <h1 className="text-2xl font-semibold mt-1 text-primario">
              Regalo de Boda
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6">
          <div className="flex flex-col min-h-full">
            {/* Monto display */}
            <div className="flex items-center justify-center py-4">
              <div className="relative flex items-start">
                <span className="text-lg font-medium text-primario mr-1 mt-1">
                  S/
                </span>
                <span className="text-5xl font-bold text-center text-primario py-4">
                  {formattedAmount}
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
                  S/ {formattedTotal}
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
                  {nameInput || "Anónimo"}
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
        <div className="px-6 pb-safe py-4 border-t border-gray-100">
          <button
            onClick={() => handleContinue(2)}
            className="w-full font-semibold py-4 rounded-xl transition-colors duration-200 bg-button text-lg text-texto-button cursor-pointer"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
