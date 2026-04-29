import { IdentityToAdaptiveAdapter } from './identity-to-adaptive.adapter';
import { EnrollmentConfirmedHandler } from '../../application/handlers/enrollment-confirmed.handler';
import { assessmentAggregateIdForCompetency } from '../../../../shared/bc-integration/assessment-ids';

describe('IdentityToAdaptiveAdapter', () => {
  it('translates identity event and calls EnrollmentConfirmedHandler', async () => {
    const mockCatalog = {
      findProgrammeById: jest.fn().mockResolvedValue({ id: 'prog1', objectifPrincipal: 'cert-1' }),
      findCoursByProgramme: jest.fn().mockResolvedValue([]),
    } as any;

    const mockHandler: Partial<EnrollmentConfirmedHandler> = {
      handle: jest.fn().mockResolvedValue(undefined),
    };

    const adapter = new IdentityToAdaptiveAdapter(mockCatalog as any, mockHandler as any);

    const payload = {
      learnerId: 'learner-1',
      tenantId: 'tenant-1',
      programId: 'prog1',
      weeklyAvailabilityHours: 5,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    await adapter.handleIdentityEvent(payload as any);

    expect(mockCatalog.findProgrammeById).toHaveBeenCalledWith('prog1');
    expect((mockHandler.handle as jest.Mock).mock.calls.length).toBe(1);
    const calledWith = (mockHandler.handle as jest.Mock).mock.calls[0][0];
    expect(calledWith.learnerId).toBe('learner-1');
    expect(calledWith.programId).toBe('prog1');
    expect(calledWith.targetCertificationId).toBe('cert-1');
    expect(calledWith.constraints.weeklyHours).toBe(5);
  });

  it('appends one BC4-aligned ASSESSMENT activity per catalogue competence after lessons', async () => {
    const competencyId = 'comp-a';
    const mockCatalog = {
      findProgrammeById: jest.fn().mockResolvedValue({
        id: 'prog1',
        objectifPrincipal: 'cert-x',
      }),
      findCoursByProgramme: jest.fn().mockResolvedValue([{ id: 'cr1' }]),
      findModulesByCours: jest.fn().mockResolvedValue([
        {
          id: 'm1',
          competences: [{ id: competencyId }],
        },
      ]),
      findLeconsByModule: jest.fn().mockResolvedValue([
        { id: 'l1', competences: [{ id: competencyId }] },
      ]),
    };

    const mockHandler: Partial<EnrollmentConfirmedHandler> = {
      handle: jest.fn().mockResolvedValue(undefined),
    };

    const adapter = new IdentityToAdaptiveAdapter(mockCatalog as any, mockHandler as any);
    await adapter.handleIdentityEvent({
      learnerId: 'learner-x',
      tenantId: 't1',
      programId: 'prog1',
      weeklyAvailabilityHours: 5,
      deadline: new Date(),
    } as any);

    const invoked = (mockHandler.handle as jest.Mock).mock.calls[0][0];
    expect(invoked.catalogActivities.some((a: { type: string }) => a.type === 'LESSON')).toBe(true);
    const evalActs = invoked.catalogActivities.filter(
      (a: { type: string }) => a.type === 'ASSESSMENT',
    );
    expect(evalActs).toHaveLength(1);
    expect(evalActs[0].contentId).toBe(assessmentAggregateIdForCompetency(competencyId));
    expect(evalActs[0].competencyIds).toEqual([competencyId]);
  });
});
