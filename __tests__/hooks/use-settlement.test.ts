import { useSettlements } from '@/hooks/use-settlement';
import { act, renderHook, waitFor } from '@testing-library/react';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
      in: jest.fn(() => ({
        order: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(),
    })),
    insert: jest.fn(),
  })),
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

const mockUser = {
  id: 'user-1',
  email: 'john@example.com',
};

const mockProfile = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  household_id: 'household-1',
  payment_link: 'https://pay.example.com/john',
};

const mockHouseholdMembers = [
  mockProfile,
  {
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    household_id: 'household-1',
    payment_link: 'https://pay.example.com/jane',
  },
  {
    id: 'user-3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    household_id: 'household-1',
    payment_link: 'https://pay.example.com/bob',
  },
];

const mockExpenseSplits = [
  {
    id: 'split-1',
    user_id: 'user-1',
    amount_owed: 100.0,
    is_settled: false,
    expenses: {
      id: 'expense-1',
      household_id: 'household-1',
      paid_by: 'user-2',
      description: 'Groceries',
      amount: 200.0,
      date: '2024-01-15',
      category: 'food',
      split_type: 'equal',
      created_at: '2024-01-15',
      updated_at: '2024-01-15',
    },
  },
  {
    id: 'split-2',
    user_id: 'user-1',
    amount_owed: 50.0,
    is_settled: false,
    expenses: {
      id: 'expense-2',
      household_id: 'household-1',
      paid_by: 'user-2',
      description: 'Utilities',
      amount: 100.0,
      date: '2024-01-10',
      category: 'utilities',
      split_type: 'equal',
      created_at: '2024-01-10',
      updated_at: '2024-01-10',
    },
  },
  {
    id: 'split-3',
    user_id: 'user-3',
    amount_owed: 75.0,
    is_settled: false,
    expenses: {
      id: 'expense-3',
      household_id: 'household-1',
      paid_by: 'user-1',
      description: 'Internet',
      amount: 150.0,
      date: '2024-01-12',
      category: 'utilities',
      split_type: 'equal',
      created_at: '2024-01-12',
      updated_at: '2024-01-12',
    },
  },
];

const mockPaymentNotes = [
  {
    id: 'note-1',
    from_user_id: 'user-1',
    to_user_id: 'user-2',
    amount: 50.0,
    note: 'Partial payment for groceries',
    created_at: '2024-01-20',
    updated_at: '2024-01-20',
  },
];

