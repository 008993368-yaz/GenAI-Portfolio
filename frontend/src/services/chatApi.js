/**
 * Chat API service for communicating with FastAPI backend
 */

import {
  CHAT_OFFLINE_MESSAGE,
  CHAT_REQUEST_TIMEOUT_MS,
  SESSION_ID_RANDOM_SUFFIX_LENGTH,
} from '../constants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const SESSION_STORAGE_KEY = 'portfolio_chat_session_id';
const KNOWN_ERROR_CODES = new Set(['OFFLINE', 'TIMEOUT', 'NETWORK_ERROR', 'HTTP_ERROR']);

function ensureOnline() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw buildApiError(CHAT_OFFLINE_MESSAGE, 'OFFLINE');
  }
}

function buildApiError(message, code, status = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function isKnownApiError(error) {
  return KNOWN_ERROR_CODES.has(error?.code);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = CHAT_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw buildApiError(
        `Request timed out after ${CHAT_REQUEST_TIMEOUT_MS / 1000} seconds. Please check your connection and try again.`,
        'TIMEOUT'
      );
    }

    throw buildApiError(
      'Unable to reach the server. Please check your internet connection and try again.',
      'NETWORK_ERROR'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestJson(endpoint, { method = 'GET', body = null, timeoutMs = CHAT_REQUEST_TIMEOUT_MS } = {}) {
  ensureOnline();

  const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  }, timeoutMs);

  if (!response.ok) {
    throw buildApiError(
      `Request failed with status ${response.status}.`,
      'HTTP_ERROR',
      response.status
    );
  }

  return response.json();
}

function mapUnknownError(defaultMessage, error) {
  if (isKnownApiError(error)) {
    throw error;
  }

  throw buildApiError(defaultMessage, 'UNKNOWN_ERROR');
}

function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 2 + SESSION_ID_RANDOM_SUFFIX_LENGTH)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }

  return sessionId;
}

export async function sendMessage(message) {
  const sessionId = getSessionId();

  try {
    const data = await requestJson('/chat', {
      method: 'POST',
      body: {
        sessionId,
        message,
      },
    });
    return data.reply;
  } catch (error) {
    console.error('Chat API error:', error);
    mapUnknownError('Something went wrong while sending your message. Please try again.', error);
  }
}

export async function fetchSuggestions(payload = {}) {
  try {
    return await requestJson('/suggestions', {
      method: 'POST',
      body: {
        last_user_message: payload.last_user_message || null,
        conversation_summary: payload.conversation_summary || null,
      },
    });
  } catch (error) {
    console.error('Suggestions API error:', error);
    mapUnknownError('Something went wrong while loading suggestions. Please try again.', error);
  }
}
