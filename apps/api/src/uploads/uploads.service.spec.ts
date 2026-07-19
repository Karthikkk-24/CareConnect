import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Patient, PatientDocument } from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { UploadsService } from './uploads.service';

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: getRepositoryToken(PatientDocument),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Patient),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(UploadsService);
  });

  it('allows upload for staff with patients:write and hospital', () => {
    const user: AuthenticatedUser = {
      id: 'u1',
      authId: 'a1',
      email: 's@h.com',
      fullName: 'Staff',
      hospitalId: 'h1',
      roles: ['nurse'],
      permissions: ['patients:write'],
      onboardingCompleted: true,
    };
    expect(() => service.assertCanUpload(user)).not.toThrow();
  });

  it('rejects upload without patients:write', () => {
    const user: AuthenticatedUser = {
      id: 'u1',
      authId: 'a1',
      email: 's@h.com',
      fullName: 'Staff',
      hospitalId: 'h1',
      roles: ['accountant'],
      permissions: ['billing:read'],
      onboardingCompleted: true,
    };
    expect(() => service.assertCanUpload(user)).toThrow(ForbiddenException);
  });
});
