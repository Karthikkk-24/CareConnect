import { redirect } from 'next/navigation';

/** Legacy /wards route — send users to occupancy they can actually access. */
export default function WardsPage() {
  redirect('/admissions/occupancy');
}
