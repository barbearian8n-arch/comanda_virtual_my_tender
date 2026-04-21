export const authService = {
  login: async (email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email === "admin@admin.com" && password === "admin") {
          resolve({
            user: { id: 1, name: "Admin", email },
            token: "mock-jwt-token-12345"
          });
        } else if (email && password) {
          resolve({
            user: { id: 2, name: "Usuário Teste", email },
            token: "mock-jwt-token-67890"
          });
        } else {
          reject(new Error("Credenciais inválidas"));
        }
      }, 500);
    });
  },

  register: async (name, email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!name || !email || !password) {
          reject(new Error("Todos os campos são obrigatórios"));
          return;
        }
        resolve({
          user: { id: 3, name, email },
          token: "mock-jwt-token-new-user"
        });
      }, 500);
    });
  }
};
