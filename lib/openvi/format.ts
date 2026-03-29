export function formatMoney(value?: number) {
    if (typeof value !== "number") return "—";
  
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  export function formatDateTime(value?: string) {
    if (!value) return "—";
  
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
  
    return date.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }