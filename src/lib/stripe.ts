import Stripe from 'stripe';
import { PrismaClient, UserTier, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    downloadsPerDay: 10,
    apiCallsPerDay: 100,
    features: ['Basic downloads', 'Standard quality'],
  },
  PRO_MONTHLY: {
    name: 'Pro Monthly',
    price: 999, // $9.99 in cents
    downloadsPerDay: 100,
    apiCallsPerDay: 1000,
    features: ['High quality downloads', 'No ads', 'Priority support'],
  },
  PRO_YEARLY: {
    name: 'Pro Yearly',
    price: 9999, // $99.99 in cents
    downloadsPerDay: 100,
    apiCallsPerDay: 1000,
    features: ['High quality downloads', 'No ads', 'Priority support', '2 months free'],
  },
  ENTERPRISE_MONTHLY: {
    name: 'Enterprise Monthly',
    price: 4999, // $49.99 in cents
    downloadsPerDay: 1000,
    apiCallsPerDay: 10000,
    features: ['Unlimited downloads', 'API access', 'White-label', 'Dedicated support'],
  },
  ENTERPRISE_YEARLY: {
    name: 'Enterprise Yearly',
    price: 49999, // $499.99 in cents
    downloadsPerDay: 1000,
    apiCallsPerDay: 10000,
    features: ['Unlimited downloads', 'API access', 'White-label', 'Dedicated support', '2 months free'],
  },
};

export async function createCheckoutSession(
  userId: string,
  plan: SubscriptionPlan,
  successUrl: string,
  cancelUrl: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const planConfig = SUBSCRIPTION_PLANS[plan];
  
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: planConfig.name,
            description: planConfig.features.join(', '),
          },
          unit_amount: planConfig.price,
          recurring: plan.includes('MONTHLY') ? { interval: 'month' } : { interval: 'year' },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      plan,
    },
  });

  return session;
}

export async function handleWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan as SubscriptionPlan;

  if (!userId || !plan) {
    console.error('Missing metadata in checkout session');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

  await prisma.subscription.create({
    data: {
      userId,
      plan,
      status: SubscriptionStatus.ACTIVE,
      stripeId: subscription.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  // Upgrade user tier
  const tier = plan.includes('ENTERPRISE') ? UserTier.ENTERPRISE : UserTier.PRO;
  await prisma.user.update({
    where: { id: userId },
    data: { tier },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeId: subscription.id },
  });

  if (!dbSubscription) {
    console.error('Subscription not found in database');
    return;
  }

  const status = subscription.status === 'active' ? SubscriptionStatus.ACTIVE : 
                 subscription.status === 'canceled' ? SubscriptionStatus.CANCELED :
                 subscription.status === 'past_due' ? SubscriptionStatus.PAST_DUE :
                 SubscriptionStatus.UNPAID;

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeId: subscription.id },
  });

  if (!dbSubscription) {
    console.error('Subscription not found in database');
    return;
  }

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: { status: SubscriptionStatus.CANCELED },
  });

  // Downgrade user to free tier
  await prisma.user.update({
    where: { id: dbSubscription.userId },
    data: { tier: UserTier.FREE },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeId: subscription.id },
  });

  if (!dbSubscription) {
    console.error('Subscription not found in database');
    return;
  }

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: { status: SubscriptionStatus.PAST_DUE },
  });
}

export async function cancelSubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { 
      userId,
      status: SubscriptionStatus.ACTIVE,
    },
  });

  if (!subscription?.stripeId) {
    throw new Error('No active subscription found');
  }

  await stripe.subscriptions.cancel(subscription.stripeId);
  
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: SubscriptionStatus.CANCELED },
  });

  // Downgrade user to free tier
  await prisma.user.update({
    where: { id: userId },
    data: { tier: UserTier.FREE },
  });
}

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: { 
      userId,
      status: SubscriptionStatus.ACTIVE,
    },
  });
}
