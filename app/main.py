from fastapi import FastAPI
from models.product import Base
from database import engine
from routes import products

# Crea la tabla en PostgreSQL automáticamente al iniciar
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Mi Ecosistema API",
    description="API para prácticas de performance con JMeter y k6",
    version="1.0.0"
)

app.include_router(products.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "mi-ecosistema-api"}