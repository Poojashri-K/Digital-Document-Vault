package com.vault.exception;

public class RateLimitExceededException extends VaultException {
    public RateLimitExceededException(String message) {
        super(message);
    }
}
