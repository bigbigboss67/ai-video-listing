import type { Property, SessionUser } from '@/types/domain';

/**
 * Broker details that must be present before a listing can be published.
 * UAE advertising rules tie every listing to the advertising broker's office
 * (ORN), the individual broker card (BRN) and a contact channel, so we never
 * substitute the platform's own details when an agent's are missing.
 */
export type BrokerField = 'orgName' | 'orn' | 'brn' | 'whatsappNumber';

export const BROKER_FIELD_LABELS: Record<BrokerField, string> = {
  orgName: 'Brokerage name',
  orn: 'Office registration number (ORN)',
  brn: 'Broker registration number (BRN)',
  whatsappNumber: 'WhatsApp number',
};

function hasText(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isUsablePhone(value: string | undefined | null): boolean {
  if (!hasText(value)) return false;
  const digits = (value as string).replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

export function getMissingBrokerFields(
  user: Pick<SessionUser, 'orgName' | 'orn' | 'brn' | 'whatsappNumber'>
): BrokerField[] {
  const missing: BrokerField[] = [];
  if (!hasText(user.orgName)) missing.push('orgName');
  if (!hasText(user.orn)) missing.push('orn');
  if (!hasText(user.brn)) missing.push('brn');
  if (!isUsablePhone(user.whatsappNumber)) missing.push('whatsappNumber');
  return missing;
}

export function propertyHasBrokerDetails(
  property: Pick<Property, 'agentOrg' | 'agentOrn' | 'agentBrn' | 'agentWhatsapp'>
): boolean {
  return (
    getMissingBrokerFields({
      orgName: property.agentOrg,
      orn: property.agentOrn,
      brn: property.agentBrn,
      whatsappNumber: property.agentWhatsapp,
    }).length === 0
  );
}

export class BrokerDetailsMissingError extends Error {
  readonly missing: BrokerField[];

  constructor(missing: BrokerField[], context: 'create' | 'publish' = 'create') {
    const list = missing.map((f) => BROKER_FIELD_LABELS[f]).join(', ');
    super(
      context === 'create'
        ? `Add your broker details before publishing a listing. Missing: ${list}.`
        : `This listing cannot go live until the agent's broker details are complete. Missing: ${list}.`
    );
    this.name = 'BrokerDetailsMissingError';
    this.missing = missing;
  }
}
