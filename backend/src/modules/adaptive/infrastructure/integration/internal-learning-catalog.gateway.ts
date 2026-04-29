import { Injectable } from '@nestjs/common';
import {
  LearningCatalogGateway,
  RemediationContent,
} from '../../application/ports/learning-catalog.gateway';
import { CatalogQueryService } from '../../../catalog/application/catalog-query.service';

@Injectable()
export class InternalLearningCatalogGateway implements LearningCatalogGateway {
  constructor(private readonly catalogQueryService: CatalogQueryService) {}

  async findRemediationContent(
    competencyId: string,
  ): Promise<RemediationContent | null> {
    const modules = await this.catalogQueryService.findModulesByCompetence(
      competencyId,
    );

    if (modules && modules.length > 0) {
      // Pour le PoC, on prend le premier module qui match la compétence
      return {
        contentId: modules[0].id,
        // Default to 1 hour if unspecified
        estimatedHours: 1,
      };
    }

    return null;
  }
}
