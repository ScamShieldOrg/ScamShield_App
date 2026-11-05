package com.be.scamshield.serviceImpl;

import com.be.scamshield.entity.Notification;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostUpdate;
import jakarta.persistence.PostRemove;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.ObjectProvider;

@Component
@RequiredArgsConstructor
public class NotificationRealtimeListener {
    private final ObjectProvider<NotificationStreamService> streams;

    @PostPersist @PostUpdate @PostRemove
    public void changed(Notification notification) {
        if (notification.getUser() != null && notification.getUser().getId() != null) {
            streams.ifAvailable(service -> service.changedAfterCommit(notification.getUser().getId()));
        }
    }
}
