import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CatalogQueryService } from '../../../catalog/application/catalog-query.service';
import { Assessment } from '../../domain/aggregates/assessment/assessment';
import { AssessmentItem } from '../../domain/aggregates/assessment/assessment-item';
import { ASSESSMENT_ITEM_REPOSITORY } from '../../domain/repositories/assessment-item-repository';
import type { AssessmentItemRepository } from '../../domain/repositories/assessment-item-repository';
import { ASSESSMENT_REPOSITORY } from '../../domain/repositories/assessment-repository';
import type { AssessmentRepository } from '../../domain/repositories/assessment-repository';
import { InMemoryAssessmentItemRepository } from '../persistence/in-memory/in-memory-assessment-item.repository';
import { assessmentAggregateIdForCompetency } from '../../../../shared/bc-integration/assessment-ids';

/**
 * Ensures every catalogue competency has a corresponding BC4 {@link Assessment}
 * with a stable ID consumable by BC3 path activities (`contentId` bridge).
 */
@Injectable()
export class CompetencyAssessmentsBootstrap implements OnModuleInit {
  constructor(
    private readonly catalogQuery: CatalogQueryService,
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessments: AssessmentRepository,
    @Inject(ASSESSMENT_ITEM_REPOSITORY)
    private readonly itemRepo: AssessmentItemRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const competences = await this.catalogQuery.findAllCompetences();
    for (const c of competences) {
      const item = new AssessmentItem(
        `item-default-${c.id}`,
        c.id,
        0.55,
        1,
      );
      if (this.itemRepo instanceof InMemoryAssessmentItemRepository) {
        this.itemRepo.seed(c.id, [item]);
      }

      const aggregateId = assessmentAggregateIdForCompetency(c.id);
      const exists = await this.assessments.findById(aggregateId);
      if (!exists) {
        await this.assessments.save(new Assessment(aggregateId, [item]));
      }
    }
  }
}
