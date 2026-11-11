import type { Cents, ID } from '@/domain/types';

/**
 * Payment boundary. Eat&Meet will eventually collect guest contributions,
 * pay hosts out and keep a platform fee through a regulated payment provider
 * (e.g. a marketplace / split-payment product).
 *
 * For the hackathon the only implementation is `demoPaymentProvider`:
 *   - it never asks for or stores card details,
 *   - it never contacts a payment service,
 *   - it returns a reference prefixed with `DEMO-` so simulated
 *     contributions can never be confused with real transactions.
 */
export interface ContributionRequest {
  dinnerId: ID;
  guestId: ID;
  amountCents: Cents;
}

export interface ContributionAuthorization {
  providerReference: string;
  simulated: true;
}

export interface PaymentProvider {
  readonly name: string;
  readonly isSimulated: boolean;
  authorizeContribution(request: ContributionRequest): Promise<ContributionAuthorization>;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const demoPaymentProvider: PaymentProvider = {
  name: 'Demo contribution (no real money)',
  isSimulated: true,
  async authorizeContribution(request) {
    if (!Number.isInteger(request.amountCents) || request.amountCents <= 0) {
      throw new Error('Invalid contribution amount.');
    }
    // Simulated network latency so the confirmation flow feels realistic.
    await wait(900);
    const reference = `DEMO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return { providerReference: reference, simulated: true };
  },
};

export const paymentProvider: PaymentProvider = demoPaymentProvider;
