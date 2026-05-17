# SKY WAR

Jogo local de batalha entre dois avioes com backend em FastAPI e frontend em JavaScript Vanilla.

## Estrutura

- `src/backend`: API FastAPI e persistencia SQLite.
- `src/frontend`: Interface web e logica do jogo.

## Requisitos

- Python 3.11+
- Recomenda-se criar um ambiente virtual dedicado para o projeto.
- Dependencias do backend: FastAPI, Uvicorn e demais pacotes listados em [src/backend/requirements.txt](src/backend/requirements.txt).

## Como executar

Primeiro, prepare o ambiente do projeto:

```bash
cd src/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Se estiver usando o VS Code, selecione o interpretador do ambiente virtual para o projeto:

1. Pressione `Ctrl+Shift+P`.
2. Execute o comando `Python: Select Interpreter`.
3. Escolha o Python do ambiente criado em `src/backend/.venv`.

Isso garante que o debug em [src/backend/launch.json](src/backend/launch.json) e o terminal integrado usem o mesmo ambiente do projeto.

Depois, escolha uma das formas de execucao abaixo.

### 1. Modo debug pelo launch.json

Use a configuracao `Python: Backend Debug` em [src/backend/launch.json](src/backend/launch.json). Ela executa [src/backend/app/main.py](src/backend/app/main.py) com `--reload` e define `PYTHONPATH` para o backend.

### 2. Execucao direta no terminal

Com o ambiente virtual ativado:

```bash
python src/backend/app/main.py --reload
```

Se preferir definir a porta manualmente:

```bash
python src/backend/app/main.py --reload --port 8000
```

Tambem e possivel iniciar a aplicacao a partir da pasta do backend:

```bash
cd src/backend
uvicorn app.main:app --reload
```

Abra `http://127.0.0.1:8000` no navegador.
