import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('enrollments')
export class EnrollmentEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  learnerId: string;

  @Column()
  tenantId: string;

  @Column()
  programId: string;

  @Column('float')
  weeklyAvailabilityHours: number;

  @Column()
  deadline: Date;

  @Column()
  enrolledAt: Date;
}
