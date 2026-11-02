package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.EvidenceVerificationStatus;
import java.util.Locale;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.mockito.Mockito.when;
import com.be.scamshield.constant.AbuseEscalationDecision;
import com.be.scamshield.dto.request.DecideAbuseEscalationRequest;
import com.be.scamshield.entity.Role;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.exception.AbuseEscalationConflictException;
import com.be.scamshield.constant.AbuseFlagStatus;
import com.be.scamshield.dto.admin.AdminAbuseEscalationFilterRequest;
import com.be.scamshield.entity.AbuseFlag;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.ModerationAction;
import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.ReportEvidence;
import com.be.scamshield.entity.ScamCategory;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.service.IAdminAbuseEscalationService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.NullSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest(showSql = false, properties = {
        "spring.test.database.replace=none",
        "spring.datasource.url=jdbc:h2:mem:admin-abuse-queue-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.jpa.properties.hibernate.hbm2ddl.halt_on_error=true"
})
@Import(AdminAbuseEscalationServiceImpl.class)
@ActiveProfiles("test")
class AdminAbuseEscalationPersistenceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 28, 9, 0);

    @Autowired private IAdminAbuseEscalationService service;
    @Autowired private EntityManager entityManager;
    @MockitoBean private Clock applicationClock;
    private User target;
    private User other;
    private User moderator;

    @BeforeEach
    void setUp() {
        when(applicationClock.instant()).thenReturn(Instant.parse("2026-10-29T02:00:00Z"));
        when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        target = account("Trần Minh Khôi", "khoi.tran@example.test", "0912345601");
        other = account("Lê Thanh Hà", "ha.le@example.test", "0912345602");
        moderator = account("Mai Phương", "moderator@example.test", "0912345603");
    }

    private User administrator() {
        Role role = new Role();
        role.setName("ADMINISTRATOR");
        entityManager.persist(role);
        User admin = account("Administrator", "decision-admin@example.test", "0912345699");
        admin.setRole(role);
        return admin;
    }

    @ParameterizedTest
    @ValueSource(strings = {"DISMISS", "FLAG", "SUSPEND", "BAN"})
    void decisionUpdatesCaseAccountAndAuditsAtomically(String rawDecision) {
        User admin = administrator();
        AbuseFlag pending = flag(target, "PENDING", NOW);
        Long caseId = pending.getId();
        UserPrincipal principal = UserPrincipal.create(admin);
        flushAndClear();
        var decision = AbuseEscalationDecision.valueOf(rawDecision);
        var result = service.decideEscalation(caseId, new DecideAbuseEscalationRequest(decision,
                "  Đã đối chiếu đầy đủ bằng chứng liên quan tới hành vi lạm dụng.  "), principal);
        entityManager.flush();
        assertThat(result.getStatus()).isEqualTo(decision == AbuseEscalationDecision.DISMISS
                ? AbuseFlagStatus.DISMISSED : AbuseFlagStatus.OPEN);
        String expectedStatus = switch (decision) {
            case SUSPEND -> "SUSPENDED";
            case BAN -> "BANNED";
            default -> "ACTIVE";
        };
        assertThat(result.getUserStatus()).isEqualTo(expectedStatus);
        var audits = entityManager.createQuery("select a from AuditLog a where a.entityType = 'ABUSE_FLAG' and a.entityId = :id", AuditLog.class)
                .setParameter("id", caseId).getResultList();
        assertThat(audits).singleElement().satisfies(audit -> {
            assertThat(audit.getActorUser().getId()).isEqualTo(principal.getId());
            assertThat(audit.getAction()).isEqualTo("DECIDE_ABUSE_ESCALATION_" + rawDecision);
            assertThat(audit.getReason()).doesNotStartWith(" ").doesNotEndWith(" ");
        });
        assertThatThrownBy(() -> service.decideEscalation(caseId,
                new DecideAbuseEscalationRequest(decision, "Đã đối chiếu đầy đủ bằng chứng liên quan."), principal))
                .isInstanceOf(AbuseEscalationConflictException.class);
    }

    @Test
    void suspendNeverDowngradesBannedAccount() {
        User admin = administrator();
        target.setStatus("BANNED");
        AbuseFlag pending = flag(target, "PENDING", NOW);
        UserPrincipal principal = UserPrincipal.create(admin);
        flushAndClear();
        assertThatThrownBy(() -> service.decideEscalation(pending.getId(),
                new DecideAbuseEscalationRequest(AbuseEscalationDecision.SUSPEND, "Đã xác minh đủ bằng chứng liên quan."), principal))
                .isInstanceOf(AbuseEscalationConflictException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"DISMISS", "FLAG"})
    void nonRestrictiveDecisionPreservesExistingBan(String decision) {
        User admin = administrator();
        target.setStatus("BANNED");
        AbuseFlag pending = flag(target, "PENDING", NOW);
        UserPrincipal principal = UserPrincipal.create(admin);
        flushAndClear();
        var result = service.decideEscalation(pending.getId(),
                new DecideAbuseEscalationRequest(AbuseEscalationDecision.valueOf(decision), "Đã xác minh đủ bằng chứng liên quan."), principal);
        assertThat(result.getUserStatus()).isEqualTo("BANNED");
    }

    @Test
    void adminCannotSuspendSelf() {
        User admin = administrator();
        AbuseFlag pending = flag(admin, "PENDING", NOW);
        UserPrincipal principal = UserPrincipal.create(admin);
        flushAndClear();
        assertThatThrownBy(() -> service.decideEscalation(pending.getId(),
                new DecideAbuseEscalationRequest(AbuseEscalationDecision.BAN, "Đã xác minh đủ bằng chứng liên quan."), principal))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void rejectsReasonThatIsTooShortAfterStripping() {
        User admin = administrator();
        AbuseFlag pending = flag(target, "PENDING", NOW);
        assertThatThrownBy(() -> service.decideEscalation(pending.getId(),
                new DecideAbuseEscalationRequest(AbuseEscalationDecision.FLAG, "                     ngắn "), UserPrincipal.create(admin)))
                .isInstanceOf(BadRequestException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"OPEN", "DISMISSED", "RESOLVED"})
    void onlyPendingCaseCanReceiveDecision(String status) {
        User admin = administrator();
        AbuseFlag selected = flag(target, status, NOW);
        UserPrincipal principal = UserPrincipal.create(admin);
        flushAndClear();
        assertThatThrownBy(() -> service.decideEscalation(selected.getId(),
                new DecideAbuseEscalationRequest(AbuseEscalationDecision.FLAG, "Đã xác minh đủ bằng chứng liên quan."), principal))
                .isInstanceOf("RESOLVED".equals(status) ? ResourceNotFoundException.class : AbuseEscalationConflictException.class);
    }

    @Test
    void detailCombinesSelectedReportsEvidenceLatestModerationAccountAndScopedAudit() {
        target.setStatus("SUSPENDED");
        target.setIsPhoneVerified(true);
        target.setReputationPoints(120);
        target.setCreatedAt(NOW.minusDays(90));
        Report rejected = report(target, "reported.example");
        rejected.setCreatedAt(NOW.minusHours(1));
        rejected.setDescription("Mô tả báo cáo cần đối chiếu");
        rejected.setReportedMessage("Tin nhắn yêu cầu chuyển tiền");
        rejected.getIndicator().setDisplayValue("https://reported.example");
        ScamCategory category = ScamCategory.builder().code("ABUSE_TEST").name("Giả mạo")
                .version(1).isActive(true).createdAt(NOW).updatedAt(NOW).build();
        entityManager.persist(category);
        rejected.setCategory(category);
        Report pending = report(target, "pending.example");
        pending.setIndicator(rejected.getIndicator());
        pending.setCreatedAt(NOW.minusHours(2));
        pending.setStatus("PENDING");
        Report outsideWindow = report(target, "old.example");
        outsideWindow.setCreatedAt(NOW.minusHours(25));
        Report afterEscalation = report(target, "future.example");
        afterEscalation.setCreatedAt(NOW.plusHours(1));
        Report foreign = report(other, "foreign.example");

        AbuseFlag selected = flag(target, "PENDING", NOW);
        selected.setReport(rejected);
        selected.setRelatedReports(new ArrayList<>(List.of(pending, rejected)));
        AbuseFlag anotherCase = flag(other, "OPEN", NOW);
        ReportEvidence firstEvidence = evidence(rejected, "first.png");
        ReportEvidence secondEvidence = evidence(rejected, "second.png");
        evidence(foreign, "private.png");
        moderation(rejected, "Ancient decision", NOW.minusHours(1));
        moderation(rejected, "Earlier decision at same time", NOW.minusMinutes(15));
        ModerationAction latest = moderation(rejected, "Latest decision at same time", NOW.minusMinutes(15));
        moderation(foreign, "Another user's decision", NOW);
        AuditLog firstAudit = audit(selected.getId(), "ABUSE_FLAG", moderator, "CREATE_ABUSE_ESCALATION");
        AuditLog latestAudit = audit(selected.getId(), "ABUSE_FLAG", null, "SYSTEM_NOTE");
        audit(anotherCase.getId(), "ABUSE_FLAG", moderator, "ANOTHER_CASE");
        audit(selected.getId(), "USER", moderator, "UNRELATED_ENTITY");
        flushAndClear();

        var detail = service.getEscalationById(selected.getId());
        assertThat(detail.getEscalation().getUserId()).isEqualTo(target.getId());
        assertThat(detail.getEscalation().getStatus()).isEqualTo(AbuseFlagStatus.PENDING);
        assertThat(detail.getEscalation().getUserStatus()).isEqualTo("SUSPENDED");
        assertThat(detail.getEscalation().getReportIds()).containsExactly(rejected.getId(), pending.getId());
        assertThat(detail.getAccountDetails().getPhoneVerified()).isTrue();
        assertThat(detail.getAccountDetails().getReputationPoints()).isEqualTo(120);
        assertThat(detail.getAccountDetails().getJoinedAt()).isEqualTo(NOW.minusDays(90));
        assertThat(detail.getActivity().getWindowStart()).isEqualTo(NOW.minusHours(24));
        assertThat(detail.getActivity().getWindowEnd()).isEqualTo(NOW);
        assertThat(detail.getActivity().getTotalReports()).isEqualTo(2);
        assertThat(detail.getActivity().getRejectedReports()).isEqualTo(1);
        assertThat(detail.getActivity().getDistinctIndicators()).isEqualTo(1);
        assertThat(detail.getActivity().getRejectedPercentage()).isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(detail.getReports()).hasSize(2);
        var first = detail.getReports().getFirst();
        assertThat(first.getId()).isEqualTo(rejected.getId());
        assertThat(first.getReportCode()).isEqualTo("RPT-" + rejected.getId());
        assertThat(first.getTargetValue()).isEqualTo("https://reported.example");
        assertThat(first.getCategoryName()).isEqualTo("Giả mạo");
        assertThat(first.getDescription()).isEqualTo("Mô tả báo cáo cần đối chiếu");
        assertThat(first.getReportedMessage()).isEqualTo("Tin nhắn yêu cầu chuyển tiền");
        assertThat(first.getLatestModeration().getId()).isEqualTo(latest.getId());
        assertThat(first.getLatestModeration().getReason()).isEqualTo("Latest decision at same time");
        assertThat(first.getLatestModeration().getModeratorName()).isEqualTo("Mai Phương");
        assertThat(first.getEvidences()).extracting(item -> item.getId()).containsExactly(firstEvidence.getId(), secondEvidence.getId());
        assertThat(first.getEvidences().getFirst().getFileUrl()).isEqualTo("https://files.example.test/first.png");
        assertThat(detail.getReports().get(1).getLatestModeration()).isNull();
        assertThat(detail.getReports().get(1).getEvidences()).isEmpty();
        assertThat(detail.getAuditTrail()).extracting(item -> item.getId()).containsExactly(latestAudit.getId(), firstAudit.getId());
        assertThat(detail.getAuditTrail().getFirst().getActorUserId()).isNull();
        assertThat(detail.getAuditTrail().get(1).getActorName()).isEqualTo("Mai Phương");
    }

    @Test
    void activityIncludesWindowBoundariesAndRoundsPercentageWithoutCountingOtherUsers() {
        Report start = report(target, "start.example");
        start.setCreatedAt(NOW.minusHours(24));
        Report end = report(target, "end.example");
        end.setCreatedAt(NOW);
        end.setIndicator(start.getIndicator());
        end.setStatus("PENDING");
        Report middle = report(target, "middle.example");
        middle.setCreatedAt(NOW.minusHours(4));
        middle.setStatus("APPROVED");
        report(target, "too-old.example").setCreatedAt(NOW.minusHours(24).minusSeconds(1));
        report(target, "too-new.example").setCreatedAt(NOW.plusSeconds(1));
        report(other, "other.example");
        AbuseFlag selected = flag(target, "OPEN", NOW);
        flushAndClear();

        var activity = service.getEscalationById(selected.getId()).getActivity();
        assertThat(activity.getTotalReports()).isEqualTo(3);
        assertThat(activity.getRejectedReports()).isEqualTo(1);
        assertThat(activity.getDistinctIndicators()).isEqualTo(2);
        assertThat(activity.getRejectedPercentage()).isEqualByComparingTo(new BigDecimal("33.33"));
    }

    @Test
    void detailSupportsLegacyPrimaryReportWithoutCreatorCategoryEvidenceOrAudit() {
        Report legacy = report(target, "legacy-detail.example");
        AbuseFlag selected = flag(target, "OPEN", NOW);
        selected.setReport(legacy);
        selected.setCreatedBy(null);
        selected.setFlagType("SPAM");
        flushAndClear();
        var detail = service.getEscalationById(selected.getId());
        assertThat(detail.getEscalation().getCreatedByUserId()).isNull();
        assertThat(detail.getEscalation().getFlagType()).isEqualTo("SPAM");
        assertThat(detail.getEscalation().getReportIds()).containsExactly(legacy.getId());
        assertThat(detail.getReports()).singleElement().satisfies(item -> {
            assertThat(item.getTargetValue()).isEqualTo("legacy-detail.example");
            assertThat(item.getCategoryId()).isNull();
            assertThat(item.getLatestModeration()).isNull();
            assertThat(item.getEvidences()).isEmpty();
        });
        assertThat(detail.getAuditTrail()).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"PENDING", "OPEN", "DISMISSED"})
    void detailSupportsEachCurrentStatusAndEmptyCollections(String status) {
        AbuseFlag selected = flag(target, status, NOW);
        flushAndClear();
        var detail = service.getEscalationById(selected.getId());
        assertThat(detail.getEscalation().getStatus()).isEqualTo(AbuseFlagStatus.valueOf(status));
        assertThat(detail.getEscalation().getReportIds()).isEmpty();
        assertThat(detail.getReports()).isEmpty();
        assertThat(detail.getAuditTrail()).isEmpty();
        assertThat(detail.getActivity().getTotalReports()).isZero();
        assertThat(detail.getActivity().getRejectedReports()).isZero();
        assertThat(detail.getActivity().getDistinctIndicators()).isZero();
        assertThat(detail.getActivity().getRejectedPercentage()).isNull();
    }

    @Test
    void detailNeverAttributesForeignReportLinksOrEvidenceToTargetAccount() {
        Report owned = report(target, "owned-detail.example");
        Report foreign = report(other, "foreign-detail.example");
        evidence(foreign, "foreign.png");
        AbuseFlag selected = flag(target, "PENDING", NOW);
        selected.setReport(foreign);
        selected.setRelatedReports(new ArrayList<>(List.of(owned, foreign)));
        flushAndClear();
        var detail = service.getEscalationById(selected.getId());
        assertThat(detail.getEscalation().getReportIds()).containsExactly(owned.getId());
        assertThat(detail.getReports()).singleElement().satisfies(item -> {
            assertThat(item.getId()).isEqualTo(owned.getId());
            assertThat(item.getEvidences()).isEmpty();
        });
        assertThat(detail.getActivity().getTotalReports()).isEqualTo(1);
    }

    @Test
    void reportsOutsideActivityWindowCanStillServeAsLinkedEvidence() {
        Report old = report(target, "old-detail.example");
        old.setCreatedAt(NOW.minusHours(25));
        AbuseFlag selected = flag(target, "OPEN", NOW);
        selected.setReport(old);
        flushAndClear();
        var detail = service.getEscalationById(selected.getId());
        assertThat(detail.getReports()).hasSize(1);
        assertThat(detail.getActivity().getTotalReports()).isZero();
        assertThat(detail.getActivity().getRejectedPercentage()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"RESOLVED", "UNSUPPORTED"})
    void detailRejectsStatusesNotSupportedByQueue(String status) {
        AbuseFlag selected = flag(target, status, NOW);
        flushAndClear();
        assertThatThrownBy(() -> service.getEscalationById(selected.getId())).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void missingCaseAndCaseWithoutAccountAreNotFound() {
        AbuseFlag orphan = flag(null, "PENDING", NOW);
        flushAndClear();
        assertThatThrownBy(() -> service.getEscalationById(orphan.getId())).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.getEscalationById(Long.MAX_VALUE)).isInstanceOf(ResourceNotFoundException.class);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {0, -1})
    void detailRejectsNonPositiveOrNullId(Long id) {
        assertThatThrownBy(() -> service.getEscalationById(id)).isInstanceOf(BadRequestException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"PENDING", "VERIFIED", "REJECTED", "OCR_PASS", " verified ", "LEGACY_UNKNOWN"})
    void detailMapsStringEvidenceStatusWithoutChangingStoredValue(String storedStatus) {
        Report linked = report(target, "enum-evidence.example");
        AbuseFlag selected = flag(target, "PENDING", NOW);
        selected.setReport(linked);
        ReportEvidence attached = evidence(linked, "status.png");
        attached.setVerificationStatus(storedStatus);
        flushAndClear();

        var response = service.getEscalationById(selected.getId()).getReports().getFirst().getEvidences().getFirst();
        if ("LEGACY_UNKNOWN".equals(storedStatus) || "OCR_PASS".equals(storedStatus)) {
            assertThat(response.getVerificationStatus()).isNull();
        } else {
            assertThat(response.getVerificationStatus()).isEqualTo(
                    EvidenceVerificationStatus.valueOf(storedStatus.trim().toUpperCase(Locale.ROOT)));
        }
        assertThat(entityManager.find(ReportEvidence.class, attached.getId()).getVerificationStatus()).isEqualTo(storedStatus);
    }

    private ReportEvidence evidence(Report report, String fileName) {
        ReportEvidence evidence = ReportEvidence.builder().report(report).evidenceType("IMAGE").fileName(fileName)
                .fileUrl("https://files.example.test/" + fileName).verificationStatus(EvidenceVerificationStatus.PENDING.name()).createdAt(NOW).build();
        entityManager.persist(evidence);
        return evidence;
    }

    private ModerationAction moderation(Report report, String reason, LocalDateTime createdAt) {
        ModerationAction action = ModerationAction.builder().report(report).moderatorUser(moderator)
                .action("REJECT").reason(reason).createdAt(createdAt).build();
        entityManager.persist(action);
        return action;
    }

    private AuditLog audit(Long entityId, String entityType, User actor, String action) {
        AuditLog log = AuditLog.builder().entityId(entityId).entityType(entityType).actorUser(actor).action(action)
                .reason("Lý do ghi nhận trong nhật ký").previousValue("PENDING").newValue("OPEN")
                .ipHash("internal-ip-hash").requestId("internal-request-id").createdAt(NOW).build();
        entityManager.persist(log);
        return log;
    }

    @Test
    void defaultPendingQueueIncludesAllAccountsWithStablePaginationAndNoDuplicateCounts() {
        AbuseFlag oldest = flag(target, "PENDING", NOW.minusDays(1));
        AbuseFlag firstAtSameTime = flag(other, "PENDING", NOW);
        AbuseFlag secondAtSameTime = flag(target, "PENDING", NOW);
        Report firstReport = report(target, "first.example");
        Report secondReport = report(target, "second.example");
        secondAtSameTime.setReport(firstReport);
        secondAtSameTime.setRelatedReports(new ArrayList<>(List.of(secondReport, firstReport)));
        flag(target, "OPEN", NOW.plusDays(1));
        flag(target, "DISMISSED", NOW.plusDays(1));
        flag(target, "RESOLVED", NOW.plusDays(1));
        flag(null, "PENDING", NOW.plusDays(1));
        flushAndClear();

        AdminAbuseEscalationFilterRequest filter = new AdminAbuseEscalationFilterRequest();
        filter.setSize(2);
        var firstPage = service.getEscalations(filter);
        assertThat(firstPage.getTotalItems()).isEqualTo(3);
        assertThat(firstPage.getTotalPages()).isEqualTo(2);
        assertThat(firstPage.isHasNext()).isTrue();
        assertThat(firstPage.getData()).extracting(item -> item.getId())
                .containsExactly(secondAtSameTime.getId(), firstAtSameTime.getId());
        assertThat(firstPage.getData().getFirst().getReportIds()).containsExactly(firstReport.getId(), secondReport.getId());
        assertThat(firstPage.getData().getFirst().getCreatedByName()).isEqualTo("Mai Phương");
        assertThat(firstPage.getData().get(1).getUserId()).isEqualTo(other.getId());

        filter.setPage(1);
        var secondPage = service.getEscalations(filter);
        assertThat(secondPage.getData()).extracting(item -> item.getId()).containsExactly(oldest.getId());
        assertThat(secondPage.getTotalItems()).isEqualTo(3);
        assertThat(secondPage.isHasPrevious()).isTrue();
        assertThat(secondPage.isHasNext()).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"priority,desc", "priority,asc"})
    void priorityOrderUsesSeverityBeforePaginationWithStableTiesAndUnknownValuesLast(String sort) {
        AbuseFlag low = flag(target, "PENDING", NOW.plusDays(2));
        low.setSeverity("LOW");
        AbuseFlag medium = flag(target, "PENDING", NOW);
        medium.setSeverity("MEDIUM");
        AbuseFlag oldHigh = flag(target, "PENDING", NOW.minusDays(5));
        oldHigh.setSeverity(" high ");
        AbuseFlag firstHighAtSameTime = flag(other, "PENDING", NOW.minusDays(1));
        firstHighAtSameTime.setSeverity("HIGH");
        AbuseFlag secondHighAtSameTime = flag(target, "PENDING", NOW.minusDays(1));
        secondHighAtSameTime.setSeverity("HIGH");
        AbuseFlag unknown = flag(target, "PENDING", NOW.plusDays(3));
        unknown.setSeverity("LEGACY_UNKNOWN");
        flag(other, "OPEN", NOW.plusDays(4)).setSeverity("HIGH");
        flushAndClear();

        List<Long> expected = sort.endsWith("desc")
                ? List.of(secondHighAtSameTime.getId(), firstHighAtSameTime.getId(), oldHigh.getId(), medium.getId(), low.getId(), unknown.getId())
                : List.of(low.getId(), medium.getId(), secondHighAtSameTime.getId(), firstHighAtSameTime.getId(), oldHigh.getId(), unknown.getId());
        AdminAbuseEscalationFilterRequest filter = new AdminAbuseEscalationFilterRequest();
        filter.setSort(sort);
        filter.setSize(2);
        List<Long> actual = new ArrayList<>();
        for (int page = 0; page < 3; page++) {
            filter.setPage(page);
            var result = service.getEscalations(filter);
            assertThat(result.getTotalItems()).isEqualTo(6);
            assertThat(result.getTotalPages()).isEqualTo(3);
            actual.addAll(result.getData().stream().map(item -> item.getId()).toList());
        }
        assertThat(actual).containsExactlyElementsOf(expected);

        filter.setSearch(target.getEmail());
        filter.setPage(0);
        filter.setSize(20);
        assertThat(service.getEscalations(filter).getData()).extracting(item -> item.getId())
                .containsExactlyElementsOf(expected.stream().filter(id -> !id.equals(firstHighAtSameTime.getId())).toList());
    }

    @Test
    void creationTimeCanBeSortedAscendingWithDeterministicIdTies() {
        AbuseFlag old = flag(target, "PENDING", NOW.minusDays(2));
        AbuseFlag first = flag(target, "PENDING", NOW);
        AbuseFlag second = flag(other, "PENDING", NOW);
        flushAndClear();
        AdminAbuseEscalationFilterRequest filter = new AdminAbuseEscalationFilterRequest();
        filter.setSort("createdAt,asc");
        assertThat(service.getEscalations(filter).getData()).extracting(item -> item.getId())
                .containsExactly(old.getId(), second.getId(), first.getId());
    }

    @ParameterizedTest
    @ValueSource(strings = {"PENDING", "OPEN", "DISMISSED"})
    void filtersEachSupportedStatus(String status) {
        flag(target, "PENDING", NOW);
        flag(target, "OPEN", NOW);
        flag(other, "DISMISSED", NOW);
        flushAndClear();
        AdminAbuseEscalationFilterRequest filter = new AdminAbuseEscalationFilterRequest();
        filter.setStatus(status);
        var result = service.getEscalations(filter);
        assertThat(result.getTotalItems()).isEqualTo(1);
        assertThat(result.getData()).singleElement().satisfies(item ->
                assertThat(item.getStatus()).isEqualTo(AbuseFlagStatus.valueOf(status)));
    }

    @Test
    void allFilterExcludesLegacyResolvedAndFlagsWithoutAccount() {
        flag(target, "PENDING", NOW);
        flag(target, "OPEN", NOW);
        flag(other, "DISMISSED", NOW);
        flag(other, "RESOLVED", NOW);
        flag(null, "PENDING", NOW);
        flushAndClear();
        AdminAbuseEscalationFilterRequest filter = new AdminAbuseEscalationFilterRequest();
        filter.setStatus("ALL");
        var result = service.getEscalations(filter);
        assertThat(result.getTotalItems()).isEqualTo(3);
        assertThat(result.getData()).extracting(item -> item.getStatus())
                .containsExactlyInAnyOrder(AbuseFlagStatus.PENDING, AbuseFlagStatus.OPEN, AbuseFlagStatus.DISMISSED);
    }

    @ParameterizedTest
    @ValueSource(strings = {"  KHOI.TRAN@EXAMPLE.TEST  ", "minh khôi", "0912345601"})
    void searchesAccountFieldsIgnoringCaseAndOuterWhitespace(String search) {
        AbuseFlag expected = flag(target, "PENDING", NOW);
        flag(other, "PENDING", NOW);
        flushAndClear();
        AdminAbuseEscalationFilterRequest filter = new AdminAbuseEscalationFilterRequest();
        filter.setSearch(search);
        assertThat(service.getEscalations(filter).getData()).singleElement().satisfies(item ->
                assertThat(item.getId()).isEqualTo(expected.getId()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"ESC", "esc", "U", "u"})
    void searchesDisplayCodesByExactNumericId(String prefix) {
        flag(other, "PENDING", NOW);
        AbuseFlag expected = flag(target, "PENDING", NOW);
        flushAndClear();
        AdminAbuseEscalationFilterRequest filter = new AdminAbuseEscalationFilterRequest();
        filter.setSearch(prefix + "-000" + (prefix.equalsIgnoreCase("esc") ? expected.getId() : target.getId()));
        assertThat(service.getEscalations(filter).getData()).singleElement().satisfies(item ->
                assertThat(item.getId()).isEqualTo(expected.getId()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"%", "_", "!"})
    void searchTreatsSqlWildcardCharactersAsLiteralText(String search) {
        User special = account("Người dùng %_! đặc biệt", "special@example.test", "0912345604");
        AbuseFlag expected = flag(special, "PENDING", NOW);
        flag(other, "PENDING", NOW);
        flushAndClear();
        AdminAbuseEscalationFilterRequest filter = new AdminAbuseEscalationFilterRequest();
        filter.setSearch(search);
        assertThat(service.getEscalations(filter).getData()).singleElement().satisfies(item ->
                assertThat(item.getId()).isEqualTo(expected.getId()));
    }

    @Test
    void oversizedDisplayCodeReturnsEmptyPageRatherThanServerError() {
        flag(target, "PENDING", NOW);
        flushAndClear();
        AdminAbuseEscalationFilterRequest filter = new AdminAbuseEscalationFilterRequest();
        filter.setSearch("ESC-999999999999999999999999999999");
        assertThat(service.getEscalations(filter).getData()).isEmpty();
    }

    @Test
    void emptyQueueAndOutOfRangePageReturnAccurateMetadata() {
        AdminAbuseEscalationFilterRequest filter = new AdminAbuseEscalationFilterRequest();
        assertThat(service.getEscalations(filter).getTotalItems()).isZero();
        flag(target, "PENDING", NOW);
        flag(other, "PENDING", NOW);
        flushAndClear();
        filter.setPage(10);
        filter.setSize(2);
        filter.setSearch("   ");
        var result = service.getEscalations(filter);
        assertThat(result.getData()).isEmpty();
        assertThat(result.getTotalItems()).isEqualTo(2);
        assertThat(result.getTotalPages()).isEqualTo(1);
    }

    @Test
    void legacyPrimaryReportAndAccountStatusArePreservedWithoutCreator() {
        target.setStatus("SUSPENDED");
        AbuseFlag flag = flag(target, "OPEN", NOW);
        flag.setCreatedBy(null);
        flag.setFlagType("SPAM");
        Report legacyReport = report(target, "legacy.example");
        flag.setReport(legacyReport);
        flushAndClear();
        AdminAbuseEscalationFilterRequest filter = new AdminAbuseEscalationFilterRequest();
        filter.setStatus("OPEN");
        assertThat(service.getEscalations(filter).getData()).singleElement().satisfies(item -> {
            assertThat(item.getReportIds()).containsExactly(legacyReport.getId());
            assertThat(item.getCreatedByUserId()).isNull();
            assertThat(item.getCreatedByName()).isNull();
            assertThat(item.getUserStatus()).isEqualTo("SUSPENDED");
            assertThat(item.getFlagType()).isEqualTo("SPAM");
            assertThat(item.getUserCode()).isEqualTo(String.format("U-%05d", target.getId()));
        });
    }

    @Test
    void rejectsOffsetBeyondJpaIntegerLimit() {
        AdminAbuseEscalationFilterRequest filter = new AdminAbuseEscalationFilterRequest();
        filter.setPage(Integer.MAX_VALUE);
        filter.setSize(100);
        assertThatThrownBy(() -> service.getEscalations(filter)).isInstanceOf(BadRequestException.class);
    }

    private User account(String name, String email, String phone) {
        User user = User.builder().fullName(name).email(email).phoneNumber(phone).passwordHash("test-hash")
                .status("ACTIVE").reputationPoints(0).build();
        entityManager.persist(user);
        return user;
    }

    private AbuseFlag flag(User user, String status, LocalDateTime createdAt) {
        AbuseFlag flag = AbuseFlag.builder().user(user).createdBy(moderator).flagType("BULK_REPORTING")
                .severity("MEDIUM").reason("Cần đối chiếu các báo cáo liên quan")
                .evidence("Nội dung ghi chú bằng chứng").status(status).createdAt(createdAt).build();
        entityManager.persist(flag);
        return flag;
    }

    private Report report(User user, String value) {
        Indicator indicator = Indicator.builder().type("URL").normalizedValue(value).createdAt(NOW).updatedAt(NOW).build();
        entityManager.persist(indicator);
        Report report = Report.builder().reporterUser(user).indicator(indicator).status("REJECTED")
                .reportCountSignal(1).coordinatedReportSuspected(false).moderationLocked(false)
                .createdAt(NOW).updatedAt(NOW).build();
        entityManager.persist(report);
        return report;
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }
}
