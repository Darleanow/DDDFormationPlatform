import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ActivityOrmEntity } from './activity.orm-entity';

@Entity({ schema: 'adaptive', name: 'learning_path' })
export class LearningPathOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid', { name: 'learner_id' })
  learnerId: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('int', { name: 'weekly_hours' })
  weeklyHours: number;

  @Column('timestamptz', { name: 'deadline_at', nullable: true })
  deadlineAt?: Date | null;

  @Column('jsonb', { name: 'mandatory_competence_ids' })
  mandatoryCompetenceIds: string[];

  @Column('jsonb', { name: 'estimated_levels', nullable: true })
  estimatedLevels?: Array<{ competenceId: string; score: number }>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ActivityOrmEntity, activity => activity.learningPath, {
    cascade: true,
    eager: true,
  })
  activities: ActivityOrmEntity[];
}
