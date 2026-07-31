import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffProfile } from '../database/entities';

/**
 * Shared validation: doctor/attending user must be active hospital staff
 * with the doctor role for that hospital.
 */
@Injectable()
export class HospitalDoctorValidator {
  constructor(
    @InjectRepository(StaffProfile)
    private readonly staffRepo: Repository<StaffProfile>,
  ) {}

  async assertHospitalDoctor(
    hospitalId: string,
    doctorUserId: string | undefined,
    fieldLabel = 'Doctor',
  ): Promise<void> {
    if (!doctorUserId) return;

    const staff = await this.staffRepo.findOne({
      where: { userId: doctorUserId, hospitalId, isActive: true },
      relations: ['user', 'user.userRoles', 'user.userRoles.role'],
    });
    if (!staff) {
      throw new BadRequestException(
        `${fieldLabel} is not active staff at this hospital`,
      );
    }

    const isDoctor = (staff.user?.userRoles ?? []).some(
      (ur) =>
        ur.role?.slug === 'doctor' &&
        (!ur.hospitalId || ur.hospitalId === hospitalId),
    );
    if (!isDoctor) {
      throw new BadRequestException(
        `${fieldLabel} must have the doctor role at this hospital`,
      );
    }
  }

  async assertHospitalDoctorOrThrow(
    hospitalId: string,
    doctorUserId: string,
    fieldLabel = 'Doctor',
  ): Promise<void> {
    if (!doctorUserId) {
      throw new NotFoundException(`${fieldLabel} id is required`);
    }
    await this.assertHospitalDoctor(hospitalId, doctorUserId, fieldLabel);
  }
}
