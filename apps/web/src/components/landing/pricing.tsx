import Link from 'next/link';
import { ClayBadge, ClayButton, ClayCard } from '@careconnect/ui';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'For small clinics getting started',
    features: ['Up to 50 patients', '2 staff accounts', 'Basic scheduling', 'Community support'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$99',
    period: '/month',
    description: 'For growing hospitals',
    features: [
      'Unlimited patients',
      '50 staff accounts',
      'Full clinical modules',
      'Lab & pharmacy',
      'Priority support',
    ],
    cta: 'Start Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For hospital networks',
    features: [
      'Single hospital workspace',
      'Unlimited staff',
      'Custom integrations',
      'Dedicated onboarding help',
      'Email support',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-clay-text">Simple, transparent pricing</h2>
          <p className="text-clay-text-muted">
            Open-source software — register a workspace to try every module. Listed plan limits are
            illustrative only and are not enforced in the app.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <ClayCard
              key={plan.name}
              className={plan.highlighted ? 'ring-2 ring-clay-primary/30' : ''}
            >
              {plan.highlighted ? (
                <ClayBadge className="mb-4">Most Popular</ClayBadge>
              ) : null}
              <h3 className="text-xl font-bold text-clay-text">{plan.name}</h3>
              <p className="mt-1 text-sm text-clay-text-muted">{plan.description}</p>
              <div className="my-6">
                <span className="text-4xl font-bold text-clay-primary">{plan.price}</span>
                {plan.period ? (
                  <span className="text-clay-text-muted">{plan.period}</span>
                ) : null}
              </div>
              <ul className="mb-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-clay-text">
                    <span className="h-1.5 w-1.5 rounded-full bg-clay-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <ClayButton
                  variant={plan.highlighted ? 'primary' : 'secondary'}
                  className="w-full"
                >
                  {plan.cta === 'Contact Sales' ? 'Get Started' : plan.cta}
                </ClayButton>
              </Link>
            </ClayCard>
          ))}
        </div>
      </div>
    </section>
  );
}
