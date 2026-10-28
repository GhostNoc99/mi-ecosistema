# app/dependencies/headers.py
from fastapi import Header, HTTPException


CHANNELS_VALIDOS   = {"WEB", "MOV", "ZMA", "API", "BOT"}
DOC_TYPES_VALIDOS  = {"CC", "CE", "NIT", "PA", "TI"}


async def validate_enterprise_headers(
    x_rquid:              str = Header(..., alias="X-RqUID",
                                       description="ID único de la petición"),
    x_companyid:          str = Header(..., alias="X-CompanyId",
                                       description="ID de la compañía"),
    x_channel:            str = Header(..., alias="X-Channel",
                                       description="Canal de origen"),
    x_ipaddr:             str = Header("0.0.0.0", alias="X-IPAddr",
                                       description="IP del cliente"),
    x_govissueidenttype:  str = Header("CC", alias="X-GovIssueIdentType",
                                       description="Tipo de documento"),
    x_identserialnum:     str = Header("0",  alias="X-IdentSerialNum",
                                       description="Número de documento"),
) -> dict:

    # X-RqUID no puede estar vacío
    if not x_rquid.strip():
        raise HTTPException(
            status_code=400,
            detail={
                "responseCode": "30",
                "responseDescription": "X-RqUID no puede estar vacío"
            }
        )

    # X-CompanyId debe tener exactamente 4 caracteres
    if len(x_companyid.strip()) != 4:
        raise HTTPException(
            status_code=400,
            detail={
                "responseCode": "30",
                "responseDescription": "X-CompanyId debe tener exactamente 4 caracteres"
            }
        )

    # X-Channel debe ser uno de los permitidos
    if x_channel.upper() not in CHANNELS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail={
                "responseCode": "30",
                "responseDescription": f"X-Channel inválido. Permitidos: {CHANNELS_VALIDOS}"
            }
        )

    # X-GovIssueIdentType debe ser válido
    if x_govissueidenttype.upper() not in DOC_TYPES_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail={
                "responseCode": "30",
                "responseDescription": f"X-GovIssueIdentType inválido. Permitidos: {DOC_TYPES_VALIDOS}"
            }
        )

    return {
        "X-RqUID":             x_rquid,
        "X-CompanyId":         x_companyid,
        "X-Channel":           x_channel.upper(),
        "X-IPAddr":            x_ipaddr,
        "X-GovIssueIdentType": x_govissueidenttype.upper(),
        "X-IdentSerialNum":    x_identserialnum,
    }