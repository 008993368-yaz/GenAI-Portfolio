export const CHAT_REQUEST_TIMEOUT_MS = 30_000;
export const SESSION_ID_RANDOM_SUFFIX_LENGTH = 9;
export const MAX_CHAT_MESSAGES = 50;
export const CHAT_OFFLINE_MESSAGE = 'You are offline. Reconnect to send messages.';
export const CHAT_GREETING_MESSAGE = 'Hi, I am Yazhini. Ask me about my projects, skills, or experience.';

export const SUGGESTION_FALLBACK_QUESTIONS = [
	'Can you tell me about your background?',
	'How much work experience do you have?',
];

export const SUGGESTION_ERROR_MESSAGES = {
	OFFLINE_MODE: 'Suggestions are in offline mode. Showing defaults.',
	OFFLINE: 'You are offline. Showing default suggestions.',
	TIMEOUT: 'Suggestions timed out. Showing defaults.',
	NETWORK: 'Cannot load suggestions right now. Showing defaults.',
	DEFAULT: 'Unable to refresh suggestions. Showing defaults.',
};

export const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
export const HTTP_STATUS_SERVER_ERROR = 500;
export const HTTP_STATUS_UNKNOWN = 0;
