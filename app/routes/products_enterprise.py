# app/routes/products_enterprise.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from pydantic import BaseModel, field_validator
from typing import Optional

from models.product import Product
from database import get_db
from dependencies.headers import validate_enterprise_headers
from schemas.common import RC, build_response

PREFIX = "/backfront/backendforfrontend/mec/orq/productos/v1/gestion"

router = APIRouter(prefix=PREFIX, tags=["Productos — Enterprise"])


# ── Schemas ──────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float
    stock: Optional[int] = 0

    @field_validator("name")
    @classmethod
    def name_no_vacio(cls, v):
        if not v.strip():
            raise ValueError("El campo 'name' no puede estar vacío")
        return v

    @field_validator("price")
    @classmethod
    def price_positivo(cls, v):
        if v < 0:
            raise ValueError("El campo 'price' debe ser mayor o igual a 0")
        return v


class ProductIdRequest(BaseModel):
    productId: int


# ── GET consultarProductos ────────────────────────────────
@router.get("/consultarProductos", status_code=200)
def consultar_productos(
    headers: dict = Depends(validate_enterprise_headers),
    db: Session = Depends(get_db)
):
    try:
        productos = db.query(Product).all()
        payload = [
            {
                "id":          p.id,
                "name":        p.name,
                "description": p.description,
                "price":       p.price,
                "stock":       p.stock
            }
            for p in productos
        ]
        return build_response(RC.OK, headers["X-RqUID"], payload)

    except OperationalError:
        raise HTTPException(
            status_code=500,
            detail=build_response(RC.DB_ERROR, headers["X-RqUID"])
        )


# ── POST consultarProducto (por ID en body) ───────────────
@router.post("/consultarProducto", status_code=200)
def consultar_producto(
    body: ProductIdRequest,
    headers: dict = Depends(validate_enterprise_headers),
    db: Session = Depends(get_db)
):
    try:
        producto = db.query(Product).filter(Product.id == body.productId).first()

        if not producto:
            raise HTTPException(
                status_code=404,
                detail=build_response(
                    RC.NOT_FOUND,
                    headers["X-RqUID"],
                    {"productId": body.productId}
                )
            )

        payload = {
            "id":          producto.id,
            "name":        producto.name,
            "description": producto.description,
            "price":       producto.price,
            "stock":       producto.stock
        }
        return build_response(RC.OK, headers["X-RqUID"], payload)

    except HTTPException:
        raise
    except OperationalError:
        raise HTTPException(
            status_code=500,
            detail=build_response(RC.DB_ERROR, headers["X-RqUID"])
        )


# ── POST crearProducto ────────────────────────────────────
@router.post("/crearProducto", status_code=201)
def crear_producto(
    body: ProductCreate,
    headers: dict = Depends(validate_enterprise_headers),
    db: Session = Depends(get_db)
):
    try:
        nuevo = Product(**body.model_dump())
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)

        payload = {
            "id":          nuevo.id,
            "name":        nuevo.name,
            "description": nuevo.description,
            "price":       nuevo.price,
            "stock":       nuevo.stock
        }
        return build_response(RC.CREATED, headers["X-RqUID"], payload)

    except OperationalError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=build_response(RC.DB_ERROR, headers["X-RqUID"])
        )


# ── DELETE eliminarProducto ───────────────────────────────
@router.delete("/eliminarProducto", status_code=200)
def eliminar_producto(
    body: ProductIdRequest,
    headers: dict = Depends(validate_enterprise_headers),
    db: Session = Depends(get_db)
):
    try:
        producto = db.query(Product).filter(Product.id == body.productId).first()

        if not producto:
            raise HTTPException(
                status_code=404,
                detail=build_response(
                    RC.NOT_FOUND,
                    headers["X-RqUID"],
                    {"productId": body.productId}
                )
            )

        db.delete(producto)
        db.commit()

        return build_response(
            RC.OK,
            headers["X-RqUID"],
            {"productId": body.productId, "eliminado": True}
        )

    except HTTPException:
        raise
    except OperationalError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=build_response(RC.DB_ERROR, headers["X-RqUID"])
        )