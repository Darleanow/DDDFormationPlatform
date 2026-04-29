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
import { Course } from './course.entity';
import { Competence } from './competence.entity';
import { Lesson } from './lesson.entity';
import { Exercise } from './exercise.entity';

/**
 * Module — Subdivision d'un course couvrant une notion ou une compétence précise.
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

  /** Position du module au sein du course. */
  @Column({ type: 'int' })
  ordre: number;

  @Exclude()
  @ManyToOne(() => Course, (course) => course.modules, { onDelete: 'CASCADE' })
  course: Course;

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

  @OneToMany(() => Lesson, (lesson) => lesson.module, { cascade: true })
  lessons: Lesson[];
}
