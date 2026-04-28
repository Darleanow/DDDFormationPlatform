import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Module } from './module.entity.js';
import { Lecon } from './lecon.entity.js';
import { Competence } from './competence.entity.js';

/**
 * Exercice — Activité pratique permettant de mobiliser
 * les compétences d'une leçon ou d'un module.
 */
@Entity('exercice')
export class Exercice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  titre: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  enonce: string | null;

  /** Position de l'exercice au sein de la leçon. */
  @Column({ type: 'int' })
  ordre: number;

  @Exclude()
  @ManyToOne(() => Lecon, (lecon) => lecon.exercices, {
    onDelete: 'CASCADE',
  })
  lecon: Lecon;

  @Column()
  leconId: string;

  /** Compétences mobilisées par cet exercice. */
  @ManyToMany(() => Competence, { eager: true })
  @JoinTable({ name: 'exercice_competence' })
  competences: Competence[];
}
