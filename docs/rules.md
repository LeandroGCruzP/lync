# Rules

### Organização
[x] Qualquer usuário pode criar uma organização
[x] Somente o OWNER de uma organização pode editar a organização
[x] Somente o OWNER de uma organização pode transferir a propriedade da organização para outro usuário
[x] Somente o OWNER de uma organização pode deletar a organização
[x] Somente os ADMINs de uma organização podem convidar usuários para a organização
[x] Somente os ADMINs de uma organização podem revogar o convite de um usuário para a organização
[x] Somente os ADMINs de uma organização podem remover usuários da organização
[x] O slug da organização deve ser único
[x] O domínio da organização deve ser único (se existir)

### Usuário
[x] O email do usuário deve ser único
[x] Usuários podem pertencer a múltiplas organizações

### Evento
[x] Somente os ADMINs de uma organização podem criar eventos
[x] O slug do evento deve ser único

### Permissões Gerais (Implementadas)
- **ADMIN**: Pode gerenciar tudo (`manage all`), exceto ações destrutivas/críticas na Organização que são reservadas ao OWNER.
- **MEMBER**: Permissão básica de visualização (`get User`).