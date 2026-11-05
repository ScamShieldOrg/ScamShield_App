package com.be.scamshield.serviceImpl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.assertThat;

class NotificationStreamServiceTest {
    private NotificationStreamService service;
    @AfterEach void cleanup() { if (service != null) service.shutdown(); }
    @Test
    void sendsOnlyToRecipientAfterCommitAndNotBeforeCommit() throws Exception {
        try (var constructed = mockConstruction(SseEmitter.class)) {
            service = new NotificationStreamService();
            SseEmitter first = service.subscribe(1L);
            SseEmitter second = service.subscribe(2L);
            verify(first, timeout(1000)).send(any(SseEmitter.SseEventBuilder.class));
            TransactionSynchronizationManager.initSynchronization();
            try {
                service.changedAfterCommit(1L);
                verify(first, times(1)).send(any(SseEmitter.SseEventBuilder.class));
                var callbacks = TransactionSynchronizationManager.getSynchronizations();
                assertThat(callbacks).hasSize(1);
                callbacks.forEach(callback -> callback.afterCommit());
                verify(first, timeout(1000).times(2)).send(any(SseEmitter.SseEventBuilder.class));
                verify(second, timeout(1000).times(1)).send(any(SseEmitter.SseEventBuilder.class));
            } finally { TransactionSynchronizationManager.clearSynchronization(); }
        }
    }

    @Test
    void rollbackDoesNotPublish() throws Exception {
        try (var constructed = mockConstruction(SseEmitter.class)) {
            service = new NotificationStreamService();
            SseEmitter stream = service.subscribe(1L);
            verify(stream, timeout(1000)).send(any(SseEmitter.SseEventBuilder.class));
            TransactionSynchronizationManager.initSynchronization();
            try {
                service.changedAfterCommit(1L);
                TransactionSynchronizationManager.getSynchronizations().forEach(callback -> callback.afterCompletion(1));
                verify(stream, times(1)).send(any(SseEmitter.SseEventBuilder.class));
            } finally { TransactionSynchronizationManager.clearSynchronization(); }
        }
    }
}
