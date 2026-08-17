import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCsvRecords, parsePatientCsv } from './csv-parser.ts';

describe('parseCsvRecords', () => {
  it('parses a simple unquoted CSV', () => {
    const records = parseCsvRecords('a,b,c\n1,2,3\n');
    assert.deepEqual(records, [
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('keeps commas inside quoted fields', () => {
    const records = parseCsvRecords('name,city\n"Doe, Jane",Springfield');
    assert.deepEqual(records, [
      ['name', 'city'],
      ['Doe, Jane', 'Springfield'],
    ]);
  });

  it('unescapes doubled quotes inside quoted fields', () => {
    const records = parseCsvRecords('name\n"Jane ""JJ"" Doe"');
    assert.deepEqual(records, [['name'], ['Jane "JJ" Doe']]);
  });

  it('keeps newlines inside quoted fields as a single record', () => {
    const csv = 'full_name,address\n"Jane Doe","123 Main St\nApt 4"\nBob,Oak Ave';
    const records = parseCsvRecords(csv);
    assert.deepEqual(records, [
      ['full_name', 'address'],
      ['Jane Doe', '123 Main St\nApt 4'],
      ['Bob', 'Oak Ave'],
    ]);
  });

  it('supports CRLF record separators and CR inside quoted fields', () => {
    const csv = 'full_name,notes\r\n"Jane Doe","line1\r\nline2"\r\nBob,ok';
    const records = parseCsvRecords(csv);
    assert.deepEqual(records, [
      ['full_name', 'notes'],
      ['Jane Doe', 'line1\r\nline2'],
      ['Bob', 'ok'],
    ]);
  });
});

describe('parsePatientCsv', () => {
  it('maps a standard unquoted patient row', () => {
    const csv = [
      'full_name,email,phone,dob,gender',
      'John Doe,john@email.com,555-0100,1990-01-15,male',
    ].join('\n');

    const rows = parsePatientCsv(csv);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], {
      fullName: 'John Doe',
      email: 'john@email.com',
      phone: '555-0100',
      dateOfBirth: '1990-01-15',
      gender: 'male',
      bloodGroup: undefined,
      address: undefined,
      city: undefined,
      emergencyContactName: undefined,
      emergencyContactPhone: undefined,
      insuranceProvider: undefined,
      insurancePolicyNumber: undefined,
      allergies: undefined,
      identificationType: undefined,
      identificationNumber: undefined,
    });
  });

  it('maps a quoted multiline address onto a single patient row', () => {
    const csv = [
      'full_name,address,city',
      '"Jane Doe","123 Main St\nApt 4B",Springfield',
    ].join('\n');

    const rows = parsePatientCsv(csv);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.fullName, 'Jane Doe');
    assert.equal(rows[0]?.address, '123 Main St\nApt 4B');
    assert.equal(rows[0]?.city, 'Springfield');
  });
});
