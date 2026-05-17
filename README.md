# SKY WAR

Jogo local de batalha entre dois avioes com backend em FastAPI e frontend em JavaScript Vanilla.

## Estrutura

- `src/backend`: API FastAPI e persistencia SQLite.
- `src/frontend`: Interface web e logica do jogo.

## Requisitos

- Python 3.11+

## Como executar

```bash
cd src/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Abra `http://127.0.0.1:8000` no navegador.

## Controles

- Aviao inferior: `4` esquerda, `5` tiro, `6` direita
- Aviao superior: `A` esquerda, `S` tiro, `D` direita
