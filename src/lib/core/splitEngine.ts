export interface SplitParticipant {
  id: string;
  weight?: number;
}

export interface SplitShare {
  id: string;
  amount: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface BalanceEntry {
  id: string;
  balance: number;
}

function normalizeCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

export function splitEqual(totalAmount: number, participants: SplitParticipant[]): SplitShare[] {
  const total = normalizeCents(totalAmount);
  if (participants.length === 0 || total <= 0) {
    return participants.map((participant) => ({ id: participant.id, amount: 0 }));
  }

  const base = Math.floor(total / participants.length);
  let remainder = total - base * participants.length;

  return participants.map((participant) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return { id: participant.id, amount: base + extra };
  });
}

export function splitWeighted(totalAmount: number, participants: SplitParticipant[]): SplitShare[] {
  const total = normalizeCents(totalAmount);
  if (participants.length === 0 || total <= 0) {
    return participants.map((participant) => ({ id: participant.id, amount: 0 }));
  }

  const weights = participants.map((participant) =>
    participant.weight && participant.weight > 0 ? participant.weight : 0,
  );
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);

  if (weightTotal <= 0) {
    return splitEqual(total, participants);
  }

  const provisional = participants.map((participant, index) => ({
    id: participant.id,
    amount: Math.floor((total * weights[index]) / weightTotal),
  }));

  let allocated = provisional.reduce((sum, item) => sum + item.amount, 0);
  let remainder = total - allocated;

  const sortedIndexes = participants
    .map((participant, index) => ({ index, weight: weights[index] }))
    .sort((left, right) => right.weight - left.weight);

  let pointer = 0;
  while (remainder > 0 && sortedIndexes.length > 0) {
    const nextIndex = sortedIndexes[pointer % sortedIndexes.length].index;
    provisional[nextIndex].amount += 1;
    remainder -= 1;
    pointer += 1;
  }

  return provisional;
}

export function validateSplitShares(totalAmount: number, shares: SplitShare[]): boolean {
  const total = normalizeCents(totalAmount);
  const sum = shares.reduce((accumulator, share) => accumulator + normalizeCents(share.amount), 0);
  return total === sum;
}

export function computeSettlements(balances: BalanceEntry[]): Settlement[] {
  const debtors = balances
    .filter((entry) => entry.balance < 0)
    .map((entry) => ({ ...entry, balance: Math.abs(normalizeCents(entry.balance)) }))
    .sort((left, right) => right.balance - left.balance);

  const creditors = balances
    .filter((entry) => entry.balance > 0)
    .map((entry) => ({ ...entry, balance: normalizeCents(entry.balance) }))
    .sort((left, right) => right.balance - left.balance);

  const settlements: Settlement[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const amount = Math.min(debtor.balance, creditor.balance);
    if (amount > 0) {
      settlements.push({ from: debtor.id, to: creditor.id, amount });
      debtor.balance -= amount;
      creditor.balance -= amount;
    }

    if (debtor.balance === 0) debtorIndex += 1;
    if (creditor.balance === 0) creditorIndex += 1;
  }

  return settlements;
}

export function applySettlement(balances: BalanceEntry[], settlement: Settlement): BalanceEntry[] {
  const amount = normalizeCents(settlement.amount);
  return balances.map((entry) => {
    if (entry.id === settlement.from) {
      return { ...entry, balance: normalizeCents(entry.balance) + amount };
    }
    if (entry.id === settlement.to) {
      return { ...entry, balance: normalizeCents(entry.balance) - amount };
    }
    return entry;
  });
}
