import { useAuthStore } from "@/store/auth.store"
import axios from "axios"
import { authServices } from "@/features/auth/services/auth-services"

const BE_URL = process.env.NEXT_PUBLIC_BE_URL

const publicApi = axios.create({
    baseURL: BE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
})

const authorizeApi = axios.create({
    baseURL: BE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
})

publicApi.interceptors.request.use((config) => {
    // Tránh trùng lặp /api/api khi baseURL đã có /api
    if (config.url && config.baseURL?.endsWith("/api") && config.url.startsWith("/api/")) {
        config.url = config.url.replace(/^\/api\//, "/")
    }
    return config
})

authorizeApi.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token
    if (token) {
        config.headers["Authorization"] = `Bearer ${token}`
    }
    // Khi gửi FormData (file upload), xóa Content-Type để Axios và browser tự sinh boundary
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        delete config.headers["Content-Type"]
        if (typeof config.headers?.delete === "function") {
            config.headers.delete("Content-Type")
        }
    }
    // Tránh trùng lặp /api/api khi baseURL đã có /api
    if (config.url && config.baseURL?.endsWith("/api") && config.url.startsWith("/api/")) {
        config.url = config.url.replace(/^\/api\//, "/")
    }
    return config
})

authorizeApi.interceptors.response.use(
    (response) => {
        return response
    },
    async (error) => {
        const originalRequest = error.config

        const isTokenExpired =
            error.response?.status === 401 &&
            error.response?.data?.message === "Token expired"

        if (isTokenExpired && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                const result = await authServices.refreshToken()
                if (result?.accessToken) {
                    originalRequest.headers["Authorization"] = `Bearer ${result.accessToken}`
                    return authorizeApi(originalRequest)
                }
            } catch (refreshError) {
                useAuthStore.getState().logout()
                return Promise.reject(refreshError)
            }
        }

        if (error.response?.status === 401 && !isTokenExpired) {
            useAuthStore.getState().logout()
        }

        return Promise.reject(error)
    }
)

export { publicApi, authorizeApi }
