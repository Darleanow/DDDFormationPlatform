import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Cours } from './cours.entity';

/**
 * Programme — Aggregate root du catalogue.
 * Ensemble cohérent de formations associé à un objectif d'apprentissage principal
 * (certification, compétence cible).
 */
@Entity('programme')
export class Programme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  objectifPrincipal: string;

  /** Isolation multi-tenant : chaque programme appartient à un tenant. */
  @Column()
  tenantId: string;

  @OneToMany(() => Cours, (cours) => cours.programme, { cascade: true })
  cours: Cours[];
}
