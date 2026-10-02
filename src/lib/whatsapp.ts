/** Opens a WhatsApp chat with an Indian number and a pre-filled message. */
export function waLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  const number = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
