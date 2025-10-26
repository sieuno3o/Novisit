// jwt 발급 검증 파일

import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret'
 
// JWT 안에 들어있는 내용
export interface JwtPayload {
  id: string
  name: string
  email: string
}

// Access, Refresh Token 발급
export function generateTokens(payload: JwtPayload) {
  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: '30m' })
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '30d' })
  return { accessToken, refreshToken }
}

// Access Token 검증
export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, ACCESS_SECRET) as JwtPayload
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') throw new Error('ACCESS_TOKEN_EXPIRED')
    throw new Error('ACCESS_TOKEN_INVALID')
  }
}

// Refresh Token 검증
export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, REFRESH_SECRET) as JwtPayload
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') throw new Error('REFRESH_TOKEN_EXPIRED')
    throw new Error('REFRESH_TOKEN_INVALID')
  }
}
