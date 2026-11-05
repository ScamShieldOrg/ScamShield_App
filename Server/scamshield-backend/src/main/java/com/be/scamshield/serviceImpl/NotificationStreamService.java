package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.BaseResponse;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NotificationStreamService {
    private final ThreadPoolExecutor delivery = new ThreadPoolExecutor(2, 4, 30, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(128), task -> {
                Thread thread = new Thread(task, "notification-delivery");
                thread.setDaemon(true);
                return thread;
            }, new ThreadPoolExecutor.AbortPolicy());
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(task -> {
        Thread thread = new Thread(task, "notification-heartbeat");
        thread.setDaemon(true);
        return thread;
    });

    @PostConstruct
    public void startHeartbeat() { scheduler.scheduleWithFixedDelay(this::heartbeat, 15, 15, TimeUnit.SECONDS); }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdownNow();
        delivery.shutdownNow();
        connections.values().forEach(clients -> clients.forEach(SseEmitter::complete));
        connections.clear();
    }

    private final ConcurrentHashMap<Long, Set<SseEmitter>> connections = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(60_000L);
        connections.compute(userId, (id, clients) -> {
            if (clients == null) clients = ConcurrentHashMap.newKeySet();
            clients.add(emitter);
            return clients;
        });
        Runnable cleanup = () -> connections.computeIfPresent(userId, (id, clients) -> {
            clients.remove(emitter);
            return clients.isEmpty() ? null : clients;
        });
        emitter.onCompletion(cleanup);
        emitter.onTimeout(() -> { cleanup.run(); emitter.complete(); });
        emitter.onError(ignored -> cleanup.run());
        send(userId, emitter, "notifications-changed");
        return emitter;
    }

    public void changedAfterCommit(Long userId) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { publish(userId); }
            });
        } else {
            publish(userId);
        }
    }

    private void publish(Long userId) {
        Set<SseEmitter> clients = connections.get(userId);
        if (clients != null) clients.forEach(client -> send(userId, client, "notifications-changed"));
    }

    public void heartbeat() {
        connections.forEach((id, clients) -> clients.forEach(client -> send(id, client, "heartbeat")));
    }

    private void send(Long userId, SseEmitter emitter, String event) {
        try {
            delivery.execute(() -> sendNow(userId, emitter, event));
        } catch (RejectedExecutionException overloaded) {
            // The client reconnects and reloads the authoritative list when delivery is saturated.
            emitter.complete();
        }
    }

    private void sendNow(Long userId, SseEmitter emitter, String event) {
        try {
            emitter.send(SseEmitter.event().name(event)
                    .data(new BaseResponse<Void>(true, "Cập nhật thông báo", null)));
        } catch (IOException | IllegalStateException error) {
            connections.computeIfPresent(userId, (id, clients) -> {
                clients.remove(emitter);
                return clients.isEmpty() ? null : clients;
            });
            emitter.completeWithError(error);
        }
    }
}
