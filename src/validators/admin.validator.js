/**
 * Validação dos formulários do painel /admin.
 * Retorna { success, data } ou { success: false, errors: { campo: 'mensagem' } }.
 */
const { z } = require('zod');

function toFieldErrors(error) {
  const errors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] ?? 'form';
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

const schemas = {
  login: z.object({
    username: z.string().trim().min(1, 'Informe o usuário.').max(80),
    password: z.string().min(1, 'Informe a senha.').max(200),
  }),
};

function validateAdmin(name, input) {
  const result = schemas[name].safeParse(input || {});
  return result.success ? { success: true, data: result.data } : { success: false, errors: toFieldErrors(result.error) };
}

module.exports = { validateAdmin, schemas };
