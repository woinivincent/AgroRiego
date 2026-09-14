const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatearFecha = (fecha: Date) => FORMATO_FECHA.format(fecha);
export const formatearFechaHora = (fecha: Date) => FORMATO_FECHA_HORA.format(fecha);

export function formatearLitros(litros: number) {
  if (litros >= 1000) {
    return `${(litros / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} m³`;
  }
  return `${Math.round(litros).toLocaleString("es-AR")} L`;
}

export function formatearNumero(valor: number, decimales = 1) {
  return valor.toLocaleString("es-AR", { maximumFractionDigits: decimales });
}

export function formatearDuracion(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}

// Convierte un Date al formato que espera <input type="datetime-local">
export function aInputDateTime(fecha: Date) {
  const desfase = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - desfase).toISOString().slice(0, 16);
}
