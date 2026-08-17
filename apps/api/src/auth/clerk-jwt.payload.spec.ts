import { extractEmail, isEmailVerified } from './clerk-jwt.payload';

describe('Clerk JWT payload helpers', () => {
  describe('extractEmail', () => {
    it('prefers top-level email', () => {
      expect(
        extractEmail({
          sub: 'user_1',
          email: 'primary@hospital.com',
          email_address: 'other@hospital.com',
        }),
      ).toBe('primary@hospital.com');
    });
  });

  describe('isEmailVerified', () => {
    it('returns true when email_verified is boolean true', () => {
      expect(
        isEmailVerified({
          sub: 'user_1',
          email: 'staff@hospital.com',
          email_verified: true,
        }),
      ).toBe(true);
    });

    it('returns false when email_verified is boolean false', () => {
      expect(
        isEmailVerified({
          sub: 'user_1',
          email: 'staff@hospital.com',
          email_verified: false,
        }),
      ).toBe(false);
    });

    it('returns false when email_verified claim is missing', () => {
      expect(
        isEmailVerified({
          sub: 'user_1',
          email: 'staff@hospital.com',
        }),
      ).toBe(false);
    });

    it('returns true when nested email_addresses verification is verified', () => {
      expect(
        isEmailVerified({
          sub: 'user_1',
          email_addresses: [
            {
              email_address: 'staff@hospital.com',
              verification: { status: 'verified' },
            },
          ],
        }),
      ).toBe(true);
    });

    it('does not treat a different nested address as verified for the bind email', () => {
      expect(
        isEmailVerified({
          sub: 'user_1',
          email: 'attacker@hospital.com',
          email_addresses: [
            {
              email_address: 'attacker@hospital.com',
              verification: { status: 'unverified' },
            },
            {
              email_address: 'victim@hospital.com',
              verification: { status: 'verified' },
            },
          ],
        }),
      ).toBe(false);
    });
  });
});
