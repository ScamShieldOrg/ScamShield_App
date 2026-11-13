export interface LoginGoogleRequest {
  idToken: string
}

export interface RegisterGoogleRequest {
  idToken: string
  phoneNumber: string
  verificationToken: string
  agreeTerms: boolean
  receiveAlerts: boolean
}

export interface GoogleAuthResponse {
  accessToken: string
}

export interface GoogleUserPayload {
  email?: string
  name?: string
  picture?: string
  sub?: string
  email_verified?: boolean
}
