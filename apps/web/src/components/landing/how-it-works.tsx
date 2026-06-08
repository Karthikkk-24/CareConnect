import { ClayCard } from '@careconnect/ui';

const steps = [
  {
    step: '01',
    title: 'Register your hospital',
    description: 'Create your account, set up your hospital profile, and configure departments.',
  },
  {
    step: '02',
    title: 'Add your team',
    description: 'Invite doctors, nurses, receptionists, and assign role-based permissions.',
  },
  {
    step: '03',
    title: 'Go live',
    description: 'Start managing patients, appointments, and clinical workflows immediately.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-clay-text">How it works</h2>
          <p className="text-clay-text-muted">Up and running in three simple steps</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((item) => (
            <ClayCard key={item.step} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-clay-primary-light to-clay-primary text-lg font-bold text-white shadow-clay-sm">
                {item.step}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-clay-text">{item.title}</h3>
              <p className="text-sm text-clay-text-muted">{item.description}</p>
            </ClayCard>
          ))}
        </div>
      </div>
    </section>
  );
}
