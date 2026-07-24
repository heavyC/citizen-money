import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface TransactionFiltersState {
  categoryId: string | null;
  search: string;
}

const initialState: TransactionFiltersState = {
  categoryId: null,
  search: "",
};

const transactionFiltersSlice = createSlice({
  name: "transactionFilters",
  initialState,
  reducers: {
    setCategoryId(state, action: PayloadAction<string | null>) {
      state.categoryId = action.payload;
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
  },
});

export const { setCategoryId, setSearch } = transactionFiltersSlice.actions;
export default transactionFiltersSlice.reducer;
