export function createRouter() {
  return {
    async handle(payload) {
      const { type } = payload;

      if (type === "text") {
        return { type: "text", response: payload.text };
      }

      if (type === "file") {
        return { type: "file", name: payload.file.name, size: payload.file.size };
      }

      if (type === "execute") {
        try {
          const result = eval(payload.code);
          return { type: "execute", result };
        } catch (err) {
          return { type: "execute", error: err.message };
        }
      }

      return { error: "Unknown payload type" };
    }
  };
}