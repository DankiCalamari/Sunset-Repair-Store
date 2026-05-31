from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(self, status_code: int, detail: str, code: str):
        super().__init__(status_code=status_code, detail={"detail": detail, "code": code})


def not_found(entity: str = "Resource") -> AppException:
    return AppException(status.HTTP_404_NOT_FOUND, f"{entity} not found", "NOT_FOUND")


def forbidden(message: str = "Permission denied") -> AppException:
    return AppException(status.HTTP_403_FORBIDDEN, message, "FORBIDDEN")


def conflict(message: str, code: str = "CONFLICT") -> AppException:
    return AppException(status.HTTP_409_CONFLICT, message, code)
