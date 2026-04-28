import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Programme } from './programme.entity.js';
import { Module } from './module.entity.js';

/**
 * Cours — Unité pédagogique de premier niveau, regroupant des modules
 * autour d'un thème disciplinaire.
 */
@Entity('cours')
export class Cours {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Position du cours au sein du programme. */
  @Column({ type: 'int' })
  ordre: number;

  @Exclude()
  @ManyToOne(() => Programme, (programme) => programme.cours, {
    onDelete: 'CASCADE',
  })
  programme: Programme;

  @Column()
  programmeId: string;

  @OneToMany(() => Module, (module) => module.cours, { cascade: true })
  modules: Module[];
}
