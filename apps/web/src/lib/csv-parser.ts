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

/**
 * RFC 4180-ish CSV record parser: quoted fields may contain commas, quotes
 * (`""` escapes), and newlines. Unquoted newlines still start a new record.
 */
export function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(current.trim());
    current = '';
  };

  const pushRow = () => {
    if (row.length === 1 && row[0] === '') {
      row = [];
      return;
    }
    records.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

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
      pushField();
    } else if (char === '\n') {
      pushField();
      pushRow();
    } else if (char === '\r') {
      if (next === '\n') continue;
      pushField();
      pushRow();
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return records;
}

export function parsePatientCsv(text: string): BulkPatientRow[] {
  const records = parseCsvRecords(text.trim());
  if (records.length < 2) return [];

  const headerRow = records[0];
  if (!headerRow) return [];

  const headers = headerRow.map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const rows: BulkPatientRow[] = [];

  for (let i = 1; i < records.length; i++) {
    const values = records[i] ?? [];
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
