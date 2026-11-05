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

authorizeApi.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token
    if (token) {
        config.headers["Authorization"] = `Bearer ${token}`
    }
    return config
})

authorizeApi.interceptors.response.use(
    (response) => {
        return response
    },
    async (error) => {
        const originalRequest = error.config
        if (originalRequest?.responseType === "stream" && error.response?.status === 401
            && typeof ReadableStream !== "undefined" && error.response.data instanceof ReadableStream) {
            try { error.response.data = await new Response(error.response.data).json() } catch { /* Keep normal unauthorized handling. */ }
        }

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
