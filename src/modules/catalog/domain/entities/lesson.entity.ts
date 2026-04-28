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
import { Exercise } from './exercise.entity';
import { TypeLesson } from '../enums/type-lesson.enum';

/**
 * Leçon — Unité de contenu atomique au sein d'un module :
 * texte, vidéo, simulation ou support interactif.
 */
@Entity('lesson')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  titre: string;

  @Column({ type: 'text', nullable: true })
  contenu: string | null;

  @Column({ type: 'varchar' })
  type: TypeLesson;

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

  @OneToMany(() => Exercise, (exercise) => exercise.lesson, { cascade: true })
  exercises: Exercise[];
}
