import type { FinancialGoal, OnboardingPreferences, OnboardingProfile, OnboardingUpdate } from '@/core/store';

export interface OnboardingStepProps {
  profile: OnboardingProfile;
  firstName: string;
  incomeInput: string;
  expenseInput: string;
  incomeCents: number;
  expenseCents: number;
  onProfileChange: (updates: OnboardingUpdate) => void;
  onIncomeInputChange: (value: string) => void;
  onExpenseInputChange: (value: string) => void;
  onGoalToggle: (goal: FinancialGoal) => void;
  onPreferenceChange: (preferences: Partial<OnboardingPreferences>) => void;
}
