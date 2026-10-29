package com.vault.exception;

public class AccessDeniedCustomException extends VaultException {
    public AccessDeniedCustomException(String message) {
        super(message);
    }
}
