import { Module } from '@nestjs/common';
import { CatalogController } from './api/catalog.controller';
import { CatalogQueryService } from './application/catalog-query.service';
import { PrerequisiteGraphService } from './application/prerequisite-graph.service';
import { CsvCatalogService } from './infrastructure/csv-catalog.service';

@Module({
  imports: [],
  controllers: [CatalogController],
  providers: [CatalogQueryService, PrerequisiteGraphService, CsvCatalogService],
  exports: [CatalogQueryService, PrerequisiteGraphService, CsvCatalogService],
})
export class CatalogModule { }