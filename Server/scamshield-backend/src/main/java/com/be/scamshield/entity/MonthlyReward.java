package com.be.scamshield.entity;

import com.be.scamshield.constant.MonthlyRewardStatus;
import com.be.scamshield.constant.MonthlyRewardType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "monthly_rewards")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyReward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "reward_month", nullable = false)
    private java.time.LocalDate rewardMonth;

    @Column(name = "total_points", nullable = false)
    private Integer totalPoints;

    @Enumerated(EnumType.STRING)
    @Column(name = "reward_type")
    private MonthlyRewardType rewardType;

    @Column(name = "reward_value")
    private String rewardValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MonthlyRewardStatus status;

    @Column(name = "granted_at")
    private java.time.LocalDateTime grantedAt;

}
