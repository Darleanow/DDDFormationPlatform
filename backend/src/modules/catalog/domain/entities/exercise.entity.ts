import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Module } from './module.entity';
import { Lesson } from './lesson.entity';
import { Competence } from './competence.entity';

/**
 * Exercise — Activité pratique permettant de mobiliser
 * les compétences d'une leçon ou d'un module.
 */
@Entity('exercise')
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  titre: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  enonce: string | null;

  /** Position de l'exercise au sein de la leçon. */
  @Column({ type: 'int' })
  ordre: number;

  @Column({ type: 'float', default: 0.5 })
  difficulty: number;

  @Column({ type: 'int', default: 1 })
  weight: number;

  @Exclude()
  @ManyToOne(() => Lesson, (lesson) => lesson.exercises, {
    onDelete: 'CASCADE',
  })
  lesson: Lesson;

  @Column()
  lessonId: string;

  /** Compétences mobilisées par cet exercise. */
  @ManyToMany(() => Competence, { eager: true })
  @JoinTable({ name: 'exercice_competence' })
  competences: Competence[];
}
