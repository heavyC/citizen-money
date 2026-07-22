import { createSlice } from "@reduxjs/toolkit";

interface ChatUiState {
  isOpen: boolean;
}

const initialState: ChatUiState = { isOpen: false };

const chatUiSlice = createSlice({
  name: "chatUi",
  initialState,
  reducers: {
    toggleChat(state) {
      state.isOpen = !state.isOpen;
    },
    closeChat(state) {
      state.isOpen = false;
    },
  },
});

export const { toggleChat, closeChat } = chatUiSlice.actions;
export default chatUiSlice.reducer;
