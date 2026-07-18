'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { Calendar, FileText, FlaskConical, Pill } from 'lucide-react';
import { ClayCard, ClayStatCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { ME_QUERY, PORTAL_PATIENT_RECORDS_QUERY } from '@/lib/graphql/queries';

export default function PortalDashboardPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const { data, loading } = useQuery(PORTAL_PATIENT_RECORDS_QUERY);

  const records = data?.portalPatientRecords;
  const patient = records?.patient;

  const cards = [
    {
      title: 'Upcoming Appointments',
      value: records?.appointments?.filter((a: { status: string }) => a.status === 'scheduled')
        .length ?? 0,
      icon: <Calendar className="h-5 w-5" />,
      href: '/portal/appointments',
    },
    {
      title: 'Active Prescriptions',
      value: records?.prescriptions?.length ?? 0,
      icon: <Pill className="h-5 w-5" />,
      href: '/portal/prescriptions',
    },
    {
      title: 'Lab Results',
      value: records?.labResults?.length ?? 0,
      icon: <FlaskConical className="h-5 w-5" />,
      href: '/portal/lab-results',
    },
    {
      title: 'Medical Records',
      value: patient ? 1 : 0,
      icon: <FileText className="h-5 w-5" />,
      href: '/portal/records',
    },
  ];

  return (
    <div>
      <DashboardHeader
        title="Patient Portal"
        subtitle={
          patient
            ? `Welcome back, ${patient.fullName}`
            : `Signed in as ${meData?.me?.fullName ?? 'Patient'}`
        }
      />

      {loading ? (
        <p className="text-clay-text-muted">Loading your health records...</p>
      ) : !patient ? (
        <ClayCard>
          <p className="text-clay-text-muted">
            Your account is not yet linked to a patient record. Please contact your hospital to
            connect your portal access using your registered email or patient ID.
          </p>
        </ClayCard>
      ) : (
        <>
          <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <Link key={card.href} href={card.href}>
                <ClayStatCard title={card.title} value={card.value} icon={card.icon} />
              </Link>
            ))}
          </div>

          <ClayCard>
            <h2 className="mb-4 text-lg font-semibold text-clay-text">Quick Links</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'View Appointments', href: '/portal/appointments' },
                { label: 'Medical Records', href: '/portal/records' },
                { label: 'Prescriptions', href: '/portal/prescriptions' },
                { label: 'Lab Results', href: '/portal/lab-results' },
                { label: 'My Profile', href: '/portal/profile' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl bg-clay-primary-light px-4 py-3 text-sm font-medium text-clay-primary shadow-clay-inset transition hover:bg-clay-primary/10"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </ClayCard>
        </>
      )}
    </div>
  );
}
