export const queryKeys = {
  expenses: {
    all: ['expenses'] as const,
    household: (householdId: string) => ['expenses', householdId] as const,
  },

  balances: {
    all: ['balances'] as const,
    household: (householdId: string) => ['balances', householdId] as const,
  },

  stats: {
    all: ['stats'] as const,
    household: (householdId: string) => ['stats', householdId] as const,
  },

  members: {
    all: ['members'] as const,
    household: (householdId: string) => ['members', householdId] as const,
  },

  profile: {
    all: ['profile'] as const,
    current: () => ['profile', 'current'] as const,
  },
} as const;
