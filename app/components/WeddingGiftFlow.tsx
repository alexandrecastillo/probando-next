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
  const nameRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const measureSpanRef = useRef<HTMLSpanElement>(null);

  // Generador de UUID (fallback si no existe crypto.randomUUID)
  const generateUUID = () => {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    // fallback simple (no criptográficamente seguro)
    const s4 = () =>
      Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  };

  // Obtener o crear un id persistente del navegador
  const getOrCreateBrowserId = () => {
    const key = "mp_browser_id";
    if (typeof window === "undefined") return "";
    try {
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const id = generateUUID();
      localStorage.setItem(key, id);
      return id;
    } catch (e) {
      return "";
    }
  };
  const numericAmount = parseInt(amount.replace(/,/g, "") || "0");
  const formattedAmount = numericAmount.toLocaleString("es-PE");
  const isStep1ContinueDisabled = numericAmount <= 0;

  const adjustInputWidth = useCallback(() => {
    const input = inputRef.current;
    const measure = measureSpanRef.current;
    if (!input || !measure) return;

    const value = input.value || "0";
    // Escribir en el span (por compatibilidad) — mantiene semántica existente
    measure.textContent = value;

    // Intentar medir con canvas usando estilos computados (más fiable con fuentes web)
    try {
      const cs = window.getComputedStyle(input);
      const font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = font;
        const metrics = ctx.measureText(value);
        const width = Math.ceil(metrics.width);
        const padding = value === "1" ? 20 : 5;
        input.style.width = width + padding + "px";
        return;
      }
    } catch (e) {
      // fallback al método anterior
    }

    const width = measure.offsetWidth || 0;
    input.style.width = width + (value === "1" ? 20 : 5) + "px";
  }, []);

  useEffect(() => {
    adjustInputWidth();
  }, [amount, adjustInputWidth]);

  // Asegurar cálculo inicial del ancho al montar (fuentes pueden cargar luego)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raf = () => {
      window.requestAnimationFrame(() => {
        adjustInputWidth();
      });
    };

    // Llamar en mount y también después de 'load' por si las fuentes aún cargan
    raf();
    window.addEventListener("load", raf);

    return () => {
      window.removeEventListener("load", raf);
    };
  }, [adjustInputWidth]);

  const { totalToCharge, commission } = useMemo(
    () => calculatePrice(numericAmount),
    [numericAmount],
  );
  const serviceFee = commission;
  const total = totalToCharge;
  const formattedTotal = total.toLocaleString("es-PE");

  const formatMoney = (value: string) => {
    // Remover todo lo que no sea número
    let numValue = value.replace(/\D/g, "");

    // Limitar a 5 dígitos y máximo 25000
    if (numValue.length > 5) {
      numValue = numValue.substring(0, 5);
    }

    // Si está vacío, mostrar 0
    if (!numValue) {
      setAmount("0");
      return;
    }

    // Remover ceros a la izquierda
    let numeric = parseInt(numValue, 10);
    if (numeric > 25000) {
      numeric = 25000;
    }
    numValue = numeric.toString();

    // Formatear con comas para miles
    const formatted = numeric.toLocaleString("es-PE");
    setAmount(formatted);
  };

  // Detectar cuando el usuario vuelve a la pestaña (back/return) desde otro flujo
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkReturn = () => {
      try {
        const saved = localStorage.getItem("mp_saved_attempt");
        if (saved) {
          setIsLoading(false);
        }
      } catch (e) {
        // ignore
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") checkReturn();
    };

    window.addEventListener("focus", checkReturn);
    window.addEventListener("pageshow", checkReturn);
    window.addEventListener("popstate", checkReturn);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", checkReturn);
      window.removeEventListener("pageshow", checkReturn);
      window.removeEventListener("popstate", checkReturn);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const moveMoneyCursorToEnd = () => {
    const input = inputRef.current;
    if (!input) return;

    input.focus();
    const position = input.value.length;
    input.setSelectionRange(position, position);
  };

  const capitalizeWords = (value: string) => {
    return value
      .split(/(\s+)/)
      .map((token) => {
        if (/\s+/.test(token)) return token;
        return token.length > 0 ? token[0].toUpperCase() + token.slice(1) : token;
      })
      .join("");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNameInput(capitalizeWords(val));
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      messageRef.current?.focus();
    }
  };

  const handleMessageKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).blur();
    }
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

    if (e.key === "Enter") {
      e.preventDefault();
      nameRef.current?.focus();
      return;
    }

    if (
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End"
    ) {
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

  // Restaurar intento guardado si hay una señal de restauración (por ejemplo desde /failure)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const shouldRestore = localStorage.getItem("mp_restore");
      const saved = localStorage.getItem("mp_saved_attempt");
      const errorModalData = localStorage.getItem("mp_error_modal");
      if (shouldRestore && saved) {
        const obj = JSON.parse(saved);
        if (obj) {
          // Restaurar campos
          if (obj.formattedAmount) setAmount(obj.formattedAmount);
          if (obj.nombre) setNameInput(obj.nombre);
          if (obj.mensaje) setMessageInput(obj.mensaje);
          // Ir al paso 2
          setStep(2);
          // Asegurar que el ancho del input se recalcule y el cursor vaya al final
          if (typeof window !== "undefined") {
            window.requestAnimationFrame(() => {
              adjustInputWidth();
              moveMoneyCursorToEnd();
            });
            // extra raf por si la actualización de estado necesita otro frame
            window.requestAnimationFrame(() => {
              adjustInputWidth();
            });
          }
        }
      }

      if (errorModalData) {
        try {
          const modal = JSON.parse(errorModalData);
          if (modal && modal.message) {
            setErrorModal({
              isOpen: true,
              title: modal.title || "",
              message: modal.message,
            });
          }
        } catch (e) {
          // ignore
        }
      }

      // limpiar banderas
      localStorage.removeItem("mp_restore");
      localStorage.removeItem("mp_error_modal");
    } catch (e) {
      // ignore
    }
  }, []);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, 150);
    setMessageInput(value);
    setCharCount(value.length);
  };

  const createPreference = async () => {
    const name = nameInput.trim();
    const message = messageInput.trim();

    setIsLoading(true);

    // Verificar conexión de red antes de intentar
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsLoading(false);
      setErrorModal({
        isOpen: true,
        title: "Sin conexión a internet",
        message:
          "No pudimos conectar con el servidor. Por favor, verifica tu conexión a internet e intenta nuevamente.",
      });
      return;
    }

    // Crear una nueva external reference para este intento
    const externalReference = generateUUID();

    // Obtener o crear identificador persistente del navegador
    const browserId = getOrCreateBrowserId();

    // Guardar intento actual para poder restaurarlo si el usuario vuelve
    try {
      const saved = {
        nombre: name,
        mensaje: message,
        montoRegalo: numericAmount,
        montoComisionMP: serviceFee,
        total: total,
        formattedAmount: formattedAmount,
        externalReference,
        browserId,
      };
      localStorage.setItem("mp_saved_attempt", JSON.stringify(saved));
    } catch (e) {
      // ignore
    }

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
            external_reference: externalReference,
            browser_id: browserId,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.init_point) {
          throw new Error(data.error || "No se pudo crear la preferencia");
        }

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
          error,
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
      message: `Ocurrió un error, en estos momentos no se puede hacer un obsequio mediante tarjeta de débito y crédito.\n\nPuede intentar con otras opciones:\n• Transferencia bancaria\n• Yape\n• Plin\n\nID del navegador: ${browserId}\nReferencia externa: ${externalReference}`,
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
      }, 500);
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
      }, 500);
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
            <div onClick={moveMoneyCursorToEnd} className="flex-1 flex items-center justify-center">
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
                  ref={nameRef}
                  type="text"
                  maxLength={50}
                  placeholder="Ingrese su nombre"
                  value={nameInput}
                  onChange={handleNameChange}
                  onKeyDown={handleNameKeyDown}
                  className="w-full px-4 py-3 bg-fondo-secundario text-primario placeholder-secundario outline-none focus:ring-2 focus:ring-primario transition-all duration-200 overflow-hidden text-ellipsis whitespace-nowrap"
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
                  placeholder="Escriba un mensaje para los novios..."
                  value={messageInput}
                  ref={messageRef}
                  onChange={handleMessageChange}
                  onKeyDown={handleMessageKeyDown}
                  className="w-full px-4 py-3 bg-fondo-secundario text-primario placeholder-secundario outline-none focus:ring-2 focus:ring-primario transition-all duration-200 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Button */}
        <div className="px-6 pb-safe py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              if (!isStep1ContinueDisabled) handleContinue(1);
            }}
            disabled={isStep1ContinueDisabled}
            aria-disabled={isStep1ContinueDisabled}
            className={`w-full font-medium py-4 transition-colors duration-200 ${isStep1ContinueDisabled ? 'bg-button-deshabilitado text-texto-button-deshabilitado cursor-not-allowed' : 'bg-button text-texto-button cursor-pointer'}`}
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
                <p className="w-full px-4 py-3 bg-fondo-secundario text-primario outline-none text-ellipsis whitespace-nowrap">
                  {nameInput || "Anónimo"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primario mb-2">
                  Mensaje
                </label>
                <p className="w-full px-4 py-3 bg-fondo-secundario text-primario placeholder-secundario outline-none resize-none min-h-24">
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
            className="w-full font-semibold py-4 transition-colors duration-200 bg-button text-lg text-texto-button cursor-pointer"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
