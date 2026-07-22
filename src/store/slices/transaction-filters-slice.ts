import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface TransactionFiltersState {
  category: string | null;
  search: string;
}

const initialState: TransactionFiltersState = {
  category: null,
  search: "",
};

const transactionFiltersSlice = createSlice({
  name: "transactionFilters",
  initialState,
  reducers: {
    setCategory(state, action: PayloadAction<string | null>) {
      state.category = action.payload;
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
  },
});

export const { setCategory, setSearch } = transactionFiltersSlice.actions;
export default transactionFiltersSlice.reducer;
