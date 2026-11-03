package com.be.scamshield.serviceImpl;

import com.be.scamshield.support.PostgresIntegrationTest;

import com.be.scamshield.constant.DisputePriority;
import com.be.scamshield.constant.DisputeStatus;
import com.be.scamshield.dto.request.DisputeListRequest;
import com.be.scamshield.entity.ConfirmedIndicator;
import com.be.scamshield.entity.Dispute;
import com.be.scamshield.entity.DisputeEvidence;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.User;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IDisputeService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DisputePersistenceTest extends PostgresIntegrationTest {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDateTime NOW = LocalDateTime.parse("2026-10-13T10:00:00");
    @Autowired private IDisputeService service;
    @Autowired private EntityManager entityManager;
    @Autowired private MockMvc mvc;
    @MockitoBean private Clock clock;
    private User owner;
    private User other;
    private int sequence;

    @BeforeEach
    void setUp() {
        when(clock.withZone(VIETNAM)).thenReturn(Clock.fixed(NOW.atZone(VIETNAM).toInstant(), VIETNAM));
        owner = account("owner", "0900010001");
        other = account("other", "0900010002");
    }

    @Test
    void listingUsesAuthenticatedOwnerAndIgnoresSuppliedUserId() throws Exception {
        Dispute owned = dispute(owner, DisputeStatus.PENDING, NOW.minusDays(1));
        dispute(other, DisputeStatus.APPROVED, NOW);
        dispute(null, DisputeStatus.IN_REVIEW, NOW);
        flushAndClear();
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner)))
                        .param("userId", other.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.totalItems").value(1))
                .andExpect(jsonPath("$.data.data[0].id").value(owned.getId()))
                .andExpect(jsonPath("$.data.data[0].disputeCode").value("DSP-" + owned.getId()));
        mvc.perform(get("/api/disputes/me/summary").with(user(UserPrincipal.create(owner)))
                        .param("userId", other.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSubmitted").value(1))
                .andExpect(jsonPath("$.data.approved").value(0));
    }

    @Test
    void bothEndpointsRequireAuthentication() throws Exception {
        mvc.perform(get("/api/disputes/me"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.isSuccess").value(false));
        mvc.perform(get("/api/disputes/me/summary"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void newestFirstPaginationIsStableAndEvidenceDoesNotInflateCounts() throws Exception {
        Dispute oldest = dispute(owner, DisputeStatus.PENDING, NOW.minusDays(2));
        Dispute firstAtSameTime = dispute(owner, DisputeStatus.IN_REVIEW, NOW.minusDays(1));
        Dispute secondAtSameTime = dispute(owner, DisputeStatus.NEEDS_MORE_INFO, NOW.minusDays(1));
        evidence(secondAtSameTime, "first.pdf", "https://files.example.test/first.pdf");
        evidence(secondAtSameTime, "second.png", "https://files.example.test/second.png");
        evidence(secondAtSameTime, null, null);
        evidence(secondAtSameTime, "empty.pdf", "   ");
        flushAndClear();
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner))).param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalItems").value(3))
                .andExpect(jsonPath("$.data.totalPages").value(2))
                .andExpect(jsonPath("$.data.currentPage").value(0))
                .andExpect(jsonPath("$.data.pageSize").value(2))
                .andExpect(jsonPath("$.data.hasNext").value(true))
                .andExpect(jsonPath("$.data.hasPrevious").value(false))
                .andExpect(jsonPath("$.data.data[0].id").value(secondAtSameTime.getId()))
                .andExpect(jsonPath("$.data.data[0].evidenceCount").value(2))
                .andExpect(jsonPath("$.data.data[0].attachments.length()").value(2))
                .andExpect(jsonPath("$.data.data[1].id").value(firstAtSameTime.getId()));
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner)))
                        .param("page", "1").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data[0].id").value(oldest.getId()))
                .andExpect(jsonPath("$.data.hasNext").value(false))
                .andExpect(jsonPath("$.data.hasPrevious").value(true));
    }

    @Test
    void commaSeparatedAndRepeatedStatusFiltersReturnTheirUnion() throws Exception {
        dispute(owner, DisputeStatus.PENDING, NOW.minusDays(3));
        dispute(owner, DisputeStatus.IN_REVIEW, NOW.minusDays(2));
        dispute(owner, DisputeStatus.NEEDS_MORE_INFO, NOW.minusDays(1));
        dispute(other, DisputeStatus.PENDING, NOW);
        flushAndClear();
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner)))
                        .param("status", "PENDING,IN_REVIEW"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalItems").value(2));
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner)))
                        .param("status", "PENDING", "IN_REVIEW"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalItems").value(2));
        DisputeListRequest filter = new DisputeListRequest();
        filter.setStatus(List.of(DisputeStatus.NEEDS_MORE_INFO));
        assertThat(service.getMyDisputes(owner.getId(), filter).getData()).hasSize(1);
    }

    @Test
    void approvedFilterReturnsAcceptedDisputesWithoutRestoredField() throws Exception {
        Dispute approved = dispute(owner, DisputeStatus.APPROVED, NOW.minusDays(1));
        dispute(owner, DisputeStatus.PENDING, NOW);
        dispute(other, DisputeStatus.APPROVED, NOW);
        flushAndClear();
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner))).param("status", "APPROVED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalItems").value(1))
                .andExpect(jsonPath("$.data.data[0].id").value(approved.getId()))
                .andExpect(jsonPath("$.data.data[0].restored").doesNotExist())
                .andExpect(jsonPath("$.data.data[0].indicator.blacklistStatus").value("RETRACTED"));
    }

    @Test
    void newFieldsAndAttachmentRoundTripWithoutExposingPrivateData() throws Exception {
        Dispute row = dispute(owner, DisputeStatus.NEEDS_MORE_INFO, NOW.minusDays(1));
        row.setPriority(DisputePriority.HIGH);
        row.setProgressMessage("Đang đối chiếu giấy phép kinh doanh.");
        row.setEstimatedResolutionAt(NOW.plusDays(2));
        row.setSupplementReason("Bổ sung sao kê giao dịch.");
        row.setSupplementDeadline(NOW.plusDays(1));
        row.setResolutionReason("Kết luận thẩm định mẫu.");
        row.setResolutionDocumentUrl("https://files.example.test/resolution.pdf");
        row.setAssignedToUser(other);
        row.setResolvedByUser(other);
        DisputeEvidence attachment = evidence(row, "Giay-phep-kinh-doanh.pdf", "https://files.example.test/business.pdf");
        flushAndClear();
        String response = mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data[0].status").value("NEEDS_MORE_INFO"))
                .andExpect(jsonPath("$.data.data[0].priority").value("HIGH"))
                .andExpect(jsonPath("$.data.data[0].reason").value("Yêu cầu xem xét lại chỉ số."))
                .andExpect(jsonPath("$.data.data[0].progressMessage").value("Đang đối chiếu giấy phép kinh doanh."))
                .andExpect(jsonPath("$.data.data[0].estimatedResolutionAt").value("2026-10-15T10:00:00"))
                .andExpect(jsonPath("$.data.data[0].supplementReason").value("Bổ sung sao kê giao dịch."))
                .andExpect(jsonPath("$.data.data[0].supplementDeadline").value("2026-10-14T10:00:00"))
                .andExpect(jsonPath("$.data.data[0].resolutionReason").value("Kết luận thẩm định mẫu."))
                .andExpect(jsonPath("$.data.data[0].resolutionDocumentUrl").value("https://files.example.test/resolution.pdf"))
                .andExpect(jsonPath("$.data.data[0].indicator.id").value(row.getConfirmedIndicator().getIndicator().getId()))
                .andExpect(jsonPath("$.data.data[0].indicator.type").value("PHONE"))
                .andExpect(jsonPath("$.data.data[0].indicator.displayValue").value("091.234.8899"))
                .andExpect(jsonPath("$.data.data[0].evidenceCount").value(1))
                .andExpect(jsonPath("$.data.data[0].attachments[0].id").value(attachment.getId()))
                .andExpect(jsonPath("$.data.data[0].attachments[0].fileName").value("Giay-phep-kinh-doanh.pdf"))
                .andExpect(jsonPath("$.data.data[0].attachments[0].fileUrl").value("https://files.example.test/business.pdf"))
                .andExpect(jsonPath("$.data.data[0].attachments[0].evidenceType").value("DOCUMENT"))
                .andExpect(jsonPath("$.data.data[0].attachments[0].description").value("Bằng chứng quyền sở hữu."))
                .andExpect(jsonPath("$.data.data[0].attachments[0].verificationStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.data[0].attachments[0].createdAt").value("2026-10-13T09:00:00"))
                .andReturn().getResponse().getContentAsString();
        assertThat(response).doesNotContain("private-file-hash", "passwordHash", "private-password-hash",
                "owner@example.test", "other@example.test", "submitterContact", "assignedToUser", "resolvedByUser");
    }

    @Test
    void omittedOptionalFieldsRemainEmptyAndIndicatorFallsBackToNormalizedValue() throws Exception {
        Dispute row = dispute(owner, DisputeStatus.PENDING, NOW.minusDays(1));
        row.getConfirmedIndicator().getIndicator().setDisplayValue(null);
        String normalized = row.getConfirmedIndicator().getIndicator().getNormalizedValue();
        flushAndClear();
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data[0].priority").value("NORMAL"))
                .andExpect(jsonPath("$.data.data[0].indicator.displayValue").value(normalized))
                .andExpect(jsonPath("$.data.data[0].progressMessage").doesNotExist())
                .andExpect(jsonPath("$.data.data[0].estimatedResolutionAt").doesNotExist())
                .andExpect(jsonPath("$.data.data[0].supplementReason").doesNotExist())
                .andExpect(jsonPath("$.data.data[0].supplementDeadline").doesNotExist())
                .andExpect(jsonPath("$.data.data[0].resolutionDocumentUrl").doesNotExist())
                .andExpect(jsonPath("$.data.data[0].attachments").isEmpty())
                .andExpect(jsonPath("$.data.data[0].restored").doesNotExist());
    }

    @Test
    void summaryUsesAllOwnedDisputesAndOnlyValidCompletedDurations() throws Exception {
        dispute(owner, DisputeStatus.PENDING, NOW.minusDays(1));
        Dispute unfinished = dispute(owner, DisputeStatus.IN_REVIEW, NOW.minusDays(1));
        unfinished.setResolvedAt(NOW.minusHours(1));
        dispute(owner, DisputeStatus.NEEDS_MORE_INFO, NOW.minusDays(1));
        Dispute restored = dispute(owner, DisputeStatus.APPROVED, NOW.minusHours(4));
        restored.setResolvedAt(NOW.minusMinutes(40)); // 3h20m, should retain fractional hours.
        restored.getConfirmedIndicator().setStatus("RETRACTED");
        restored.getConfirmedIndicator().setRetractedAt(NOW.minusMinutes(40));
        Dispute rejected = dispute(owner, DisputeStatus.REJECTED, NOW.minusHours(8));
        rejected.setResolvedAt(NOW.minusHours(1)); // 7 hours, included even though rejected.
        Dispute negative = dispute(owner, DisputeStatus.APPROVED, NOW.minusHours(5));
        negative.setResolvedAt(NOW.minusHours(6));
        Dispute noResolutionTime = dispute(owner, DisputeStatus.APPROVED, NOW.minusDays(1));
        noResolutionTime.getConfirmedIndicator().setStatus("RETRACTED");
        noResolutionTime.getConfirmedIndicator().setRetractedAt(NOW.minusHours(1));
        Dispute future = dispute(owner, DisputeStatus.REJECTED, NOW.minusDays(1));
        future.setResolvedAt(NOW.plusMinutes(1));
        Dispute undatedRetraction = dispute(owner, DisputeStatus.APPROVED, NOW.minusDays(1));
        undatedRetraction.getConfirmedIndicator().setStatus("RETRACTED");
        Dispute otherResolved = dispute(other, DisputeStatus.APPROVED, NOW.minusDays(10));
        otherResolved.setResolvedAt(NOW);
        dispute(null, DisputeStatus.PENDING, NOW);
        flushAndClear();
        mvc.perform(get("/api/disputes/me/summary").with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.timezone").value("Asia/Ho_Chi_Minh"))
                .andExpect(jsonPath("$.data.generatedAt").value("2026-10-13T10:00:00"))
                .andExpect(jsonPath("$.data.totalSubmitted").value(9))
                .andExpect(jsonPath("$.data.inProgress").doesNotExist())
                .andExpect(jsonPath("$.data.pending").value(1))
                .andExpect(jsonPath("$.data.inReview").value(1))
                .andExpect(jsonPath("$.data.needsMoreInfo").value(1))
                .andExpect(jsonPath("$.data.approved").value(4))
                .andExpect(jsonPath("$.data.rejected").value(2))
                .andExpect(jsonPath("$.data.resolved").doesNotExist())
                .andExpect(jsonPath("$.data.restored").doesNotExist())
                .andExpect(jsonPath("$.data.averageResolutionHours").value(5.2))
                .andExpect(jsonPath("$.data.restorationRate").value(66.7));
    }

    @Test
    void emptyAccountHasEmptyListAndNullSummaryRates() throws Exception {
        dispute(other, DisputeStatus.PENDING, NOW);
        flushAndClear();
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalItems").value(0))
                .andExpect(jsonPath("$.data.data").isEmpty());
        mvc.perform(get("/api/disputes/me/summary").with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalSubmitted").value(0))
                .andExpect(jsonPath("$.data.inProgress").doesNotExist())
                .andExpect(jsonPath("$.data.resolved").doesNotExist())
                .andExpect(jsonPath("$.data.restored").doesNotExist())
                .andExpect(jsonPath("$.data.averageResolutionHours").doesNotExist())
                .andExpect(jsonPath("$.data.restorationRate").doesNotExist());
    }

    @Test
    void summaryWithPendingDisputeDoesNotInventResolutionSamples() {
        dispute(owner, DisputeStatus.PENDING, NOW.minusDays(1));
        flushAndClear();
        var summary = service.getMySummary(owner.getId());
        assertThat(summary.totalSubmitted()).isEqualTo(1);
        assertThat(summary.averageResolutionHours()).isNull();
        assertThat(summary.restorationRate()).isNull();
    }

    @Test
    void unknownCombinationAndPageBeyondLastPageReturnEmptyData() throws Exception {
        dispute(owner, DisputeStatus.PENDING, NOW.minusDays(1));
        flushAndClear();
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner)))
                        .param("status", "APPROVED"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalItems").value(0));
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner))).param("page", "5"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalItems").value(1))
                .andExpect(jsonPath("$.data.data").isEmpty());
    }

    @ParameterizedTest
    @CsvSource({"page,-1", "page,100001", "page,nope", "size,0", "size,51", "size,nope", "status,INVALID", "status,approved"})
    void invalidParametersReturnJson400(String parameter, String value) throws Exception {
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner))).param(parameter, value))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void emptyStatusTokenIsRejectedInsteadOfSilentlyDroppingTheFilter() throws Exception {
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner))).param("status", "PENDING,"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void readOperationsDoNotChangeDisputeEvidenceOrBlacklistData() {
        Dispute row = dispute(owner, DisputeStatus.IN_REVIEW, NOW.minusDays(1));
        DisputeEvidence attachment = evidence(row, "proof.pdf", "https://files.example.test/proof.pdf");
        Long disputeId = row.getId();
        Long evidenceId = attachment.getId();
        Long confirmedId = row.getConfirmedIndicator().getId();
        flushAndClear();
        Dispute before = entityManager.find(Dispute.class, disputeId);
        LocalDateTime updatedAt = before.getUpdatedAt();
        service.getMyDisputes(owner.getId(), new DisputeListRequest());
        service.getMySummary(owner.getId());
        flushAndClear();
        Dispute after = entityManager.find(Dispute.class, disputeId);
        assertThat(after.getStatus()).isEqualTo(DisputeStatus.IN_REVIEW);
        assertThat(after.getUpdatedAt()).isEqualTo(updatedAt);
        assertThat(after.getResolvedAt()).isNull();
        assertThat(entityManager.find(DisputeEvidence.class, evidenceId).getVerificationStatus()).isEqualTo("PENDING");
        assertThat(entityManager.find(ConfirmedIndicator.class, confirmedId).getStatus()).isEqualTo("ACTIVE");
        assertThat(entityManager.find(ConfirmedIndicator.class, confirmedId).getRetractedAt()).isNull();
    }

    @Test
    void swaggerDocumentsProtectedEndpointsAndTheirFilters() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.security[0].bearerAuth").exists())
                .andExpect(jsonPath("$.paths['/api/disputes/me'].get.description").isNotEmpty())
                .andExpect(jsonPath("$.paths['/api/disputes/me/summary'].get.description").isNotEmpty())
                .andExpect(jsonPath("$.components.schemas.DisputeSummaryResponse.properties.inProgress").doesNotExist())
                .andExpect(jsonPath("$.components.schemas.DisputeSummaryResponse.properties.resolved").doesNotExist())
                .andExpect(jsonPath("$.paths['/api/disputes/me'].get.parameters[?(@.name == 'status')]").isNotEmpty())
                .andExpect(jsonPath("$.paths['/api/disputes/me'].get.parameters[?(@.name == 'restored')]").isEmpty())
                .andExpect(jsonPath("$.paths['/api/disputes/me'].get.parameters[?(@.name == 'userId')]").isEmpty())
                .andExpect(jsonPath("$..properties.progressMessage.description").isNotEmpty())
                .andExpect(jsonPath("$..properties.estimatedResolutionAt.description").isNotEmpty())
                .andExpect(jsonPath("$..properties.supplementReason.description").isNotEmpty())
                .andExpect(jsonPath("$..properties.supplementDeadline.description").isNotEmpty())
                .andExpect(jsonPath("$..properties.resolutionDocumentUrl.description").isNotEmpty())
                .andExpect(jsonPath("$..properties.fileName.description").isNotEmpty());
    }

    private User account(String label, String phone) {
        User account = User.builder().fullName(label).phoneNumber(phone).email(label + "@example.test")
                .passwordHash("private-password-hash").status("ACTIVE").createdAt(NOW).updatedAt(NOW).build();
        entityManager.persist(account);
        return account;
    }

    private Dispute dispute(User submitter, DisputeStatus disputeStatus, LocalDateTime createdAt) {
        sequence++;
        Indicator indicator = Indicator.builder().type("PHONE").normalizedValue("+8491234" + String.format("%04d", sequence))
                .displayValue("091.234.8899").createdAt(NOW.minusDays(10)).updatedAt(NOW.minusDays(10)).build();
        entityManager.persist(indicator);
        ConfirmedIndicator confirmed = ConfirmedIndicator.builder().indicator(indicator).status("ACTIVE")
                .confirmedByUser(other).confirmedAt(NOW.minusDays(10)).publicReason("Đã xác thực nguy cơ.").build();
        if (disputeStatus == DisputeStatus.APPROVED) {
            confirmed.setStatus("RETRACTED");
            confirmed.setRetractedAt(NOW.minusHours(1));
        }
        entityManager.persist(confirmed);
        Dispute row = Dispute.builder().confirmedIndicator(confirmed).submittedByUser(submitter)
                .submitterName("Private submitter").submitterContact("private-contact@example.test")
                .reason("Yêu cầu xem xét lại chỉ số.").status(disputeStatus).priority(DisputePriority.NORMAL)
                .createdAt(createdAt).updatedAt(createdAt).build();
        entityManager.persist(row);
        return row;
    }

    private DisputeEvidence evidence(Dispute row, String fileName, String fileUrl) {
        DisputeEvidence attachment = DisputeEvidence.builder().dispute(row).evidenceType("DOCUMENT")
                .fileName(fileName).fileUrl(fileUrl).fileHash("private-file-hash")
                .description("Bằng chứng quyền sở hữu.").verificationStatus("PENDING").createdAt(NOW.minusHours(1)).build();
        entityManager.persist(attachment);
        return attachment;
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }
}

