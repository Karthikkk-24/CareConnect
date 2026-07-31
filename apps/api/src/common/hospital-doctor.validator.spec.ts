import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StaffProfile } from '../database/entities';
import { HospitalDoctorValidator } from './hospital-doctor.validator';

describe('HospitalDoctorValidator', () => {
  let validator: HospitalDoctorValidator;
  const staffRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HospitalDoctorValidator,
        { provide: getRepositoryToken(StaffProfile), useValue: staffRepo },
      ],
    }).compile();
    validator = module.get(HospitalDoctorValidator);
  });

  it('allows missing doctor id', async () => {
    await expect(
      validator.assertHospitalDoctor('hospital-a', undefined),
    ).resolves.toBeUndefined();
    expect(staffRepo.findOne).not.toHaveBeenCalled();
  });

  it('rejects when not hospital staff', async () => {
    staffRepo.findOne.mockResolvedValue(null);
    await expect(
      validator.assertHospitalDoctor('hospital-a', 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects non-doctor staff', async () => {
    staffRepo.findOne.mockResolvedValue({
      userId: 'user-1',
      hospitalId: 'hospital-a',
      isActive: true,
      user: {
        userRoles: [{ hospitalId: 'hospital-a', role: { slug: 'nurse' } }],
      },
    });
    await expect(
      validator.assertHospitalDoctor('hospital-a', 'user-1'),
    ).rejects.toThrow(/must have the doctor role/);
  });

  it('allows active doctor staff', async () => {
    staffRepo.findOne.mockResolvedValue({
      userId: 'user-1',
      hospitalId: 'hospital-a',
      isActive: true,
      user: {
        userRoles: [{ hospitalId: 'hospital-a', role: { slug: 'doctor' } }],
      },
    });
    await expect(
      validator.assertHospitalDoctor('hospital-a', 'user-1'),
    ).resolves.toBeUndefined();
  });
});
