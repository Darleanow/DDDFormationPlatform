import { randomUUID } from 'crypto';
import { Activity } from '../../domain/entities/activity.entity';
import { assessmentAggregateIdForCompetency } from '../../../../shared/bc-integration/assessment-ids';

/**
 * Parcours court pour `learner-alice` après construction catalogue complète :
 * 3 ASSESSMENT d’affilée (c001→c002→c003), puis leçons / exercices à sauter après la 3ᵉ éval &gt;90 %.
 * Les ids de compétence sont ceux du CSV `competences.csv`.
 */
export function buildAliceDemoCompactActivities(): Activity[] {
  const agg = assessmentAggregateIdForCompetency;
  return [
    new Activity(randomUUID(), agg('c001'), 'ASSESSMENT', ['c001'], 0.5, 0),
    new Activity(randomUUID(), agg('c002'), 'ASSESSMENT', ['c002'], 0.5, 1),
    new Activity(randomUUID(), agg('c003'), 'ASSESSMENT', ['c003'], 0.5, 2),
    new Activity(randomUUID(), 'l001', 'LESSON', ['c001'], 1, 3),
    new Activity(randomUUID(), 'e001', 'EXERCISE', ['c001'], 0.45, 4),
    new Activity(randomUUID(), 'l004', 'LESSON', ['c002'], 1, 5),
    new Activity(randomUUID(), 'e002', 'EXERCISE', ['c002'], 0.45, 6),
  ];
}
