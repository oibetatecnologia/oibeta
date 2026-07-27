# Beta Core

O MVP do Beta Core v0.1 apresenta uma inteligência artificial corporativa (Beta) com estruturação de dados de persistência local ou integrada por nuvem (Supabase). 

## Inteligência Externa (IA) é Opcional
A Beta é construída com um barramento agnóstico de inteligência conectada (Multi-IA). 
**Você não precisa de chaves do Gemini (nem de qualquer outro provedor) para executar o sistema.**
Caso a Beta inicie sem nenhuma inteligência ativa ou caso ocorram quedas de comunicação, ela entrará no **Modo Local Autônomo da Beta** (Mock mode) e operará de forma contínua acessando o banco de dados das suas tarefas e ações. 

### Bancos de Dados
- **json:** Base local em `db.json` para testar.
- **supabase:** Banco remoto na nuvem com autenticação real de organização e usuários. 
