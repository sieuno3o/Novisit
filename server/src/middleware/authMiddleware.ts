// jwt 인증 관련 처리 미들웨어 
import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, JwtPayload } from '../auth/jwt.js'

// Request 타입 확장. req.user와 req.userId를 추가합니다.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      userId?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  
  const authHeader = req.headers.authorization
  //클라이언트가 요청 시 Authorization: Bearer <accessToken> 헤더를 보내야 함.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '토큰이 필요합니다.' })
  }

  const token = authHeader.split(' ')[1] as string

  try {
    const decoded = verifyAccessToken(token)
    req.user = decoded
    req.userId = decoded.id // JWT payload의 id를 req.userId에 할당
    return next()
  } catch (err: any) {
    if (err.message.includes('EXPIRED')) {
      return res.status(401).json({ message: 'AccessToken 만료' })
    }
    return res.status(403).json({ message: '유효하지 않은 AccessToken' })
  }
}
