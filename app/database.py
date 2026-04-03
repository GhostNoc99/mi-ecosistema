import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Lee la URL desde la variable de entorno que definimos en docker-compose
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@db:5432/mydb"
)

# Motor de conexión con la BD
engine = create_engine(DATABASE_URL)

# Fábrica de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency — FastAPI llama esto en cada request
def get_db():
    db = SessionLocal()
    try:
        yield db       # entrega la sesión al endpoint
    finally:
        db.close()     # siempre cierra al terminar