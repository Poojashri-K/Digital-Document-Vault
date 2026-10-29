package com.vault.exception;

public class ResourceNotFoundException extends VaultException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
