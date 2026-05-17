import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export const ONBOARDING_PRODUCT = 'onboarding_builder';
export const ONBOARDING_CREDITS_PER_PURCHASE = 3;
