import { publicApi } from "@/lib/api/instance";
import { decodeJwt } from "@/lib/utils/jwtUtil";
import { useAuthStore } from "@/store/auth.store";
import { User, UserRole } from "@/types/user";
import axios from "axios";
import { RegisterGoogleRequest } from "@/features/auth/types/auth.types";

export interface RefreshTokenResult {
    accessToken: string;
    user: User | null;
    role: UserRole | null;
}

let activeRefreshPromise: Promise<RefreshTokenResult> | null = null;

export interface VerifyContactsResult {
    verificationToken: string;
    expiresAt: string;
}

export interface RegisterPersonalPayload {
    fullName: string;
    phoneNumber: string;
    email: string;
    password: string;
    verificationToken: string;
    agreeTerms: boolean;
    receiveAlerts: boolean;
}

export interface RegisterPartnerPayload {
    legalName: string;
    taxCode: string;
    corporateEmail: string;
    verificationToken: string;
    password?: string;
    representativeNameAndTitle: string;
    contactPhone: string;
    officialDomains: string;
    officialHotlines: string;
    smsBrandNames: string;
    legalRepresentative: boolean;
    agreeTerms: boolean;
}

export interface RegisterPartnerFiles {
    businessLicenseFiles: File[];
    ownershipProofFiles: File[];
    authorizationFiles: File[];
}

export interface RegisterPartnerResponseData {
    registrationId: number;
    userId: number;
    verificationStatus: string;
    submittedAt: string;
}

export class PartnerRegistrationOutcomeUnknownError extends Error {}

export type PartnerUploadProgress = {
    stage: "precheck" | "upload" | "finalize";
    completedFiles: number;
    totalFiles: number;
    fileProgress: number[];
    fileNames: string[];
    totalPercent: number;
};

function uploadPartnerFile(
    url: string,
    file: File,
    onProgress: (loaded: number) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("PUT", url);
        request.setRequestHeader("Content-Type", file.type);
        request.upload.onprogress = (event) => onProgress(event.loaded);
        request.onload = () =>
            request.status >= 200 && request.status < 300
                ? resolve()
                : reject(new Error(`Không tải được tài liệu ${file.name}.`));
        request.onerror = () =>
            reject(new Error(`Không tải được tài liệu ${file.name}.`));
        request.send(file);
    });
}

function extractErrorMessage(error: unknown, fallback: string): string {
    const vietnameseMessage = (value: unknown): string | undefined => {
        if (typeof value !== "string") return undefined
        const message = value.trim()
        // Keep useful Vietnamese API messages, without exposing raw HTTP errors.
        return /[À-ÖØ-öø-ÿĂăĐđĨĩŨũƠơƯư\u1ea0-\u1ef9]/.test(message) && !/<[^>]+>/.test(message)
            ? message
            : undefined
    }

    if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
            return "Máy chủ phản hồi quá lâu. Vui lòng thử lại sau."
        }
        if (!error.response) {
            return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại."
        }

        const data = error.response?.data
        const details = data?.data
        if (error.response.status === 400 && details && typeof details === "object" && !Array.isArray(details)) {
            for (const value of Object.values(details)) {
                const message = vietnameseMessage(value)
                if (message) return message
            }
        }

        const message = vietnameseMessage(data?.message) || vietnameseMessage(data?.error)
        if (message) return message

        const statusMessages: Record<number, string> = {
            400: "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.",
            401: "Phiên xác thực đã hết hạn hoặc không hợp lệ. Vui lòng xác thực lại.",
            403: "Yêu cầu không được phép thực hiện. Vui lòng thử lại hoặc liên hệ hỗ trợ.",
            404: "Không tìm thấy dịch vụ được yêu cầu. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.",
            409: "Thông tin đăng ký đã được sử dụng. Vui lòng kiểm tra email và số điện thoại.",
            429: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại.",
        }
        if (error.response.status >= 500) {
            return "Dịch vụ đang gặp sự cố. Vui lòng thử lại sau."
        }
        return statusMessages[error.response.status] || fallback
    }
    return error instanceof Error ? vietnameseMessage(error.message) || fallback : fallback
}

