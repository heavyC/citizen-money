import { configureStore } from "@reduxjs/toolkit";
import transactionFiltersReducer from "./slices/transaction-filters-slice";
import chatUiReducer from "./slices/chat-ui-slice";

export const store = configureStore({
  reducer: {
    transactionFilters: transactionFiltersReducer,
    chatUi: chatUiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
