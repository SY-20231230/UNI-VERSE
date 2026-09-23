package com.universe.report.service;

/** Domain failures; the shared exception handler must map these before REST integration. */
public class ModerationException extends RuntimeException {
    public enum Code {
        USER_NOT_FOUND, REPORT_NOT_FOUND, REFERENCE_NOT_FOUND, FORBIDDEN,
        INVALID_REPORT_TARGET, REPORT_ALREADY_PROCESSED, INVALID_SANCTION,
        INVALID_ACCOUNT_TRANSITION, TRADE_NOT_COMPLETED, SCORE_NOT_INITIALIZED,
        EVIDENCE_STORAGE_NOT_CONFIGURED, INVALID_EVIDENCE_URL, INVALID_SCORE_STATE
    }

    private final Code code;

    public ModerationException(Code code) {
        super(code.name());
        this.code = code;
    }

    public Code getCode() { return code; }
}
