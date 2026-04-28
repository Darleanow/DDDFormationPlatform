export class RemediationTriggeredEvent {
  constructor(
    public readonly pathId: string,
    public readonly learnerId: string,
    public readonly competencyIds: string[],
  ) {}
}
