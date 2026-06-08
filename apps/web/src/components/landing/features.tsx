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
    description: 'Complete patient records with medical history, vitals, documents, and consent tracking.',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Appointment booking, walk-ins, doctor calendars, and automated reminders.',
  },
  {
    icon: ClipboardList,
    title: 'Clinical Workflows',
    description: 'Admissions, diagnoses, prescriptions, nursing notes, and discharge summaries.',
  },
  {
    icon: FlaskConical,
    title: 'Lab Integration',
    description: 'Order tests, track samples, and deliver results directly to patient charts.',
  },
  {
    icon: Pill,
    title: 'Pharmacy Module',
    description: 'Prescription queue, drug interaction checks, and inventory management.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Revenue, occupancy, patient statistics, and customizable dashboards.',
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
