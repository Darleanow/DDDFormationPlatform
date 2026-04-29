import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
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

  @Column('simple-json', { name: 'mandatory_competence_ids' })
  mandatoryCompetencyIds: string[];

  /** Série BC3 : résultats d’évaluation consécutifs &gt; 90 % (pour accélération après 3). */
  @Column('int', { name: 'assessment_success_streak_above90', default: 0 })
  assessmentSuccessStreakAbove90: number;

  @Column('simple-json', { name: 'estimated_levels', nullable: true })
  estimatedLevels?: Array<{ competencyId: string; score: number }>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ActivityOrmEntity, (activity) => activity.learningPath, {
    cascade: true,
    eager: true,
  })
  activities: ActivityOrmEntity[];
}
