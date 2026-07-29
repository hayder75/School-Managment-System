export function FormError({ message }) {
  if (!message) return null;
  return <p className="text-sm text-red-500 mt-1">{message}</p>;
}

export function FieldError({ errors, field }) {
  const msg = errors?.[field];
  if (!msg) return null;
  return <p className="text-sm text-red-500 mt-1">{msg}</p>;
}
