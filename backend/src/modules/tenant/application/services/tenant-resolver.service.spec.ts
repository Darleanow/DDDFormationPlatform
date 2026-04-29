import { NotFoundException } from '@nestjs/common';
import { TenantResolverService } from '../../application/services/tenant-resolver.service';
import { Tenant } from '../../domain/aggregates/tenant.aggregate';
import { ITenantRepository } from '../../domain/repositories/tenant.repository.interface';

describe('TenantResolverService', () => {
  let service: TenantResolverService;
  let repo: jest.Mocked<ITenantRepository>;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findByName: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
    };
    service = new TenantResolverService(repo);
  });

  describe('resolve', () => {
    it('returns tenant when found and active', async () => {
      const tenant = Tenant.create('univ-lyon', 'Université Lyon');
      repo.findById.mockResolvedValue(tenant);

      const result = await service.resolve('univ-lyon');
      expect(result).toBe(tenant);
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.resolve('unknown')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when tenant is inactive', async () => {
      const tenant = Tenant.create('inactive-tenant', 'Old Corp');
      tenant.deactivate();
      repo.findById.mockResolvedValue(tenant);

      await expect(service.resolve('inactive-tenant')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertExists', () => {
    it('resolves silently when tenant exists', async () => {
      repo.exists.mockResolvedValue(true);
      await expect(service.assertExists('univ-lyon')).resolves.not.toThrow();
    });

    it('throws when tenant does not exist', async () => {
      repo.exists.mockResolvedValue(false);
      await expect(service.assertExists('ghost')).rejects.toThrow(NotFoundException);
    });
  });
});