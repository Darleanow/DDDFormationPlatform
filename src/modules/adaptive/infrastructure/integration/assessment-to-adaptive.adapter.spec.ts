import { AssessmentToAdaptiveAdapter } from './assessment-to-adaptive.adapter';
import { AssessmentResultHandler } from '../../application/handlers/assessment-result.handler';
import { AssessmentResultPayload } from '../../infrastructure/acl/assessment-acl';

describe('AssessmentToAdaptiveAdapter', () => {
  it('translates bc4 payload and calls handler', async () => {
    const mockHandler: Partial<AssessmentResultHandler> = { handle: jest.fn().mockResolvedValue(undefined) };
    const adapter = new AssessmentToAdaptiveAdapter(mockHandler as any);

    const payload = { learnerId: 'learner-1', competenceId: 'c1', estimatedLevel: 0.7 };

    await adapter.handleAssessmentEvent(payload as any);

    expect((mockHandler.handle as jest.Mock).mock.calls.length).toBe(1);
    const called = (mockHandler.handle as jest.Mock).mock.calls[0][0] as AssessmentResultPayload;
    expect(called.learnerId).toBe('learner-1');
    expect(called.competenceId).toBe('c1');
    expect(called.estimatedLevel).toBe(0.7);
  });
});
