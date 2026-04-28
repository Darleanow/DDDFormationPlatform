import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Compétence — Capacité observable qu'un contenu vise à développer
 * ou à valider chez l'apprenant.
 *
 * Shared Kernel: l'identifiant (CompetenceId) est partagé avec BC4 (Assessment).
 * Le champ `estCritique` est un concept BC5 (Certification) et n'a pas sa place ici.
 */
@Entity('competence')
export class Competence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
