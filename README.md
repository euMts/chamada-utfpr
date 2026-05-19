# Chamada UTFPR

Aplicação web para registrar presença em chamadas da UTFPR a partir da leitura de um QR code pelo celular ou computador.

O projeto foi pensado para simplificar o processo de chamada: o usuário faz login com suas credenciais, aponta a câmera para o QR code exibido pelo professor e o app envia os dados para o endpoint da chamada automaticamente.

## O que o projeto faz

O fluxo principal da aplicação é:

1. o usuário informa `username` e `senha`;
2. as credenciais são criptografadas no servidor e armazenadas localmente no navegador;
3. o app abre a câmera e lê o QR code da chamada;
4. o QR code é interpretado para extrair o `idChamada`;
5. a aplicação consulta o nome da chamada;
6. ao tocar em `Registrar Presença`, o app envia os dados necessários para o endpoint da chamada.

## Funcionalidades

- Login local com persistência da sessão no navegador.
- Criptografia das credenciais antes de salvar no `localStorage`.
- Leitura de QR code usando a câmera do dispositivo.
- Identificação do nome da chamada a partir da URL escaneada.
- Envio da presença diretamente para o endpoint da chamada.
- Interface otimizada para celular.
- Suporte a instalação como PWA.

## Como funciona por dentro

O frontend foi construído com Next.js e roda inteiramente no navegador do usuário, mas algumas ações sensíveis passam por rotas de API internas:

- `src/app/api/local-auth/route.ts`: criptografa e descriptografa as credenciais.
- `src/app/api/chamada-label/route.ts`: tenta descobrir o nome da chamada a partir da URL lida no QR code.
- `src/app/api/register-presence/route.ts`: recebe a URL da chamada e as credenciais criptografadas, descriptografa os dados no servidor e envia o POST para registrar a presença.

### Busca do nome da chamada

A rota `src/app/api/chamada-label/route.ts` recebe a URL original lida no QR code e usa essa URL exatamente como ela chegou, sem substituir o host por um domínio fixo. Isso permite que o app funcione tanto com links apontando para a UTFPR quanto com links de um host local ou outro ambiente.

O processo de descoberta do nome segue esta ordem:

1. faz um `GET` na URL completa da chamada usando `curl`;
2. lê o HTML retornado;
3. procura primeiro um `<label>` com classe `display-5`, formato usado pela página clássica da chamada;
4. se esse label não existir, tenta o primeiro `<label>` válido que não seja placeholder como `Portal não encontrado`, `Usuário` ou `Senha`;
5. se o HTML inicial não tiver um nome válido, consulta a API `/api/portals/{idChamada}` no mesmo host da URL recebida e usa o campo `portal.name`.

Esse fallback cobre páginas renderizadas no cliente, em que o HTML inicial mostra apenas um estado temporário e o nome real do portal é carregado depois via API.

## Tecnologias

- Node.js 22.17.0
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- `qr-scanner`
- PWA com Service Worker

## Configuração

Crie um arquivo `.env` com base no `.env.example`:

```bash
cp .env.example .env
```

Defina a variável abaixo com um valor longo e secreto:

```env
LOCAL_STORAGE_ENCRYPTION_KEY=sua-chave-secreta-aqui
```

Essa chave é usada para derivar a chave de criptografia das credenciais que ficam salvas localmente no navegador.

## Como rodar localmente

Use Node.js `22.17.0`. Se estiver usando `nvm`, rode:

```bash
nvm use
```

Na Vercel, o override de versão do Node.js é configurado por major version. Por isso, o `package.json` usa `engines.node` como `22.x`, enquanto o `.nvmrc` fixa `22.17.0` para o ambiente local.

Instale as dependências:

```bash
npm install
```

Inicie o projeto em modo de desenvolvimento:

```bash
npm run dev
```

Depois, abra [http://localhost:3000](http://localhost:3000).

## Scripts disponíveis

- `npm run dev`: inicia o ambiente de desenvolvimento com Turbopack.
- `npm run build`: gera a build de produção.
- `npm run start`: inicia a aplicação em produção.
- `npm run lint`: executa o ESLint.

## Observações

- O app depende de permissão de câmera para ler os QR codes.
- As credenciais não são armazenadas em texto puro no navegador, mas ainda assim este é um projeto que lida com dados sensíveis e deve ser usado com cuidado.
- Para melhor experiência no celular, o app pode ser instalado como aplicativo.
