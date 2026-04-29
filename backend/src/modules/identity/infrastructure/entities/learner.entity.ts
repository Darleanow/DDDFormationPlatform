import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('learners')
export class LearnerEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  tenantId: string;

  @Column()
  email: string;

  @Column()
  lastName: string;

  @Column()
  firstName: string;
}
