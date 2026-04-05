"use client";
import { useState } from "react";
import clsx from "clsx";

function calcularComision(monto: number) {
  return Math.round(monto * 0.05 * 100) / 100;
}

export default function WeddingGiftFlow() {
  const [step, setStep] = useState(1);
  const [monto, setMonto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [charCount, setCharCount] = useState(0);

  // Formateo de moneda en tiempo real
  const handleMontoChange = (e: { target: { value: string; }; }) => {
    let value = e.target.value.replace(/[^\d.]/g, "");
    if (value.startsWith("0") && !value.startsWith("0.")) value = value.replace(/^0+/, "");
    setMonto(value);
    if (error) setError("");
  };

  const handleMensajeChange = (e: { target: { value: string | any[]; }; }) => {
    const value = e.target.value.slice(0, 200);
    setMensaje(value.toString());
    setCharCount(value.length);
    if (error) setError("");
  };

  const montoNum = Number(monto);
  const montoValido = montoNum >= 10;
  const mensajeValido = mensaje.length <= 200;
  const comision = calcularComision(montoNum);
  const total = montoValido ? montoNum + comision : 0;

  const handleContinuar = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    if (!montoValido) {
      setError("El monto mínimo es S/ 10");
      return;
    }
    setStep(2);
  };

  const handlePagar = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montoRegalo: montoNum,
          montoComisionMP: comision,
          mensaje,
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

  // Animaciones y layout responsive
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-6 px-2">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6 sm:p-8 transition-all duration-500">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Regalo de Boda</h1>
          <p className="text-gray-500 text-sm mt-1">Briana y Alexandre</p>
        </div>
        {/* Paso 1 */}
        <form
          className={clsx(
            "transition-opacity duration-500",
            step === 1 ? "opacity-100" : "opacity-0 pointer-events-none absolute"
          )}
          onSubmit={handleContinuar}
        >
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium">Monto del regalo</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">S/</span>
              <input
                type="number"
                inputMode="decimal"
                min="10"
                step="0.01"
                className="pl-10 pr-3 py-2 w-full rounded-lg border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-200 text-lg font-semibold bg-gray-50 outline-none transition"
                placeholder="10.00"
                value={monto}
                onChange={handleMontoChange}
                required
              />
            </div>
            {!montoValido && monto !== "" && (
              <span className="text-xs text-red-500 mt-1 block">El monto mínimo es S/ 10</span>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium">Mensaje (opcional)</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-200 p-2 resize-none bg-gray-50 outline-none transition"
              rows={3}
              maxLength={200}
              placeholder="Escribe un mensaje para los novios..."
              value={mensaje}
              onChange={handleMensajeChange}
            />
            <div className="text-xs text-gray-400 text-right mt-1">{charCount}/200</div>
          </div>
          {error && <div className="text-red-500 text-sm mb-2 text-center">{error}</div>}
          <button
            type="submit"
            disabled={!montoValido || loading}
            className={clsx(
              "w-full py-3 rounded-xl font-semibold text-white bg-gray-900 transition-all duration-200 mt-2",
              (!montoValido || loading) ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.03] active:scale-95 shadow-md"
            )}
          >
            {loading ? "Cargando..." : "Continuar"}
          </button>
        </form>
        {/* Paso 2 */}
        <div
          className={clsx(
            "transition-opacity duration-500",
            step === 2 ? "opacity-100" : "opacity-0 pointer-events-none absolute"
          )}
        >
          {/* Desktop: 2 columnas, Mobile: stack */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Columna izquierda */}
            <div className="flex-1 bg-gray-50 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
              <div className="text-gray-500 text-xs mb-1">Monto del regalo</div>
              <div className="text-3xl font-bold text-gray-900 mb-2">S/ {montoNum.toFixed(2)}</div>
              {mensaje && (
                <blockquote className="italic text-center text-gray-600 border-l-4 border-gray-200 pl-3 mt-2 max-w-xs mx-auto">
                  {mensaje}
                </blockquote>
              )}
            </div>
            {/* Columna derecha: resumen */}
            <div className="flex-1 bg-white rounded-xl p-4 shadow-sm flex flex-col justify-between min-h-[180px]">
              <div>
                <div className="flex justify-between text-gray-700 mb-1">
                  <span>Subtotal</span>
                  <span>S/ {montoNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500 mb-1">
                  <span>Comisión Mercado Pago (5%)</span>
                  <span>S/ {comision.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-2 border-t pt-2">
                  <span>Total a pagar</span>
                  <span>S/ {total.toFixed(2)}</span>
                </div>
              </div>
              {error && <div className="text-red-500 text-sm mt-2 text-center">{error}</div>}
              <button
                onClick={handlePagar}
                disabled={loading}
                className={clsx(
                  "w-full py-3 rounded-xl font-semibold text-white bg-gray-900 transition-all duration-200 mt-4",
                  loading ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.03] active:scale-95 shadow-md"
                )}
              >
                {loading ? "Procesando..." : "Pagar con Mercado Pago"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full mt-2 text-gray-500 underline text-sm"
                disabled={loading}
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
