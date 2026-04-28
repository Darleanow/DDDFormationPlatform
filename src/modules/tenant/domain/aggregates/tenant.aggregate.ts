export interface TenantBusinessRules {
  maxAttempts?: number;
  scoreSeuil?: number;
  terminologie?: Record<string, string>;
  [key: string]: unknown;
}

export class Tenant {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    private _rules: TenantBusinessRules,
    private _active: boolean,
  ) {}

  static create(id: string, name: string, rules: TenantBusinessRules = {}): Tenant {
    if (!id || !name) throw new Error('Tenant id and name are required');
    return new Tenant(id, name, rules, true);
  }

  static reconstitute(id: string, name: string, rules: TenantBusinessRules, active: boolean): Tenant {
    return new Tenant(id, name, rules, active);
  }

  get rules(): TenantBusinessRules {
    return { ...this._rules };
  }

  get isActive(): boolean {
    return this._active;
  }

  overrideRule(key: string, value: unknown): void {
    this._rules = { ...this._rules, [key]: value };
  }

  resolveTerminology(term: string): string {
    return this._rules.terminologie?.[term] ?? term;
  }

  deactivate(): void {
    this._active = false;
  }
}