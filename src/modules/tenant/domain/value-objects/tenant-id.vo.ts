export class TenantId {
  private constructor(public readonly value: string) {}

  static of(value: string): TenantId {
    if (!value || value.trim().length === 0) {
      throw new Error('TenantId cannot be empty');
    }
    return new TenantId(value.trim());
  }

  equals(other: TenantId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}