
export function categorizeError(message) {
  message = message.toLowerCase();

  if (message.includes("network") || message.includes("timeout")) {
    return "NETWORK_ERROR";
  }

  if (message.includes("axios") || message.includes("connection")) {
    return "CONNECTION_ERROR";
  }

  if (message.includes("model") || message.includes("ollama")) {
    return "ENGINE_ERROR";
  }

  if (message.includes("file") || message.includes("upload")) {
    return "FILE_ERROR";
  }

  if (message.includes("voice") || message.includes("audio")) {
    return "VOICE_ERROR";
  }

  if (message.includes("image")) {
    return "IMAGE_ERROR";
  }

  return "GENERAL_ERROR";
}
