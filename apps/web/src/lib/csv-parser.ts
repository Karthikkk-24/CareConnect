import type { BulkPatientRow } from '@careconnect/types';

const EXPECTED_HEADERS = [
  'full_name',
  'email',
  'phone',
  'dob',
  'gender',
  'blood_group',
  'address',
  'city',
  'emergency_contact_name',
  'emergency_contact_phone',
  'insurance_provider',
  'insurance_policy_number',
  'allergies',
  'identification_type',
  'identification_number',
];

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

export function parsePatientCsv(text: string): BulkPatientRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const rows: BulkPatientRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });

    rows.push({
      fullName: row.full_name || row.fullname || '',
      email: row.email || undefined,
      phone: row.phone || undefined,
      dateOfBirth: row.dob || row.date_of_birth || undefined,
      gender: row.gender || undefined,
      bloodGroup: row.blood_group || undefined,
      address: row.address || undefined,
      city: row.city || undefined,
      emergencyContactName: row.emergency_contact_name || undefined,
      emergencyContactPhone: row.emergency_contact_phone || undefined,
      insuranceProvider: row.insurance_provider || undefined,
      insurancePolicyNumber: row.insurance_policy_number || undefined,
      allergies: row.allergies || undefined,
      identificationType: row.identification_type || undefined,
      identificationNumber: row.identification_number || undefined,
    });
  }

  return rows;
}

export function getCsvTemplate(): string {
  return `${EXPECTED_HEADERS.join(',')}\nJohn Doe,john@email.com,555-0100,1990-01-15,male,O+,123 Main St,Springfield,Jane Doe,555-0101,BlueCross,POL-12345,Penicillin,passport,AB123456`;
}
