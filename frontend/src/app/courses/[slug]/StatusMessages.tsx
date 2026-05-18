import type { CheckoutMessage } from "@/lib/checkout-status";

type StatusMessagesProps = {
  messages: CheckoutMessage[];
};

export default function StatusMessages({ messages }: StatusMessagesProps) {
  if (messages.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      {messages.map((message) => (
        <div
          key={`${message.type}-${message.text}`}
          role={message.type === "error" ? "alert" : "status"}
          aria-live={message.type === "error" ? "assertive" : "polite"}
          className={`rounded-xl border px-5 py-4 text-sm ${
            message.type === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : message.type === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-200"
                : "border-blue-500/30 bg-blue-500/10 text-blue-200"
          }`}
        >
          {message.text}
        </div>
      ))}
    </div>
  );
}
