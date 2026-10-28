# app/schemas/common.py
from pydantic import BaseModel
from typing import Any, Optional


class ResponseHeader(BaseModel):
    rqUID: str
    responseCode: str
    responseDescription: str


class StandardResponse(BaseModel):
    responseHeader: ResponseHeader
    payLoad: Optional[Any] = None


# Códigos de respuesta estándar
class RC:
    OK           = ("00", "Exitoso")
    CREATED      = ("01", "Recurso creado exitosamente")
    NOT_FOUND    = ("10", "Recurso no encontrado")
    INVALID_DATA = ("20", "Datos de entrada inválidos")
    HEADER_ERROR = ("30", "Headers requeridos ausentes o inválidos")
    DB_ERROR     = ("50", "Error de conexión con la base de datos")
    UNKNOWN      = ("99", "Error interno del servidor")


def build_response(rc: tuple, rqUID: str, payload: Any = None) -> dict:
    return {
        "responseHeader": {
            "rqUID": rqUID,
            "responseCode": rc[0],
            "responseDescription": rc[1]
        },
        "payLoad": payload
    }