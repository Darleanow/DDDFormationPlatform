import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Program } from './program.entity';
import { Module } from './module.entity';

/**
 * Course — Unité pédagogique de premier niveau, regroupant des modules
 * autour d'un thème disciplinaire.
 */
@Entity('course')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Position du course au sein du program. */
  @Column({ type: 'int' })
  ordre: number;

  @Exclude()
  @ManyToOne(() => Program, (program) => program.course, {
    onDelete: 'CASCADE',
  })
  program: Program;

  @Column()
  programmeId: string;

  @OneToMany(() => Module, (module) => module.course, { cascade: true })
  modules: Module[];
}