export const authServices = {
    setupPartnerPassword: async function (token: string, newPassword: string) {
        try {
            const response = await publicApi.post("/auth/partner-password/setup", { token, newPassword })
            if (response.data?.isSuccess !== true) {
                throw new Error(response.data?.message || "Không thể đặt mật khẩu.")
            }
        } catch (cause) {
            throw new Error(extractErrorMessage(cause, "Không thể đặt mật khẩu. Vui lòng thử lại."))
        }
    },
    loginByForm: async function (identifier: string, password: string) {
        try {
            const response = await publicApi.post("/auth/login", {
                usernameOrPhoneNumber: identifier.trim(),
                password,
            })
            const data = response.data

            const { setToken } = useAuthStore.getState()
            const accessToken = data?.data?.accessToken || data?.accessToken
            if (!accessToken) {
                throw new Error("Invalid access token")
            }
            setToken(accessToken)
    
            const decoded = decodeJwt(accessToken)
            return { role: (decoded?.role || "") }
        } catch {
            throw new Error("Tài khoản/mật khẩu không chính xác")
        }
    },
    refreshToken: async function (): Promise<RefreshTokenResult> {
        if (activeRefreshPromise) {
            return activeRefreshPromise
        }

        activeRefreshPromise = (async () => {
            try {
                const response = await publicApi.post("/auth/refresh-token", {})
                const data = response.data

                const accessToken = data?.data?.accessToken || data?.accessToken
                if (!accessToken) {
                    throw new Error("No access token returned from refresh API")
                }

                useAuthStore.getState().setToken(accessToken)

                let currentUser: User | null = null
                let currentRole: UserRole | null = null

                const decoded = decodeJwt(accessToken)
                if (decoded?.id && decoded?.email && decoded?.role) {
                    currentUser = {
                        userId: String(decoded.id),
                        email: decoded.email,
                        role: decoded.role as UserRole,
                    }
                    currentRole = decoded.role as UserRole
                    useAuthStore.getState().setUser(currentUser)
                } else if (decoded?.role) {
                    currentRole = decoded.role as UserRole
                }

                return {
                    accessToken,
                    user: currentUser,
                    role: currentRole,
                }
            } finally {
                activeRefreshPromise = null
            }
        })()

        return activeRefreshPromise
    },
    logout: async function () {
        try {
            const response = await publicApi.post("/auth/logout",{})
            const data = response.data
            useAuthStore.getState().logout()
            return {message: data.message}
        } catch (error) {
            let message = "Đăng xuất thất bại."
            if (axios.isAxiosError(error)) {
                message = error.response?.data?.message || message
            }
            throw new Error(message)
        }
    },
    sendPhoneOtp: async function (phoneNumber: string, recaptchaToken: string) {
        try {
            // Backend uses @RequestParam, so send form-urlencoded (token is too long for a query string)
            const body = new URLSearchParams({ phoneNumber, recaptchaToken })
            const response = await publicApi.post("/auth/send-phone-otp", body, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            })
            if (response.data?.isSuccess !== true) {
                throw new Error(
                    response.data?.message || "Không thể gửi mã OTP. Vui lòng thử lại."
                )
            }
            return { message: response.data?.message as string }
        } catch (error) {
            throw new Error(extractErrorMessage(error, "Không thể gửi mã OTP."))
        }
    },
    verifyContacts: async function (
        phoneNumber: string,
        phoneOtp: string
    ): Promise<VerifyContactsResult> {
        try {
            const response = await publicApi.post("/auth/verify-contacts", {
                phoneNumber,
                phoneOtp,
            })
            const result = response.data?.data
            if (response.data?.isSuccess !== true) {
                throw new Error(
                    response.data?.message || "Xác thực OTP thất bại. Vui lòng kiểm tra mã và thử lại."
                )
            }
            if (
                typeof result?.verificationToken !== "string" ||
                !/^[A-Za-z0-9_-]{43}$/.test(result.verificationToken) ||
                typeof result?.expiresAt !== "string" ||
                !result.expiresAt
            ) {
                throw new Error("Không nhận được mã xác nhận điện thoại hợp lệ. Vui lòng gửi mã OTP mới.")
            }
            return result as VerifyContactsResult
        } catch (error) {
            throw new Error(extractErrorMessage(error, "Xác thực OTP thất bại."))
        }
    },
    registerPersonal: async function (payload: RegisterPersonalPayload) {
        try {
            const response = await publicApi.post("/auth/register/personal", payload)
            return { message: response.data?.message as string }
        } catch (error) {
            throw new Error(extractErrorMessage(error, "Đăng ký thất bại."))
        }
    },
    registerPartner: async function (
        requestData: RegisterPartnerPayload,
        files: RegisterPartnerFiles,
        onProgress?: (progress: PartnerUploadProgress) => void
    ) {
        let finalizing = false;
        let draftToken: string | undefined;
        try {
            const documents = [
                ...files.businessLicenseFiles.map((file) => ({
                    file,
                    documentType: "BUSINESS_LICENSE",
                })),
                ...files.ownershipProofFiles.map((file) => ({
                    file,
                    documentType: "OWNERSHIP_PROOF",
                })),
                ...files.authorizationFiles.map((file) => ({
                    file,
                    documentType: "AUTHORIZATION",
                })),
            ];
            onProgress?.({
                stage: "precheck",
                completedFiles: 0,
                totalFiles: documents.length,
                fileProgress: documents.map(() => 0),
                fileNames: documents.map(({ file }) => file.name),
                totalPercent: 0,
            });
            const precheck = await publicApi.post(
                "/partners/registrations/precheck",
                {
                    registration: requestData,
                    documents: documents.map(({ file, documentType }) => ({
                        documentType,
                        fileName: file.name,
                        contentType: file.type,
                        fileSize: file.size,
                    })),
                }
            );
            const precheckData = precheck.data?.data;
            if (
                !precheck.data?.isSuccess ||
                !precheckData?.draftToken ||
                !Array.isArray(precheckData.uploads)
            ) {
                throw new Error(
                    precheck.data?.message || "Không thể bắt đầu tải tài liệu."
                );
            }
            draftToken = precheckData.draftToken as string;
            const loaded = documents.map(() => 0);
            let completed = 0;
            let next = 0;
            const report = () =>
                onProgress?.({
                    stage: "upload",
                    completedFiles: completed,
                    totalFiles: documents.length,
                    fileProgress: documents.map(({ file }, index) =>
                        Math.round((loaded[index] / file.size) * 100)
                    ),
                    fileNames: documents.map(({ file }) => file.name),
                    totalPercent: Math.round(
                        (loaded.reduce((sum, bytes) => sum + bytes, 0) /
                            documents.reduce(
                                (sum, { file }) => sum + file.size,
                                0
                            )) *
                            100
                    ),
                });
            report();
            const heartbeat = window.setInterval(
                () => {
                    void publicApi
                        .post(`/partners/registrations/${draftToken}/refresh`)
                        .catch(() => {});
                },
                5 * 60 * 1000
            );
            try {
                await Promise.all(
                    Array.from(
                        { length: Math.min(3, documents.length) },
                        async () => {
                            while (next < documents.length) {
                                const index = next++;
                                const file = documents[index].file;
                                let target = precheckData.uploads.find(
                                    (item: { documentIndex: number }) =>
                                        item.documentIndex === index
                                );
                                if (!target)
                                    throw new Error(
                                        "Thông tin tài liệu tải lên không khớp."
                                    );
                                for (let attempt = 0; attempt < 3; attempt++) {
                                    try {
                                        await uploadPartnerFile(
                                            target.uploadUrl,
                                            file,
                                            (bytes) => {
                                                loaded[index] = bytes;
                                                report();
                                            }
                                        );
                                        loaded[index] = file.size;
                                        completed++;
                                        report();
                                        break;
                                    } catch (uploadError) {
                                        if (attempt === 2) throw uploadError;
                                        await new Promise((resolve) =>
                                            window.setTimeout(
                                                resolve,
                                                500 * 2 ** attempt
                                            )
                                        );
                                        const renewed = await publicApi.post(
                                            `/partners/registrations/${draftToken}/uploads/${index}/renew`
                                        );
                                        target = renewed.data.data;
                                        loaded[index] = 0;
                                    }
                                }
                            }
                        }
                    )
                );
            } finally {
                window.clearInterval(heartbeat);
            }
            finalizing = true;
            onProgress?.({
                stage: "finalize",
                completedFiles: completed,
                totalFiles: documents.length,
                fileProgress: documents.map(() => 100),
                fileNames: documents.map(({ file }) => file.name),
                totalPercent: 100,
            });
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const finalized = await publicApi.post(
                        "/partners/registrations/finalize",
                        { draftToken },
                        { timeout: 0 }
                    );
                    return finalized.data?.data;
                } catch (error) {
                    if (
                        attempt === 2 ||
                        !axios.isAxiosError(error) ||
                        (error.response &&
                            error.response.status < 500 &&
                            error.response.status !== 409)
                    )
                        throw error;
                    await new Promise((resolve) =>
                        window.setTimeout(resolve, 1000 * 2 ** attempt)
                    );
                }
            }
        } catch (error) {
            if (
                finalizing &&
                draftToken &&
                axios.isAxiosError(error) &&
                (!error.response ||
                    error.response.status >= 500 ||
                    (error.response.status === 409 &&
                        String(error.response.data?.message).includes(
                            "đang được xử lý"
                        )))
            ) {
                for (let attempt = 0; attempt < 6; attempt++) {
                    await new Promise((resolve) =>
                        window.setTimeout(resolve, 2000)
                    );
                    try {
                        const status = await publicApi.get(
                            `/partners/registrations/${draftToken}/status`
                        );
                        if (status.data?.data?.status === "COMPLETED")
                            return status.data.data.registration;
                        if (status.data?.data?.status === "EXPIRED") break;
                    } catch {
                        /* Keep checking while the backend may still be committing. */
                    }
                }
                throw new PartnerRegistrationOutcomeUnknownError(
                    "Chưa thể xác nhận kết quả đăng ký. Hồ sơ có thể đã được gửi; vui lòng kiểm tra trạng thái trước khi đăng ký lại."
                );
            }
            throw new Error(
                extractErrorMessage(error, "Đăng ký đối tác thất bại.")
            );
        }
    },
    loginGoogle: async function (idToken: string) {
        try {
            const response = await publicApi.post("/auth/login/google", {
                idToken: idToken.trim(),
            })
            const data = response.data
            const accessToken = data?.data?.accessToken || data?.accessToken
            if (!accessToken) {
                throw new Error("Không nhận được access token từ máy chủ")
            }
            useAuthStore.getState().setToken(accessToken)
            const decoded = decodeJwt(accessToken)
            return {
                role: (decoded?.role || ""),
                message: data?.message || "Đăng nhập Google thành công",
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status
                const msg = error.response?.data?.message || error.response?.data?.error
                if (status === 404) {
                    throw new Error(msg || "Tài khoản Google này chưa được đăng ký trong hệ thống. Vui lòng đăng ký trước.")
                }
                if (status === 401 || status === 403) {
                    throw new Error(msg || "Tài khoản bị tạm khóa hoặc không có quyền truy cập.")
                }
                if (msg) {
                    throw new Error(msg)
                }
            }
            throw new Error(error instanceof Error ? error.message : "Đăng nhập Google thất bại.")
        }
    },
    registerGoogle: async function (payload: RegisterGoogleRequest) {
        try {
            if (!/^[A-Za-z0-9_-]{43}$/.test(payload.verificationToken)) {
                throw new Error("Vui lòng xác thực số điện thoại trước khi đăng ký.")
            }
            const response = await publicApi.post("/auth/register/google", payload)
            const data = response.data
            if (data?.isSuccess !== true) {
                throw new Error(data?.message || "Đăng ký tài khoản qua Google thất bại.")
            }
            const accessToken = data?.data?.accessToken
            const decoded = typeof accessToken === "string"
                ? decodeJwt(accessToken)
                : null
            if (!decoded?.id || !decoded.email || decoded.role !== "REGISTERED_USER") {
                throw new Error("Không nhận được phiên đăng nhập hợp lệ sau khi đăng ký. Vui lòng thử đăng nhập bằng Google.")
            }
            useAuthStore.getState().setUser({
                userId: String(decoded.id),
                email: decoded.email,
                role: decoded.role,
            })
            useAuthStore.getState().setToken(accessToken)
            return {
                message: data?.message || "Đăng ký tài khoản qua Google thành công",
                accessToken,
            }
        } catch (error: unknown) {
            throw new Error(extractErrorMessage(error, "Đăng ký tài khoản qua Google thất bại. Vui lòng thử lại."))
        }
    },
}
