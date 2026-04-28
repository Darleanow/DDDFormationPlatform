import { Injectable } from '@nestjs/common';

/**
 * BC2 — Content versioning contract (spec: ContentVersioningService).
 * PoC: catalogue is loaded from CSV; version is a logical tag until DB-backed history exists.
 */
@Injectable()
export class ContentVersioningService {
  getCurrentContentVersion(tenantId: string): string {
    return `csv-snapshot:${tenantId}`;
  }
}
