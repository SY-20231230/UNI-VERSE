package com.universe.report.service;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;

/** Domain failure mapped to the existing shared exception contract. */
public class ModerationException extends BusinessException {
    public enum Code {
        USER_NOT_FOUND, REPORT_NOT_FOUND, REFERENCE_NOT_FOUND, FORBIDDEN,
        INVALID_REPORT_TARGET, REPORT_ALREADY_PROCESSED, INVALID_SANCTION,
        INVALID_ACCOUNT_TRANSITION, TRADE_NOT_COMPLETED, SCORE_NOT_INITIALIZED,
        EVIDENCE_STORAGE_NOT_CONFIGURED, INVALID_EVIDENCE_URL, INVALID_SCORE_STATE
    }

    private final Code code;

    public ModerationException(Code code) {
        super(sharedCode(code));
        this.code = code;
    }

    private static ErrorCode sharedCode(Code code) {
        return switch (code) {
            case USER_NOT_FOUND -> ErrorCode.USER_NOT_FOUND;
            case REPORT_NOT_FOUND, REFERENCE_NOT_FOUND -> ErrorCode.NOT_FOUND;
            case FORBIDDEN -> ErrorCode.FORBIDDEN;
            default -> ErrorCode.INVALID_INPUT;
        };
    }

    public Code getCode() { return code; }
}
