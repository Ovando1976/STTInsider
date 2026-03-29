import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const QUICK_AMOUNTS = [10, 25, 50, 100];

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState("25");
  const [isMonthly, setIsMonthly] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const amountValue = Number(amount);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!amount || Number.isNaN(amountValue) || amountValue < 5) {
      setStatus({
        type: "error",
        message: "Please enter a donation amount of at least $5.",
      });
      return;
    }

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setStatus(null);

    const cardElement = elements.getElement(CardElement);
    const { error } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
    });

    if (error) {
      setStatus({
        type: "error",
        message: error.message || "Payment failed. Try again.",
      });
    } else {
      setStatus({
        type: "success",
        message: `Thanks for your ${
          isMonthly ? "monthly " : ""
        }support! This demo does not charge your card.`,
      });
    }

    setLoading(false);
  };

  return (
    <form className="donate-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="donate-amount">Donation amount (USD)</label>
      <div className="donate-amount-row">
        <input
          id="donate-amount"
          className="donate-input"
          type="number"
          min="5"
          step="5"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <span className="donate-amount-suffix">USD</span>
      </div>

      <div
        className="donate-quick-amounts"
        role="group"
        aria-label="Quick donation amounts"
      >
        {QUICK_AMOUNTS.map((quickAmount) => (
          <button
            key={quickAmount}
            type="button"
            className={`donate-chip${
              amountValue === quickAmount ? " active" : ""
            }`}
            onClick={() => setAmount(String(quickAmount))}
          >
            ${quickAmount}
          </button>
        ))}
      </div>

      <label className="donate-monthly-toggle">
        <input
          type="checkbox"
          checked={isMonthly}
          onChange={() => setIsMonthly((prev) => !prev)}
        />
        Make this a monthly contribution
      </label>

      <label className="donate-label" htmlFor="card-element">
        Card details
      </label>
      <div className="donate-card-element" id="card-element">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#1a2b3c",
                "::placeholder": { color: "#7b8ea3" },
              },
            },
          }}
        />
      </div>

      <button
        className="donate-button"
        type="submit"
        disabled={!stripe || loading}
      >
        {loading ? "Processing..." : `Donate $${amountValue || 0}`}
      </button>

      {status && (
        <p
          className={`donate-status ${status.type}`}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </p>
      )}

      <p className="donate-note">
        Payments are processed securely with Stripe. This demo does not initiate
        a real charge.
      </p>
    </form>
  );
}

export default CheckoutForm;
