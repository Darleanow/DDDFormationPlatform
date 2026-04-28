import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { LearningPathOrmEntity } from './learning-path.orm-entity';

@Entity({ schema: 'adaptive', name: 'activity' })
export class ActivityOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToOne(
    () => LearningPathOrmEntity,
    (learningPath) => learningPath.activities,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'learning_path_id' })
  learningPath: LearningPathOrmEntity;

  @Column('uuid', { name: 'content_id' })
  contentId: string;

  @Column('text')
  type: string;

  @Column('simple-json', { name: 'competence_ids' })
  competenceIds: string[];

  @Column('int', { name: 'estimated_hours' })
  estimatedHours: number;

  @Column('int')
  order: number;

  @Column('text')
  status: string;
}
