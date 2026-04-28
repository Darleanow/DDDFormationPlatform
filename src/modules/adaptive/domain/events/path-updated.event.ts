export class PathUpdatedEvent {
  constructor(
    public readonly pathId: string,
    public readonly learnerId: string,
  ) {}
}
