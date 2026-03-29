"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from "./CheckoutForm";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ?? ""
);

export default function StripePayment() {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY) {
    return <div>Missing Stripe public key.</div>;
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}