export type AccountType = 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'INCOME';

export interface Account {
  id: number;
  name: string;
  code: string;
  type: AccountType;
  parentId: number | null;
  debitBalance: number;
  creditBalance: number;
  totalBalance: number;
  createdAt: string;
  updatedAt: string;
  children?: Account[];
}

export interface CreateAccountDTO {
  name: string;
  code: string;
  type: AccountType;
  parentId?: number | null;
}

export interface UpdateAccountDTO extends Partial<CreateAccountDTO> {} 