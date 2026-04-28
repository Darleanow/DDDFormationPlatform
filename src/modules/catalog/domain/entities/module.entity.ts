import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Cours } from './cours.entity';
import { Competence } from './competence.entity';
import { Lecon } from './lecon.entity';
import { Exercice } from './exercice.entity';

/**
 * Module — Subdivision d'un cours couvrant une notion ou une compétence précise.
 * Peut être ordonnancé par le moteur adaptatif.
 *
 * Les prérequis forment un graphe orienté acyclique (DAG) :
 * un module peut dépendre de N autres modules, et être prérequis de M autres.
 */
@Entity('module')
export class Module {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Position du module au sein du cours. */
  @Column({ type: 'int' })
  ordre: number;

  @Exclude()
  @ManyToOne(() => Cours, (cours) => cours.modules, { onDelete: 'CASCADE' })
  cours: Cours;

  @Column()
  coursId: string;

  /** Compétences visées par ce module. */
  @ManyToMany(() => Competence, { eager: true })
  @JoinTable({ name: 'module_competence' })
  competences: Competence[];

  /**
   * Prérequis — relation ManyToMany self-referencing.
   * `prerequis` = les modules qui doivent être maîtrisés AVANT celui-ci.
   * Le graphe résultant doit rester acyclique (invariant vérifié par le domain service).
   */
  @ManyToMany(() => Module)
  @JoinTable({
    name: 'module_prerequis',
    joinColumn: { name: 'moduleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'prerequisId', referencedColumnName: 'id' },
  })
  prerequis: Module[];

  @OneToMany(() => Lecon, (lecon) => lecon.module, { cascade: true })
  lecons: Lecon[];
}
