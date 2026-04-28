import { Column, Entity, PrimaryColumn } from 'typeorm';

type TenantRules = Record<string, unknown>;

@Entity('tenants')
export class TenantEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'simple-json', default: '{}' })
  rules: TenantRules;

  @Column({ default: true })
  active: boolean;
}