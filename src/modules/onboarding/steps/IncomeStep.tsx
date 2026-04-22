import type { OnboardingStepProps } from '../types';
import { LargeMoneyInput } from '../components/LargeMoneyInput';

export default function IncomeStep({ incomeInput, onIncomeInputChange }: OnboardingStepProps) {
  return (
    <LargeMoneyInput
      autoFocus
      value={incomeInput}
      onChange={onIncomeInputChange}
      placeholder="75000"
      helper="Monthly income in INR"
    />
  );
}
