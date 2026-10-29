package com.vault.exception;

public class UserAlreadyExistsException extends VaultException {
    public UserAlreadyExistsException(String message) {
        super(message);
    }
}
