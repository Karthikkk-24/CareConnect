import { ClayCard } from '@careconnect/ui';
import {
  Calendar,
  ClipboardList,
  FlaskConical,
  Pill,
  Stethoscope,
  BarChart3,
} from 'lucide-react';

const features = [
  {
    icon: Stethoscope,
    title: 'Patient 360°',
    description: 'Patient records with medical history, documents, consents, and clinical actions.',
  },
  {
    icon: Calendar,
    title: 'Scheduling',
    description: 'Book appointments by date, check patients in, and track status through completion.',
  },
  {
    icon: ClipboardList,
    title: 'Clinical Workflows',
    description: 'Admissions, vitals, notes, prescriptions, nursing tasks, and discharge summaries.',
  },
  {
    icon: FlaskConical,
    title: 'Lab Orders',
    description: 'Order tests and record results against the patient chart.',
  },
  {
    icon: Pill,
    title: 'Pharmacy & Inventory',
    description: 'Prescription dispense queue and basic medical supply stock tracking.',
  },
  {
    icon: BarChart3,
    title: 'Reports',
    description: 'Hospital KPIs for patients, appointments, occupancy, and revenue.',
  },
];

export function Features() {
  return (
    <section id="features" className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-clay-text md:text-4xl">
            Everything your hospital needs
          </h2>
          <p className="mx-auto max-w-2xl text-clay-text-muted">
            From patient intake to discharge and follow-ups — one platform for every department.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <ClayCard key={feature.title} className="transition-transform hover:-translate-y-1">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-clay-primary-light text-clay-primary shadow-clay-inset">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-clay-text">{feature.title}</h3>
              <p className="text-sm text-clay-text-muted">{feature.description}</p>
            </ClayCard>
          ))}
        </div>
      </div>
    </section>
  );
}
