package com.be.scamshield.exception;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(PartnerBusinessVerificationException.class)
    public ResponseEntity<BaseResponse<PartnerBusinessVerificationResponse>> handlePartnerBusinessVerification(
            PartnerBusinessVerificationException ex) {
        return ResponseEntity.status(ex.getHttpStatus())
                .body(new BaseResponse<>(false, ex.getMessage(), ex.getVerification()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<BaseResponse<Void>> handleInvalidParameterType(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest().body(new BaseResponse<>(false, "Tham số " + ex.getName() + " không đúng định dạng", null));
    }

    @ExceptionHandler(OtpRateLimitException.class)
    public ResponseEntity<BaseResponse<Void>> handleOtpRateLimit(OtpRateLimitException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(new BaseResponse<>(false, ex.getMessage(), null));
    }

    @ExceptionHandler(SmsProviderException.class)
    public ResponseEntity<BaseResponse<Void>> handleSmsProvider(SmsProviderException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new BaseResponse<>(false, ex.getMessage(), null));
    }

    @ExceptionHandler(DisputeStorageException.class)
    public ResponseEntity<BaseResponse<Void>> handleDisputeStorage(DisputeStorageException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new BaseResponse<>(false, ex.getMessage(), null));
    }

    @ExceptionHandler({RegistrationConflictException.class, DisputeConflictException.class, PartnerReviewConflictException.class,AbuseEscalationConflictException.class})
    public ResponseEntity<BaseResponse<Void>> handleConflict(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new BaseResponse<>(false, ex.getMessage(), null));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<BaseResponse<Void>> handleUploadSize(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new BaseResponse<>(false, "Tệp không được vượt quá 25MB và request không được vượt quá 80MB", null));
    }

    @ExceptionHandler({MissingServletRequestPartException.class, MissingServletRequestParameterException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<BaseResponse<Void>> handleMalformedRequest(Exception ex) {
        return ResponseEntity.badRequest().body(new BaseResponse<>(false, "Thiếu dữ liệu bắt buộc hoặc JSON không hợp lệ", null));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<BaseResponse<Void>> handleUnsupportedMediaType(HttpMediaTypeNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(new BaseResponse<>(false, "Content-Type không được hỗ trợ; kiểm tra định dạng request và các multipart part", null));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<BaseResponse<Object>> handleResourceNotFoundException(ResourceNotFoundException ex) {
        BaseResponse<Object> response = new BaseResponse<>(false, ex.getMessage(), null);
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<BaseResponse<Object>> handleBadRequestException(BadRequestException ex) {
        BaseResponse<Object> response = new BaseResponse<>(false, ex.getMessage(), null);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<BaseResponse<Object>> handleUnauthorizedException(UnauthorizedException ex) {
        BaseResponse<Object> response = new BaseResponse<>(false, ex.getMessage(), null);
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler({org.springframework.security.core.AuthenticationException.class, org.springframework.security.authentication.BadCredentialsException.class})
    public ResponseEntity<BaseResponse<Object>> handleBadCredentialsException(Exception ex) {
        BaseResponse<Object> response = new BaseResponse<>(false, "Invalid username/phone number or password", null);
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<BaseResponse<Map<String, String>>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        BaseResponse<Map<String, String>> response = new BaseResponse<>(false, "Validation Error", errors);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<BaseResponse<Map<String, String>>> handleConstraintViolation(jakarta.validation.ConstraintViolationException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getConstraintViolations().forEach(cv -> {
            String propertyPath = cv.getPropertyPath().toString();
            String field = propertyPath.substring(propertyPath.lastIndexOf('.') + 1);
            errors.put(field, cv.getMessage());
        });
        BaseResponse<Map<String, String>> response = new BaseResponse<>(false, "Validation Error", errors);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<BaseResponse<Object>> handleIllegalArgumentException(IllegalArgumentException ex) {
        BaseResponse<Object> response = new BaseResponse<>(false, ex.getMessage(), null);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<BaseResponse<Object>> handleResponseStatusException(org.springframework.web.server.ResponseStatusException ex) {
        BaseResponse<Object> response = new BaseResponse<>(false, ex.getReason() != null ? ex.getReason() : ex.getMessage(), null);
        return new ResponseEntity<>(response, ex.getStatusCode());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<BaseResponse<Object>> handleGlobalException(Exception ex) {
        ex.printStackTrace(); // Keep this for server logs
        BaseResponse<Object> response = new BaseResponse<>(false, "Lỗi máy chủ nội bộ. Vui lòng thử lại sau.", null);
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
