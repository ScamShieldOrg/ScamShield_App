package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.SupabaseStorageService;

import com.be.scamshield.constant.DisputeStatus;
import com.be.scamshield.entity.ConfirmedIndicator;
import com.be.scamshield.entity.Dispute;
import com.be.scamshield.entity.DisputeEvidence;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.DisputeStorageException;
import com.be.scamshield.security.UserPrincipal;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.mock.web.MockPart;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Uses committed fixtures so upload-failure assertions exercise the actual service transaction. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DisputeSubmissionTest {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDateTime NOW = LocalDateTime.parse("2026-10-14T10:00:00");
    private static final String SUBMIT = "/api/disputes";
    private static final String DRAFTS = "/api/disputes/drafts";
    private static final byte[] PDF = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF".getBytes(StandardCharsets.UTF_8);

    @Autowired private EntityManager entityManager;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @MockitoBean private Clock clock;
    @MockitoBean private SupabaseStorageService storage;

    private TransactionTemplate transactions;
    private User owner;
    private User other;
    private ConfirmedIndicator active;
    private final List<Long> indicatorIds = new ArrayList<>();
    private final List<Long> confirmedIds = new ArrayList<>();
    private final List<String> uploadedKeys = new ArrayList<>();
    private final AtomicInteger uploadSequence = new AtomicInteger();

    @BeforeEach
    void setUp() {
        transactions = new TransactionTemplate(transactionManager);
        Clock fixed = Clock.fixed(NOW.atZone(VIETNAM).toInstant(), VIETNAM);
        when(clock.withZone(VIETNAM)).thenReturn(fixed);
        when(clock.instant()).thenReturn(fixed.instant());
        when(clock.getZone()).thenReturn(VIETNAM);
        when(storage.isStorageConfigured()).thenReturn(true);
        when(storage.uploadDisputeFile(any(MultipartFile.class))).thenAnswer(invocation -> {
            MultipartFile file = invocation.getArgument(0);
            String key = "disputes/private-" + uploadSequence.incrementAndGet() + ".pdf";
            uploadedKeys.add(key);
            return new SupabaseStorageService.UploadResult("s3://dispute-evidences/" + key,
                    "private-file-hash", key, file.getOriginalFilename());
        });
        when(storage.createDisputeDownloadUrl(anyString()))
                .thenAnswer(invocation -> "https://storage.example.test/signed/" + invocation.getArgument(0) + "?expires=900");
        transactions.executeWithoutResult(ignored -> {
            owner = account("owner");
            other = account("other");
            active = confirmed("PHONE", "0912348899", "ACTIVE");
        });
    }

    @AfterEach
    void cleanUpFixtures() {
        if (owner == null || other == null) return;
        transactions.executeWithoutResult(ignored -> {
            List<Long> users = List.of(owner.getId(), other.getId());
            entityManager.createQuery("delete from DisputeEvidence e where e.dispute.submittedByUser.id in :users")
                    .setParameter("users", users).executeUpdate();
            entityManager.createQuery("delete from Dispute d where d.submittedByUser.id in :users")
                    .setParameter("users", users).executeUpdate();
            if (!confirmedIds.isEmpty()) {
                entityManager.createQuery("delete from ConfirmedIndicator c where c.id in :ids")
                        .setParameter("ids", confirmedIds).executeUpdate();
            }
            if (!indicatorIds.isEmpty()) {
                entityManager.createQuery("delete from Indicator i where i.id in :ids")
                        .setParameter("ids", indicatorIds).executeUpdate();
            }
            entityManager.createQuery("delete from User u where u.id in :users")
                    .setParameter("users", users).executeUpdate();
        });
    }

    @Test
    void submitNormalizesTargetAndPersistsOwnerDeclarationAndPrivateAttachmentMetadata() throws Exception {
        String request = validRequest("091.234.8899").replace("}", ",\"status\":\"APPROVED\",\"userId\":" + other.getId() + "}");
        MvcResult result = mvc.perform(multipart(SUBMIT).file(json(request)).file(pdf("ownership.pdf"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().is2xxSuccessful())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.legalRelationship").value("OWNER"))
                .andExpect(jsonPath("$.data.declarationAcceptedAt").value("2026-10-14T10:00:00"))
                .andExpect(jsonPath("$.data.indicatorType").value("PHONE"))
                .andExpect(jsonPath("$.data.attachments.length()").value(1))
                .andExpect(jsonPath("$.data.attachments[0].fileName").value("ownership.pdf"))
                .andExpect(jsonPath("$.data.attachments[0].fileSize").value(PDF.length))
                .andExpect(jsonPath("$.data.attachments[0].contentType").value("application/pdf"))
                .andExpect(jsonPath("$.data.attachments[0].verificationStatus").value("PENDING"))
                .andReturn();
        Long id = responseId(result);
        transactions.executeWithoutResult(ignored -> {
            Dispute row = entityManager.find(Dispute.class, id);
            assertThat(row.getSubmittedByUser().getId()).isEqualTo(owner.getId());
            assertThat(row.getConfirmedIndicator().getId()).isEqualTo(active.getId());
            assertThat(row.getStatus()).isEqualTo(DisputeStatus.PENDING);
            assertThat(row.getDeclarationAcceptedAt()).isEqualTo(NOW);
            assertThat(row.getResolvedAt()).isNull();
            assertThat(entityManager.find(ConfirmedIndicator.class, active.getId()).getStatus()).isEqualTo("ACTIVE");
        });
        assertThat(result.getResponse().getContentAsString())
                .doesNotContain("private-file-hash", "objectKey", "s3://", "passwordHash");
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(other))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalItems").value(0));
    }

    @Test
    void swaggerStylePlainMultipartJsonIsAccepted() throws Exception {
        MockPart request = new MockPart("request", validRequest("0912348899").getBytes(StandardCharsets.UTF_8));
        request.getHeaders().setContentType(MediaType.TEXT_PLAIN);
        mvc.perform(multipart(SUBMIT).part(request).file(pdf("proof.pdf")).with(user(UserPrincipal.create(owner))))
                .andExpect(status().is2xxSuccessful()).andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @ParameterizedTest
    @CsvSource({"BANK_ACCOUNT,123456789,123 456 789", "URL,shop.example.test,https://SHOP.example.test/", "BRANDNAME,SCAMSHIELD,scamshield"})
    void otherIndicatorTypesResolveToTheExistingNormalizedTarget(String type, String normalizedValue, String input) throws Exception {
        transactions.executeWithoutResult(ignored -> confirmed(type, normalizedValue, "ACTIVE"));
        String request = validRequest(input).replace("\"PHONE\"", "\"" + type + "\"");
        mvc.perform(multipart(SUBMIT).file(json(request)).file(pdf("proof.pdf"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.indicatorType").value(type))
                .andExpect(jsonPath("$.data.indicatorValue").value(normalizedValue));
    }

    @Test
    void exactUrlMatchWinsWhenASeparateDomainIndicatorAlsoExists() throws Exception {
        String domain = "ambiguous.example.test";
        transactions.executeWithoutResult(ignored -> {
            confirmed("URL", domain, "ACTIVE");
            confirmed("URL", "https://" + domain, "ACTIVE");
        });
        String request = validRequest("https://" + domain).replace("\"PHONE\"", "\"URL\"");
        mvc.perform(multipart(SUBMIT).file(json(request)).file(pdf("proof.pdf"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.indicatorValue").value("https://" + domain));
    }

    @Test
    void pngAndJpegProofsAreAcceptedAndRecordedAsImages() throws Exception {
        byte[] png = {(byte) 137, 80, 78, 71, 13, 10, 26, 10, 0};
        byte[] jpeg = {(byte) 255, (byte) 216, (byte) 255, (byte) 217};
        mvc.perform(multipart(SUBMIT).file(json(validRequest("0912348899")))
                        .file(new MockMultipartFile("files", "proof.png", "image/png", png))
                        .file(new MockMultipartFile("files", "proof.jpeg", "image/jpeg", jpeg))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.attachments.length()").value(2))
                .andExpect(jsonPath("$.data.attachments[0].evidenceType").value("IMAGE"))
                .andExpect(jsonPath("$.data.attachments[0].contentType").value("image/png"))
                .andExpect(jsonPath("$.data.attachments[1].evidenceType").value("IMAGE"))
                .andExpect(jsonPath("$.data.attachments[1].contentType").value("image/jpeg"));
    }

    @Test
    void explanationLongerThanLegacyVarcharCapacityRoundTrips() throws Exception {
        String explanation = "Bằng chứng chính chủ của doanh nghiệp. ".repeat(30);
        String request = validRequest("0912348899").replace("Số điện thoại chính chủ, đề nghị xem xét gỡ nhãn sai.", explanation);
        MvcResult created = mvc.perform(multipart(SUBMIT).file(json(request)).file(pdf("proof.pdf"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.reason").value(explanation.trim())).andReturn();
        Long id = responseId(created);
        transactions.executeWithoutResult(ignored -> assertThat(entityManager.find(Dispute.class, id).getReason()).isEqualTo(explanation.trim()));
    }

    @Test
    void retractedTargetAndUnknownTargetCannotBeSubmitted() throws Exception {
        transactions.executeWithoutResult(ignored -> {
            ConfirmedIndicator row = entityManager.find(ConfirmedIndicator.class, active.getId());
            row.setStatus("RETRACTED");
            row.setRetractedAt(NOW.minusHours(1));
        });
        mvc.perform(multipart(SUBMIT).file(json(validRequest("0912348899"))).file(pdf("proof.pdf"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.isSuccess").value(false));
        mvc.perform(multipart(SUBMIT).file(json(validRequest("0911112222"))).file(pdf("proof.pdf"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.isSuccess").value(false));
        assertThat(ownedDisputes(owner)).isZero();
        verify(storage, never()).uploadDisputeFile(any());
    }

    @ParameterizedTest
    @CsvSource({"PENDING", "IN_REVIEW", "NEEDS_MORE_INFO"})
    void duplicateOpenDisputeForTheSameOwnerAndTargetIsRejected(String openStatus) throws Exception {
        transactions.executeWithoutResult(ignored -> entityManager.persist(Dispute.builder()
                .submittedByUser(entityManager.find(User.class, owner.getId()))
                .confirmedIndicator(entityManager.find(ConfirmedIndicator.class, active.getId()))
                .status(DisputeStatus.valueOf(openStatus)).reason("Existing open dispute")
                .createdAt(NOW.minusHours(1)).updatedAt(NOW.minusHours(1)).build()));
        mvc.perform(multipart(SUBMIT).file(json(validRequest("0912348899"))).file(pdf("proof.pdf"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.isSuccess").value(false));
        assertThat(ownedDisputes(owner)).isEqualTo(1);
        verify(storage, never()).uploadDisputeFile(any());
    }

    @Test
    void differentOwnersMaySubmitDisputesForTheSameTarget() throws Exception {
        mvc.perform(multipart(SUBMIT).file(json(validRequest("0912348899"))).file(pdf("owner.pdf"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().is2xxSuccessful());
        mvc.perform(multipart(SUBMIT).file(json(validRequest("0912348899"))).file(pdf("other.pdf"))
                        .with(user(UserPrincipal.create(other))))
                .andExpect(status().is2xxSuccessful());
        assertThat(ownedDisputes(owner)).isEqualTo(1);
        assertThat(ownedDisputes(other)).isEqualTo(1);
    }

    @Test
    void simultaneousSubmissionsForSameOwnerAndTargetCreateOnlyOneDispute() throws Exception {
        CountDownLatch uploading = new CountDownLatch(1);
        CountDownLatch allowCommit = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger uploads = new AtomicInteger();
        when(storage.uploadDisputeFile(any())).thenAnswer(invocation -> {
            uploads.incrementAndGet();
            uploading.countDown();
            if (!allowCommit.await(5, TimeUnit.SECONDS)) throw new DisputeStorageException("Test upload timed out");
            return new SupabaseStorageService.UploadResult("s3://dispute-evidences/disputes/concurrent.pdf",
                    "private-file-hash", "disputes/concurrent.pdf", "proof.pdf");
        });
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Integer> first = executor.submit(() -> submitStatus(owner));
            assertThat(uploading.await(5, TimeUnit.SECONDS)).isTrue();
            Future<Integer> second = executor.submit(() -> { secondStarted.countDown(); return submitStatus(owner); });
            assertThat(secondStarted.await(5, TimeUnit.SECONDS)).isTrue();
            // While the first transaction holds the indicator lock, the second must not upload.
            assertThatThrownBy(() -> second.get(300, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            assertThat(uploads.get()).isEqualTo(1);
            allowCommit.countDown();
            assertThat(List.of(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(201, 409);
            assertThat(ownedDisputes(owner)).isEqualTo(1);
            assertThat(uploads.get()).isEqualTo(1);
        } finally {
            allowCommit.countDown();
            executor.shutdownNow();
            executor.awaitTermination(5, TimeUnit.SECONDS);
        }
    }

    @Test
    void partialDraftIsSavedWithoutBlacklistOrAgreementAndExcludedFromSubmittedApis() throws Exception {
        MvcResult created = mvc.perform(multipart(DRAFTS).file(json("{\"indicatorType\":\"PHONE\",\"indicatorValue\":\"09\",\"reason\":\"Đang viết\"}"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().is2xxSuccessful()).andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.indicatorValue").value("09"))
                .andExpect(jsonPath("$.data.reason").value("Đang viết"))
                .andExpect(jsonPath("$.data.declarationAcceptedAt").doesNotExist()).andReturn();
        Long draftId = responseId(created);
        transactions.executeWithoutResult(ignored -> {
            Dispute row = entityManager.find(Dispute.class, draftId);
            assertThat(row.getConfirmedIndicator()).isNull();
            assertThat(row.getDeclarationAcceptedAt()).isNull();
        });
        mvc.perform(get(DRAFTS).with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalItems").value(1));
        mvc.perform(get(DRAFTS + "/" + draftId).with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.id").value(draftId));
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalItems").value(0));
        mvc.perform(get("/api/disputes/me/summary").with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalSubmitted").value(0));
    }

    @Test
    void draftUpdateRetainsAttachmentsAndSubmissionReusesSavedFiles() throws Exception {
        MvcResult created = createDraft(owner, validRequest("0912348899").replace("true", "false"), pdf("initial.pdf"));
        Long draftId = responseId(created);
        long initialEvidenceId = jsonResponse(created).path("data").path("attachments").get(0).path("id").asLong();
        String updatedForm = validRequest("0912348899").replace("Số điện thoại chính chủ, đề nghị xem xét gỡ nhãn sai.", "Giải trình đã bổ sung");
        mvc.perform(updateDraft(draftId, updatedForm).file(pdf("additional.pdf"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.attachments.length()").value(2))
                .andExpect(jsonPath("$.data.reason").value("Giải trình đã bổ sung"));
        mvc.perform(updateDraft(draftId, updatedForm.replace("}", ",\"removedEvidenceIds\":[" + initialEvidenceId + "]}"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.attachments.length()").value(1))
                .andExpect(jsonPath("$.data.attachments[0].fileName").value("additional.pdf"));
        verify(storage).deleteDisputeFile("disputes/private-1.pdf");
        mvc.perform(multipart(DRAFTS + "/" + draftId + "/submit").file(json(updatedForm))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.id").value(draftId))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.reason").value("Giải trình đã bổ sung"))
                .andExpect(jsonPath("$.data.declarationAcceptedAt").value("2026-10-14T10:00:00"))
                .andExpect(jsonPath("$.data.attachments.length()").value(1));
        mvc.perform(get(DRAFTS).with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalItems").value(0));
        mvc.perform(get("/api/disputes/me").with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalItems").value(1));
        mvc.perform(updateDraft(draftId, "{\"reason\":\"Không được sửa hồ sơ đã gửi\"}")
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isConflict());
        mvc.perform(multipart(DRAFTS + "/" + draftId + "/submit").file(json(updatedForm))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isConflict());
    }

    @Test
    void savingDraftReplacesTextFieldsAndClearsOmittedFields() throws Exception {
        Long id = responseId(createDraft(owner, validRequest("0912348899"), pdf("proof.pdf")));
        mvc.perform(updateDraft(id, "{\"reason\":\"Chỉ lưu lại giải trình\"}")
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.reason").value("Chỉ lưu lại giải trình"))
                .andExpect(jsonPath("$.data.indicatorType").doesNotExist())
                .andExpect(jsonPath("$.data.indicatorValue").doesNotExist())
                .andExpect(jsonPath("$.data.legalRelationship").doesNotExist())
                .andExpect(jsonPath("$.data.attachments.length()").value(1));
    }

    @Test
    void anotherUserCannotReadEditSubmitOrRemoveEvidenceFromOwnersDraft() throws Exception {
        MvcResult created = createDraft(owner, validRequest("0912348899"), pdf("private.pdf"));
        Long draftId = responseId(created);
        long evidenceId = jsonResponse(created).path("data").path("attachments").get(0).path("id").asLong();
        mvc.perform(get(DRAFTS).with(user(UserPrincipal.create(other))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalItems").value(0));
        mvc.perform(get(DRAFTS + "/" + draftId).with(user(UserPrincipal.create(other))))
                .andExpect(status().isNotFound());
        mvc.perform(updateDraft(draftId, "{\"reason\":\"Tampered\"}").with(user(UserPrincipal.create(other))))
                .andExpect(status().isNotFound());
        mvc.perform(multipart(DRAFTS + "/" + draftId + "/submit").file(json(validRequest("0912348899")))
                        .with(user(UserPrincipal.create(other))))
                .andExpect(status().isNotFound());
        Long othersDraft = responseId(createDraft(other, "{}"));
        mvc.perform(updateDraft(othersDraft, "{\"removedEvidenceIds\":[" + evidenceId + "]}")
                        .with(user(UserPrincipal.create(other))))
                .andExpect(status().isBadRequest());
        transactions.executeWithoutResult(ignored -> {
            assertThat(entityManager.find(Dispute.class, draftId).getStatus()).isEqualTo(DisputeStatus.DRAFT);
            assertThat(entityManager.find(DisputeEvidence.class, evidenceId)).isNotNull();
        });
        verify(storage, never()).deleteDisputeFile(anyString());
    }

    @Test
    void savedDraftCannotBypassCurrentBlacklistStatusOrMissingEvidence() throws Exception {
        Long draftId = responseId(createDraft(owner, validRequest("0912348899"), pdf("proof.pdf")));
        transactions.executeWithoutResult(ignored -> {
            ConfirmedIndicator row = entityManager.find(ConfirmedIndicator.class, active.getId());
            row.setStatus("RETRACTED");
            row.setRetractedAt(NOW);
        });
        mvc.perform(multipart(DRAFTS + "/" + draftId + "/submit").file(json(validRequest("0912348899")))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isConflict());
        assertDraftStillSaved(draftId, 1);
        transactions.executeWithoutResult(ignored -> confirmed("PHONE", "0911112222", "ACTIVE"));
        Long emptyId = responseId(createDraft(owner, validRequest("0911112222")));
        mvc.perform(multipart(DRAFTS + "/" + emptyId + "/submit").file(json(validRequest("0911112222")))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isBadRequest());
        assertDraftStillSaved(emptyId, 0);
    }

    @ParameterizedTest
    @CsvSource({"agreeTerms,false", "legalRelationship,INVALID", "indicatorType,EMAIL"})
    void invalidSubmitFieldsAreRejectedBeforeUpload(String field, String invalidValue) throws Exception {
        String original = switch (field) {
            case "agreeTerms" -> "\"agreeTerms\":true";
            case "legalRelationship" -> "\"legalRelationship\":\"OWNER\"";
            default -> "\"indicatorType\":\"PHONE\"";
        };
        String replacement = "\"" + field + "\":" + (field.equals("agreeTerms") ? invalidValue : "\"" + invalidValue + "\"");
        mvc.perform(multipart(SUBMIT).file(json(validRequest("0912348899").replace(original, replacement)))
                        .file(pdf("proof.pdf")).with(user(UserPrincipal.create(owner))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
        assertThat(ownedDisputes(owner)).isZero();
        verify(storage, never()).uploadDisputeFile(any());
    }

    @Test
    void emptyRequestMissingProofAndMalformedJsonCannotCreateSubmittedDisputes() throws Exception {
        mvc.perform(multipart(SUBMIT).file(json("{}")).file(pdf("proof.pdf"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isBadRequest());
        mvc.perform(multipart(SUBMIT).file(json(validRequest("0912348899")))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isBadRequest());
        mvc.perform(multipart(SUBMIT).file(json("{invalid")).file(pdf("proof.pdf"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isBadRequest());
        assertThat(ownedDisputes(owner)).isZero();
        verify(storage, never()).uploadDisputeFile(any());
    }

    @Test
    void fileSignatureExtensionMimeSizeAndCountAreValidatedBeforeAnyUpload() throws Exception {
        List<MockMultipartFile> invalid = List.of(
                new MockMultipartFile("files", "empty.pdf", "application/pdf", new byte[0]),
                new MockMultipartFile("files", "fake.pdf", "application/pdf", "<script>bad</script>".getBytes(StandardCharsets.UTF_8)),
                new MockMultipartFile("files", "proof.exe", "application/pdf", PDF),
                new MockMultipartFile("files", "proof.pdf", "image/png", PDF),
                new MockMultipartFile("files", "too-large.pdf", "application/pdf", oversizedPdf()));
        for (MockMultipartFile file : invalid) {
            mvc.perform(multipart(SUBMIT).file(json(validRequest("0912348899"))).file(file)
                            .with(user(UserPrincipal.create(owner))))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
        }
        MockMultipartHttpServletRequestBuilder tooMany = multipart(SUBMIT).file(json(validRequest("0912348899")));
        for (int i = 0; i < 11; i++) tooMany.file(pdf("proof-" + i + ".pdf"));
        mvc.perform(tooMany.with(user(UserPrincipal.create(owner))))
                .andExpect(status().isBadRequest());
        assertThat(ownedDisputes(owner)).isZero();
        verify(storage, never()).uploadDisputeFile(any());
    }

    @Test
    void uploadFailureRollsBackNewDisputeAndDeletesPreviouslyUploadedObject() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        when(storage.uploadDisputeFile(any())).thenAnswer(invocation -> {
            if (calls.incrementAndGet() == 2) throw new DisputeStorageException("Upload provider unavailable");
            return new SupabaseStorageService.UploadResult("s3://dispute-evidences/disputes/rollback.pdf",
                    "private-file-hash", "disputes/rollback.pdf", "first.pdf");
        });
        mvc.perform(multipart(SUBMIT).file(json(validRequest("0912348899")))
                        .file(pdf("first.pdf")).file(pdf("second.pdf")).with(user(UserPrincipal.create(owner))))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.isSuccess").value(false));
        assertThat(ownedDisputes(owner)).isZero();
        verify(storage).deleteDisputeFile("disputes/rollback.pdf");
        Long evidenceCount = transactions.execute(ignored -> entityManager.createQuery(
                "select count(e) from DisputeEvidence e where e.dispute.submittedByUser.id = :owner", Long.class)
                .setParameter("owner", owner.getId()).getSingleResult());
        assertThat(evidenceCount).isZero();
    }

    @Test
    void failureGeneratingPrivateDownloadLinkRollsBackTheSubmissionAndCleansUploadedFile() throws Exception {
        when(storage.createDisputeDownloadUrl(anyString())).thenThrow(new DisputeStorageException("Cannot sign file URL"));
        mvc.perform(multipart(SUBMIT).file(json(validRequest("0912348899"))).file(pdf("proof.pdf"))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.isSuccess").value(false));
        assertThat(ownedDisputes(owner)).isZero();
        verify(storage).deleteDisputeFile("disputes/private-1.pdf");
    }

    @Test
    void failedDraftUpdateKeepsOriginalTextAndEvidenceAndDoesNotDeleteRetainedFile() throws Exception {
        MvcResult created = createDraft(owner, "{\"reason\":\"Original draft\"}", pdf("original.pdf"));
        Long draftId = responseId(created);
        long evidenceId = jsonResponse(created).path("data").path("attachments").get(0).path("id").asLong();
        AtomicInteger calls = new AtomicInteger();
        when(storage.uploadDisputeFile(any())).thenAnswer(invocation -> {
            if (calls.incrementAndGet() == 2) throw new DisputeStorageException("Upload provider unavailable");
            return new SupabaseStorageService.UploadResult("s3://dispute-evidences/disputes/partial.pdf",
                    "private-file-hash", "disputes/partial.pdf", "first.pdf");
        });
        mvc.perform(updateDraft(draftId, "{\"reason\":\"Changed draft\",\"removedEvidenceIds\":[" + evidenceId + "]}")
                        .file(pdf("first.pdf")).file(pdf("second.pdf")).with(user(UserPrincipal.create(owner))))
                .andExpect(status().isServiceUnavailable());
        transactions.executeWithoutResult(ignored -> {
            assertThat(entityManager.find(Dispute.class, draftId).getReason()).isEqualTo("Original draft");
            assertThat(entityManager.find(DisputeEvidence.class, evidenceId)).isNotNull();
        });
        verify(storage).deleteDisputeFile("disputes/partial.pdf");
        verify(storage, never()).deleteDisputeFile("disputes/private-1.pdf");
        assertDraftStillSaved(draftId, 1);
    }

    @Test
    void submissionAndEveryDraftEndpointRequireAuthentication() throws Exception {
        mvc.perform(multipart(SUBMIT).file(json(validRequest("0912348899"))).file(pdf("proof.pdf")))
                .andExpect(status().isUnauthorized());
        mvc.perform(multipart(DRAFTS).file(json("{}"))).andExpect(status().isUnauthorized());
        mvc.perform(updateDraft(1L, "{}")).andExpect(status().isUnauthorized());
        mvc.perform(get(DRAFTS)).andExpect(status().isUnauthorized());
        mvc.perform(get(DRAFTS + "/1")).andExpect(status().isUnauthorized());
        mvc.perform(multipart(DRAFTS + "/1/submit").file(json("{\"agreeTerms\":true}")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidDraftIdAndPagingReturnJson400() throws Exception {
        mvc.perform(get(DRAFTS + "/abc").with(user(UserPrincipal.create(owner))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
        MockMultipartHttpServletRequestBuilder invalidUpdate = multipart(DRAFTS + "/abc").file(json("{}"));
        invalidUpdate.with(request -> { request.setMethod("PUT"); return request; });
        mvc.perform(invalidUpdate.with(user(UserPrincipal.create(owner))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
        mvc.perform(multipart(DRAFTS + "/abc/submit").file(json(validRequest("0912348899")))
                        .with(user(UserPrincipal.create(owner))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
        mvc.perform(get(DRAFTS).param("page", "-1").with(user(UserPrincipal.create(owner))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
        mvc.perform(get(DRAFTS).param("size", "51").with(user(UserPrincipal.create(owner))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void swaggerDocumentsMultipartRequestsAndAllNewEndpoints() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/disputes'].post.requestBody.content['multipart/form-data']").exists())
                .andExpect(jsonPath("$.paths['/api/disputes/drafts'].post.description").isNotEmpty())
                .andExpect(jsonPath("$.paths['/api/disputes/drafts'].get.description").isNotEmpty())
                .andExpect(jsonPath("$.paths['/api/disputes/drafts/{id}'].put.description").isNotEmpty())
                .andExpect(jsonPath("$.paths['/api/disputes/drafts/{id}'].get.description").isNotEmpty())
                .andExpect(jsonPath("$.paths['/api/disputes/drafts/{id}/submit'].post.description").isNotEmpty());
    }

    private MvcResult createDraft(User submitter, String request, MockMultipartFile... attachments) throws Exception {
        MockMultipartHttpServletRequestBuilder builder = multipart(DRAFTS).file(json(request));
        for (MockMultipartFile file : attachments) builder.file(file);
        return mvc.perform(builder.with(user(UserPrincipal.create(submitter))))
                .andExpect(status().is2xxSuccessful()).andReturn();
    }

    private int submitStatus(User submitter) throws Exception {
        return mvc.perform(multipart(SUBMIT).file(json(validRequest("0912348899"))).file(pdf("proof.pdf"))
                        .with(user(UserPrincipal.create(submitter))))
                .andReturn().getResponse().getStatus();
    }

    private MockMultipartHttpServletRequestBuilder updateDraft(Long id, String request) {
        MockMultipartHttpServletRequestBuilder builder = multipart(DRAFTS + "/" + id).file(json(request));
        builder.with(servletRequest -> { servletRequest.setMethod("PUT"); return servletRequest; });
        return builder;
    }

    private void assertDraftStillSaved(Long id, int evidenceCount) throws Exception {
        mvc.perform(get(DRAFTS + "/" + id).with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.attachments.length()").value(evidenceCount));
    }

    private String validRequest(String indicatorValue) {
        return "{\"indicatorType\":\"PHONE\",\"indicatorValue\":\"" + indicatorValue
                + "\",\"legalRelationship\":\"OWNER\",\"reason\":\"Số điện thoại chính chủ, đề nghị xem xét gỡ nhãn sai.\",\"agreeTerms\":true}";
    }

    private MockMultipartFile json(String value) {
        return new MockMultipartFile("request", "", MediaType.APPLICATION_JSON_VALUE, value.getBytes(StandardCharsets.UTF_8));
    }

    private MockMultipartFile pdf(String fileName) {
        return new MockMultipartFile("files", fileName, "application/pdf", PDF);
    }

    private byte[] oversizedPdf() {
        byte[] bytes = new byte[5 * 1024 * 1024 + 1];
        System.arraycopy(PDF, 0, bytes, 0, PDF.length);
        return bytes;
    }

    private JsonNode jsonResponse(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private Long responseId(MvcResult result) throws Exception {
        return jsonResponse(result).path("data").path("id").asLong();
    }

    private long ownedDisputes(User account) {
        return transactions.execute(ignored -> entityManager.createQuery(
                "select count(d) from Dispute d where d.submittedByUser.id = :owner", Long.class)
                .setParameter("owner", account.getId()).getSingleResult());
    }

    private User account(String label) {
        String suffix = UUID.randomUUID().toString();
        User account = User.builder().fullName(label).phoneNumber("09" + suffix.substring(0, 8))
                .email(label + "-" + suffix + "@example.test").passwordHash("private-password-hash")
                .status("ACTIVE").createdAt(NOW.minusDays(1)).updatedAt(NOW.minusDays(1)).build();
        entityManager.persist(account);
        return account;
    }

    private ConfirmedIndicator confirmed(String type, String value, String confirmationStatus) {
        Indicator indicator = Indicator.builder().type(type).normalizedValue(value).displayValue(value)
                .createdAt(NOW.minusDays(10)).updatedAt(NOW.minusDays(10)).build();
        entityManager.persist(indicator);
        indicatorIds.add(indicator.getId());
        ConfirmedIndicator row = ConfirmedIndicator.builder().indicator(indicator).status(confirmationStatus)
                .confirmedByUser(other).confirmedAt(NOW.minusDays(10)).publicReason("Đã xác thực nguy cơ.").build();
        entityManager.persist(row);
        confirmedIds.add(row.getId());
        return row;
    }
}
