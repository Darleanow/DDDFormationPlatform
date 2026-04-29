import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Course } from './course.entity';

/**
 * Programme — Aggregate root du catalogue.
 * Ensemble cohérent de formations associé à un objectif d'apprentissage principal
 * (certification, compétence cible).
 */
@Entity('program')
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  objectifPrincipal: string;

  /** Isolation multi-tenant : chaque program appartient à un tenant. */
  @Column()
  tenantId: string;

  @OneToMany(() => Course, (course) => course.program, { cascade: true })
  course: Course[];
}
