// src/services/aiChatService.js
import axiosClient from './axiosClient';

export const aiChatService = {
  chatWithDatabase: (question) => axiosClient.post('/ai-chat/query', { question })
};