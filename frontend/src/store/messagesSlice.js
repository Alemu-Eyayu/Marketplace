import { createSlice } from '@reduxjs/toolkit';

const messagesSlice = createSlice({
  name: 'messages',
  initialState: {
    conversations: [],
    currentConversation: null,
    messages: [],
    loading: false,
    error: null,
  },
  reducers: {
    setConversations(state, action) {
      state.conversations = action.payload;
    },
    setCurrentConversation(state, action) {
      state.currentConversation = action.payload;
    },
    setMessages(state, action) {
      state.messages = action.payload;
    },
    appendMessage(state, action) {
      // Check if message already exists to prevent duplicates
      const existingMessage = state.messages.find(msg => msg._id === action.payload._id);
      if (!existingMessage) {
        state.messages.push(action.payload);
      }
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
  },
});

export const {
  setConversations,
  setCurrentConversation,
  setMessages,
  appendMessage,
  setLoading,
  setError,
} = messagesSlice.actions;
export default messagesSlice.reducer;
