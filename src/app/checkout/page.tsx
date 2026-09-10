import type { Metadata } from "next";

import { CheckoutFlow } from "@/components/checkout-flow";
import { getCurrentCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Secure global checkout with duties and taxes included.",
};

export default async function CheckoutPage() {
  const customer = await getCurrentCustomer();

  return (
    <CheckoutFlow
      customer={
        customer
          ? {
              email: customer.email,
              fullName: customer.fullName,
              phone: customer.phone,
              address1: customer.defaultAddress1,
              address2: customer.defaultAddress2,
              city: customer.defaultCity,
              region: customer.defaultRegion,
              postalCode: customer.defaultPostalCode,
              country: customer.defaultCountry || "United States",
            }
          : null
      }
    />
  );
}
