import { IdentityToAdaptiveAdapter } from './identity-to-adaptive.adapter';
import { EnrollmentConfirmedHandler } from '../../application/handlers/enrollment-confirmed.handler';
import { assessmentAggregateIdForCompetency } from '../../../../shared/bc-integration/assessment-ids';

describe('IdentityToAdaptiveAdapter', () => {
  it('translates identity event and calls EnrollmentConfirmedHandler', async () => {
    const mockCatalog = {
      findProgrammeById: jest.fn().mockResolvedValue({ id: 'prog1', objectifPrincipal: 'cert-1' }),
      findCoursByProgramme: jest.fn().mockResolvedValue([]),
    } as any;

    const mockPrereq = {
      getModulesInTopologicalOrderForProgram: jest.fn().mockResolvedValue([]),
    };

    const mockHandler: Partial<EnrollmentConfirmedHandler> = {
      handle: jest.fn().mockResolvedValue(undefined),
    };

    const adapter = new IdentityToAdaptiveAdapter(
      mockCatalog as any,
      mockPrereq as any,
      mockHandler as any,
    );

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
    const mod = {
      id: 'm1',
      competences: [{ id: competencyId }],
      prerequis: [],
      coursId: 'cr1',
      ordre: 1,
    };
    const mockCatalog = {
      findProgrammeById: jest.fn().mockResolvedValue({
        id: 'prog1',
        objectifPrincipal: 'cert-x',
      }),
      findCoursByProgramme: jest.fn().mockResolvedValue([{ id: 'cr1' }]),
      findModulesByCours: jest.fn().mockResolvedValue([mod]),
      findLessonsByModule: jest.fn().mockResolvedValue([
        { id: 'l1', competences: [{ id: competencyId }], ordre: 1 },
      ]),
      findExercisesByLesson: jest.fn().mockResolvedValue([]),
    };

    const mockPrereq = {
      getModulesInTopologicalOrderForProgram: jest.fn().mockResolvedValue([mod]),
    };

    const mockHandler: Partial<EnrollmentConfirmedHandler> = {
      handle: jest.fn().mockResolvedValue(undefined),
    };

    const adapter = new IdentityToAdaptiveAdapter(
      mockCatalog as any,
      mockPrereq as any,
      mockHandler as any,
    );
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

  it('does not duplicate ASSESSMENT rows when two modules share the same competence', async () => {
    const competencyId = 'comp-shared';
    const modA = {
      id: 'm-a',
      competences: [{ id: competencyId }],
      prerequis: [],
      coursId: 'cr1',
      ordre: 1,
    };
    const modB = {
      id: 'm-b',
      competences: [{ id: competencyId }],
      prerequis: [],
      coursId: 'cr1',
      ordre: 2,
    };
    const mockCatalog = {
      findProgrammeById: jest.fn().mockResolvedValue({
        id: 'prog1',
        objectifPrincipal: 'cert-x',
      }),
      findCoursByProgramme: jest.fn().mockResolvedValue([{ id: 'cr1' }]),
      findModulesByCours: jest.fn().mockResolvedValue([modA, modB]),
      findLessonsByModule: jest.fn().mockImplementation((mid: string) => {
        if (mid === 'm-a') {
          return [{ id: 'l-a1', competences: [{ id: competencyId }], ordre: 1 }];
        }
        return [{ id: 'l-b1', competences: [{ id: competencyId }], ordre: 1 }];
      }),
      findExercisesByLesson: jest.fn().mockResolvedValue([]),
    };

    const mockPrereq = {
      getModulesInTopologicalOrderForProgram: jest.fn().mockResolvedValue([modA, modB]),
    };

    const mockHandler: Partial<EnrollmentConfirmedHandler> = {
      handle: jest.fn().mockResolvedValue(undefined),
    };

    const adapter = new IdentityToAdaptiveAdapter(
      mockCatalog as any,
      mockPrereq as any,
      mockHandler as any,
    );
    await adapter.handleIdentityEvent({
      learnerId: 'learner-x',
      tenantId: 't1',
      programId: 'prog1',
      weeklyAvailabilityHours: 5,
      deadline: new Date(),
    } as any);

    const invoked = (mockHandler.handle as jest.Mock).mock.calls[0][0];
    const evalActs = invoked.catalogActivities.filter(
      (a: { type: string }) => a.type === 'ASSESSMENT',
    );
    expect(evalActs.length).toBe(1);
  });
});
