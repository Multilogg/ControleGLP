# Configurar banco online gratuito

Este projeto foi preparado para usar Supabase Free como banco online.

## 1. Criar o projeto

1. Acesse `https://supabase.com`.
2. Crie uma conta gratuita.
3. Crie um novo projeto.
4. Aguarde o banco ficar pronto.

## 2. Criar a tabela

No painel do Supabase, abra **SQL Editor** e execute o conteúdo do arquivo:

```text
db/supabase-schema.sql
```

## 3. Configurar as chaves

No Supabase, vá em **Project Settings > API** e copie:

- Project URL
- anon public key

Depois edite:

```text
js/supabase-config.js
```

Preencha assim:

```js
window.SUPABASE_CONFIG = {
    url: "https://SEU-PROJETO.supabase.co",
    anonKey: "SUA_ANON_KEY",
    stateId: "controle-glp"
};
```

## 4. Como funciona

- Se as chaves estiverem vazias, o sistema continua usando `localStorage`.
- Se as chaves estiverem preenchidas, o sistema carrega e salva os dados online.
- Se o banco online estiver vazio, o sistema envia os dados locais atuais para criar o primeiro estado online.

## Observação

Essa configuração gratuita usa um estado JSON único para simplificar a publicação sem custo.
Ela é boa para começar, mas se várias pessoas editarem ao mesmo tempo, a última gravação pode sobrescrever a anterior.
Para uso mais robusto com vários usuários simultâneos, o próximo passo é normalizar em tabelas separadas com login.
