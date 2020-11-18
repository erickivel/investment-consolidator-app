import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import api from '../services/api';

interface Category {
  id: string;
  name: string;
}

interface Movement {
  id: string;
  product_name: string;
  movement_date: string;
  financial_institution: string;
  movement_value: number;
  movement_type: 'application' | 'redemption';
  amount: number;
  category: Category;
}

interface CategoryBalance {
  category_name: string;
  total_value_invested: number;
  category_percentage: number;
}

interface CategoriesBalanceWithTotal {
  categoriesBalances: CategoryBalance[];
  total: number;
}

interface BalanceByName {
  product_name: string;
  total_value_invested: number;
  total_amount: number;
  category: string;
}

interface MovementRequestData {
  category_id: string;
  product_name: string;
  movement_date: Date;
  financial_institution: string;
  movement_value: number;
  movement_type: 'application' | 'redemption';
  amount: number;
}

interface ExtractContext {
  categoriesBalance: CategoriesBalanceWithTotal;
  movements: Movement[];
  productNames: string[];
  categoryNames: Category[];
  balancesByName: BalanceByName[];
  createMovement(data: MovementRequestData): Promise<void>;
}

const ExtractContext = createContext<ExtractContext | null>(null);

const ExtractProvider: React.FC = ({ children }) => {
  const [categoriesBalance, setCategoriesBalance] = useState<
    CategoriesBalanceWithTotal
  >({
    categoriesBalances: [],
    total: 0,
  });
  const [movements, setMovements] = useState<Movement[]>([]);
  const [productNames, setProductNames] = useState(['']);
  const [categoryNames, setCategoryNames] = useState<Category[]>([]);
  const [balancesByName, setBalancesByName] = useState<BalanceByName[]>([]);

  useEffect(() => {
    async function loadCategoriesBalance(): Promise<void> {
      const response = await api.get('/balance/category');

      setCategoriesBalance(response.data);
    }

    async function loadMovementsAndBalancesByName(): Promise<void> {
      const movementsResponse = await api.get('/movements');

      const movementsData: Movement[] = movementsResponse.data;

      const productNamesWithoutDuplicates = movementsData
        .map(movement => movement.product_name)
        .filter((product_name, index) => {
          return (
            movementsData
              .map(movement => movement.product_name)
              .indexOf(product_name) === index
          );
        });

      const balancesByNameResponse = await api.get('/balance/name');

      const balancesByNameData: BalanceByName[] = balancesByNameResponse.data;

      const balancesByNameDataWithCategory = balancesByNameData.map(balance => {
        const balanceCategory = movementsData.find(
          movement => movement.product_name === balance.product_name,
        ) || {
          category: {
            name: 'Não definida',
          },
        };

        return {
          ...balance,
          category: balanceCategory.category.name,
        };
      });

      setBalancesByName(balancesByNameDataWithCategory);
      setMovements(movementsData);
      setProductNames(productNamesWithoutDuplicates);
    }

    async function loadCategoryNames(): Promise<void> {
      const response = await api.get('/categories');

      setCategoryNames(response.data);
    }

    loadCategoriesBalance();
    loadMovementsAndBalancesByName();
    loadCategoryNames();
  }, []);

  const createMovement = useCallback(
    async ({
      category_id,
      product_name,
      movement_date,
      financial_institution,
      movement_value,
      movement_type,
      amount,
    }) => {
      const response = await api.post('/movements', {
        category_id,
        product_name,
        movement_date,
        financial_institution,
        movement_value,
        movement_type,
        amount,
      });

      setMovements([...movements, response.data]);
    },
    [movements],
  );

  // const filterBalancesByNameByCategory = useCallback(() => {}, []);

  const value = React.useMemo(
    () => ({
      categoriesBalance,
      movements,
      productNames,
      categoryNames,
      balancesByName,
      createMovement,
    }),
    [
      categoriesBalance,
      movements,
      productNames,
      categoryNames,
      balancesByName,
      createMovement,
    ],
  );

  return (
    <ExtractContext.Provider value={value}>{children}</ExtractContext.Provider>
  );
};

function useExtract(): ExtractContext {
  const context = useContext(ExtractContext);

  if (!context) {
    throw new Error(`useExtract must be used within a ExtractProvider`);
  }

  return context;
}

export { ExtractProvider, useExtract };