describe('useSettlements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('returns initial state with loading true', () => {
      const { result } = renderHook(() => useSettlements());

      expect(result.current.loading).toBe(true);
      expect(result.current.balances).toEqual([]);
      expect(result.current.completedSettlements).toEqual([]);
      expect(result.current.householdMembers).toEqual([]);
      expect(result.current.currentUser).toBeUndefined();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Data Loading', () => {
    it('loads data successfully', async () => {
      // Mock successful responses
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      }));

      const mockFrom = jest.fn(() => ({
        select: mockSelect,
        in: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: mockHouseholdMembers,
            error: null,
          }),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(),
        })),
        insert: jest.fn(),
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      // Mock expense splits query
      mockFrom.mockImplementation((table) => {
        if (table === 'expense_splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  order: jest.fn().mockResolvedValue({
                    data: mockExpenseSplits,
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return {
          select: mockSelect,
          in: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: mockPaymentNotes,
              error: null,
            }),
          })),
          update: jest.fn(() => ({
            eq: jest.fn(),
          })),
          insert: jest.fn(),
        };
      });

      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentUser).toEqual(mockProfile);
      expect(result.current.householdMembers).toEqual(mockHouseholdMembers);
      expect(result.current.error).toBeNull();
    });

    it('handles authentication error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Not authenticated');
    });

    it('handles profile fetch error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Profile not found' },
          }),
        })),
      }));

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load settlement data');
    });

    it('handles missing household', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      const profileWithoutHousehold = {
        ...mockProfile,
        household_id: null,
      };

      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: profileWithoutHousehold,
            error: null,
          }),
        })),
      }));

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('No household found');
    });
  });

  describe('Balance Calculations', () => {
    beforeEach(() => {
      // Setup successful authentication and profile loading
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      }));

      const mockFrom = jest.fn(() => ({
        select: mockSelect,
        in: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: mockHouseholdMembers,
            error: null,
          }),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(),
        })),
        insert: jest.fn(),
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      // Mock expense splits query
      mockFrom.mockImplementation((table) => {
        if (table === 'expense_splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  order: jest.fn().mockResolvedValue({
                    data: mockExpenseSplits,
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return {
          select: mockSelect,
          in: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: mockPaymentNotes,
              error: null,
            }),
          })),
          update: jest.fn(() => ({
            eq: jest.fn(),
          })),
          insert: jest.fn(),
        };
      });
    });

    it('calculates balances correctly', async () => {
      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.balances).toHaveLength(2);

      // Check first balance (user-1 owes user-2 $150)
      const firstBalance = result.current.balances[0];
      expect(firstBalance.fromUser.id).toBe('user-1');
      expect(firstBalance.toUser.id).toBe('user-2');
      expect(firstBalance.amount).toBe(150);

      // Check second balance (user-3 owes user-1 $75)
      const secondBalance = result.current.balances[1];
      expect(secondBalance.fromUser.id).toBe('user-3');
      expect(secondBalance.toUser.id).toBe('user-1');
      expect(secondBalance.amount).toBe(75);
    });

    it('includes related splits in balance calculations', async () => {
      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstBalance = result.current.balances[0];
      expect(firstBalance.related_splits).toHaveLength(2);
      expect(firstBalance.related_splits[0].expense.description).toBe(
        'Groceries'
      );
      expect(firstBalance.related_splits[1].expense.description).toBe(
        'Utilities'
      );
    });

    it('sorts balances by amount (highest first)', async () => {
      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.balances[0].amount).toBe(150);
      expect(result.current.balances[1].amount).toBe(75);
    });
  });

  describe('Completed Settlements', () => {
    beforeEach(() => {
      // Setup successful authentication and profile loading
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      }));

      const mockFrom = jest.fn(() => ({
        select: mockSelect,
        in: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: mockHouseholdMembers,
            error: null,
          }),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(),
        })),
        insert: jest.fn(),
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      // Mock expense splits query (empty for this test)
      mockFrom.mockImplementation((table) => {
        if (table === 'expense_splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  order: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return {
          select: mockSelect,
          in: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: mockPaymentNotes,
              error: null,
            }),
          })),
          update: jest.fn(() => ({
            eq: jest.fn(),
          })),
          insert: jest.fn(),
        };
      });
    });

    it('loads completed settlements correctly', async () => {
      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.completedSettlements).toHaveLength(1);
      expect(result.current.completedSettlements[0].amount).toBe(50);
      expect(result.current.completedSettlements[0].fromUser.id).toBe('user-1');
      expect(result.current.completedSettlements[0].toUser.id).toBe('user-2');
    });

    it('transforms payment notes to settlement format', async () => {
      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const settlement = result.current.completedSettlements[0];
      expect(settlement.status).toBe('completed');
      expect(settlement.description).toBe('Partial payment for groceries');
      expect(settlement.note).toBe('Partial payment for groceries');
    });
  });

  describe('Settlement Processing', () => {
    beforeEach(() => {
      // Setup successful authentication and profile loading
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      }));

      const mockFrom = jest.fn(() => ({
        select: mockSelect,
        in: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: mockHouseholdMembers,
            error: null,
          }),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
        insert: jest.fn().mockResolvedValue({ error: null }),
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      // Mock expense splits query
      mockFrom.mockImplementation((table) => {
        if (table === 'expense_splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  order: jest.fn().mockResolvedValue({
                    data: mockExpenseSplits,
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return {
          select: mockSelect,
          in: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: mockPaymentNotes,
              error: null,
            }),
          })),
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ error: null }),
          })),
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      });
    });

    it('processes settlement successfully', async () => {
      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const balance = result.current.balances[0];
      const amount = 50;
      const note = 'Partial payment';

      await act(async () => {
        await result.current.settlePayment(balance, amount, note);
      });

      // Verify that the settlement was processed
      expect(mockSupabase.from).toHaveBeenCalledWith('expense_splits');
      expect(mockSupabase.from).toHaveBeenCalledWith('payment_notes');
    });

    it('throws error for invalid payment amount', async () => {
      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const balance = result.current.balances[0];

      await expect(
        act(async () => {
          await result.current.settlePayment(balance, -10, 'Invalid payment');
        })
      ).rejects.toThrow('Invalid payment amount');

      await expect(
        act(async () => {
          await result.current.settlePayment(balance, 200, 'Too much');
        })
      ).rejects.toThrow('Invalid payment amount');
    });

    it('handles settlement errors gracefully', async () => {
      // Mock a settlement error
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'expense_splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  order: jest.fn().mockResolvedValue({
                    data: mockExpenseSplits,
                    error: null,
                  }),
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest
                .fn()
                .mockResolvedValue({ error: { message: 'Update failed' } }),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockProfile,
                error: null,
              }),
            })),
          })),
          in: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: mockPaymentNotes,
              error: null,
            }),
          })),
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ error: null }),
          })),
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      });

      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const balance = result.current.balances[0];

      await expect(
        act(async () => {
          await result.current.settlePayment(balance, 50, 'Test payment');
        })
      ).rejects.toThrow();
    });
  });

  describe('Data Refresh', () => {
    it('refreshes data when refreshData is called', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      }));

      const mockFrom = jest.fn(() => ({
        select: mockSelect,
        in: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: mockHouseholdMembers,
            error: null,
          }),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(),
        })),
        insert: jest.fn(),
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      // Mock expense splits query
      mockFrom.mockImplementation((table) => {
        if (table === 'expense_splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  order: jest.fn().mockResolvedValue({
                    data: mockExpenseSplits,
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return {
          select: mockSelect,
          in: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: mockPaymentNotes,
              error: null,
            }),
          })),
          update: jest.fn(() => ({
            eq: jest.fn(),
          })),
          insert: jest.fn(),
        };
      });

      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Reset mocks to verify refreshData calls them again
      jest.clearAllMocks();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      await act(async () => {
        await result.current.refreshData();
      });

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty expense splits', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      }));

      const mockFrom = jest.fn(() => ({
        select: mockSelect,
        in: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: mockHouseholdMembers,
            error: null,
          }),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(),
        })),
        insert: jest.fn(),
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      // Mock empty expense splits
      mockFrom.mockImplementation((table) => {
        if (table === 'expense_splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  order: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return {
          select: mockSelect,
          in: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          })),
          update: jest.fn(() => ({
            eq: jest.fn(),
          })),
          insert: jest.fn(),
        };
      });

      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.balances).toEqual([]);
      expect(result.current.completedSettlements).toEqual([]);
    });

    it('handles missing expense data in splits', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      }));

      const mockFrom = jest.fn(() => ({
        select: mockSelect,
        in: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: mockHouseholdMembers,
            error: null,
          }),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(),
        })),
        insert: jest.fn(),
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      // Mock splits with missing expense data
      const splitsWithMissingExpense = [
        {
          id: 'split-1',
          user_id: 'user-1',
          amount_owed: 100.0,
          is_settled: false,
          expenses: null, // Missing expense data
        },
      ];

      mockFrom.mockImplementation((table) => {
        if (table === 'expense_splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  order: jest.fn().mockResolvedValue({
                    data: splitsWithMissingExpense,
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return {
          select: mockSelect,
          in: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          })),
          update: jest.fn(() => ({
            eq: jest.fn(),
          })),
          insert: jest.fn(),
        };
      });

      const { result } = renderHook(() => useSettlements());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should handle missing expense data gracefully
      expect(result.current.balances).toEqual([]);
    });
  });
});
