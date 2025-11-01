# 🧩 Giwa: Automatizador On-chain & Bridge Scheduler

> **Giwa Airdrop** é um script Node.js que automatiza transações on-chain, bridges, e deploys de contratos com agendamento diário.  
> Compatível com **Windows (via Anaconda)** e **Linux (via terminal)**.

---

## 📚 Sumário
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
  - [Windows (via Anaconda)](#-windows-via-anaconda)
  - [Linux (via-terminal)](#-linux-via-terminal)
- [Logs e Saídas](#-logs-e-saídas)
- [Parar o Daemon](#-parar-o-daemon)
- [Autor](#-autor)

---

## 🧩 Pré-requisitos

- **Node.js v18+** (recomendado **v20** ou superior)  
- **Git** instalado  
- Conexão à internet  
- Sua Chave privada configurada no arquivo `.env` 

---

## ⚙️ Instalação

### 👾 Windows (via Anaconda)

1. Abra o **Anaconda Prompt**
2. Crie e ative um ambiente para o Giwa:
   ```bash
   conda create -n giwa nodejs=20 git -y
   conda activate giwa
   ```
   
3. Clone o repositório e acesse a pasta:
    ```bash
    git clone https://github.com/f00dat/Giwa-Airdrop
    cd Giwa-Airdrop
    ```

4. Instale as dependências:
    ```bash
    npm install ethers dotenv
    ```

5. Execute o Script:
    ```bash
    node giwa.js
    ```


### 🐧 Linux (via terminal)

1. Verifique se o Node.js está instalado:
    ```bash
    node -v
    ```

1.1 Se não estiver, instale com:
    
    sudo apt update && sudo apt install -y nodejs npm

2. Clone o repositório:
    ```bash
    git clone https://github.com/f00dat/Giwa-Airdrop
    cd Giwa-Airdrop
    ```

3. Instale as dependências:
    ```bash
    npm install ethers dotenv
    ```

4. Execute o Script:
    ```bash
    node giwa.js
    ```

🧾 Logs e Saídas

Todos os logs são gravados em:
    ```bash
    out/activity.log
    ```
  
Cada execução cria arquivos JSON em `out/` com informações detalhadas:

* bridge-*.json (**Bridge no site do Airdrop**)

* gm-*.json (**GM no OnChainGM**)

* onchaingm-*.json (**Deploy de contrato inteligente no OnChainGM**)

* owlto-*.json (**Deploy de contrato inteligente na Owlto Finance**)

* Esses arquivos contêm histórico, erros, valores e TXs enviadas.


## 🧹 Parar o Daemon

Para encerrar a execução do Giwa com segurança:
    ```bash
    CTRL + C
    ```

O console exibirá:
    ```bash
    (SIGINT recebido, finalizando...)
    ```

## 🧑‍💻 Autor

**Desmistificador de Crypto**

<a href="https://www.youtube.com/@desmistificadordecrypto" target="_blank">📺 YouTube</a><br>
<a href="https://x.com/desm_de_crypto" target="_blank">🐦 Twitter</a><br>
<a href="https://t.me/Desmistificador_de_crypto" target="_blank">💬 Canal Telegram</a><br>
<a href="https://t.me/+EK-001T9G6E1ZTQ5" target="_blank">👥 Grupo Telegram</a><br>
