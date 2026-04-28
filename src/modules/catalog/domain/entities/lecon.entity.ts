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
import { Module } from './module.entity';
import { Competence } from './competence.entity';
import { Exercice } from './exercice.entity';
import { TypeLecon } from '../enums/type-lecon.enum';

/**
 * Leçon — Unité de contenu atomique au sein d'un module :
 * texte, vidéo, simulation ou support interactif.
 */
@Entity('lecon')
export class Lecon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  titre: string;

  @Column({ type: 'text', nullable: true })
  contenu: string | null;

  @Column({ type: 'varchar' })
  type: TypeLecon;

  /** Position de la leçon au sein du module. */
  @Column({ type: 'int' })
  ordre: number;

  @Exclude()
  @ManyToOne(() => Module, (module) => module.lecons, { onDelete: 'CASCADE' })
  module: Module;

  @Column()
  moduleId: string;

  @ManyToMany(() => Competence, { eager: true })
  @JoinTable({ name: 'lecon_competence' })
  competences: Competence[];

  @OneToMany(() => Exercice, (exercice) => exercice.lecon, { cascade: true })
  exercices: Exercice[];
}
