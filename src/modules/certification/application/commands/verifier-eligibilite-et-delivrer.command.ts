export class VerifierEligibiliteEtDelivrerCommand {
  constructor(
    public readonly learnerId: string,
    public readonly certificationId: string,
    // TODO: Include necessary context info like tenantId or scores if not fetched within the handler
  ) {}
}
