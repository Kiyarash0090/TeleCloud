import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { Api } from 'telegram/tl/index.js';
import { CustomFile } from 'telegram/client/uploads.js';
import { computeCheck } from 'telegram/Password.js';
import crypto from 'crypto';
import bigInt from 'big-integer';
import { spawn } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Multer configured STRICTLY in RAM memory (no disk storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 500, // 500MB per upload in RAM buffer
  },
});

// App configuration from environment
const APP_USERNAME = process.env.APP_USERNAME || 'admin';
const APP_PASSWORD = process.env.APP_PASSWORD || 'telecloudpassword123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'telecloud-secret-2026';

// AES-256-GCM Encryption / Decryption for Remember Me Sessions
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SESSION_SECRET).digest();

export interface SessionPayload {
  apiId: number;
  apiHash: string;
  sessionString: string;
  user?: any;
  createdAt: number;
}

export function encryptSession(payload: SessionPayload): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const jsonStr = JSON.stringify(payload);
  let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSession(token: string): SessionPayload | null {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    return null;
  }
}

// In-Memory Telegram Client sessions cache (Key: Session ID / User token)
interface ActiveTelegramSession {
  client: TelegramClient;
  apiId: number;
  apiHash: string;
  stringSession: string;
  phoneCodeHash?: string;
  phoneNumber?: string;
  awaiting2FA?: boolean;
  user?: {
    id: string;
    firstName: string;
    lastName?: string;
    username?: string;
    phone?: string;
  };
  connectedAt: Date;
}

const activeSessions = new Map<string, ActiveTelegramSession>();
const pendingAuthSessions = new Map<string, ActiveTelegramSession>();
const clientPool = new Map<string, TelegramClient>();
const userClientMap = new Map<string, TelegramClient>();
const profilePhotoCache = new Map<string, { buffer: Buffer; cachedAt: number }>();

// In-Memory async upload task queue tracker
export interface UploadTask {
  id: string;
  filename: string;
  size: number;
  progress: number;
  status: 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  speed: string;
  startedAt?: number;
  error?: string;
  messageId?: number;
}

const activeUploadQueues = new Map<string, UploadTask[]>();

// Helper to get or validate session from cookie or header
function getSessionId(req: Request): string {
  return (req.cookies?.telecloud_sid as string) || (req.headers['x-telecloud-session'] as string) || 'default_session';
}

function getActiveClient(sessionId: string): TelegramClient | null {
  const session = activeSessions.get(sessionId);
  if (session && session.client) {
    return session.client;
  }
  return null;
}

// Helper to determine accurate standard MIME type
function getAccurateMimeType(filename: string, existingMime?: string): string {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  
  const mimeMap: Record<string, string> = {
    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogv: 'video/ogg',
    mov: 'video/quicktime',
    m4v: 'video/mp4',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    flv: 'video/x-flv',
    '3gp': 'video/3gpp',
    m2ts: 'video/mp2t',
    
    // Audio
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    opus: 'audio/opus',
    wav: 'audio/wav',
    weba: 'audio/webm',
    flac: 'audio/flac',
    wma: 'audio/x-ms-wma',
    
    // Image
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    heic: 'image/heic',
    
    // Documents
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    csv: 'text/csv',
    html: 'text/html',
    js: 'application/javascript',
    ts: 'application/typescript',
    css: 'text/css',
    xml: 'application/xml',
    
    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  };

  if (mimeMap[ext]) {
    return mimeMap[ext];
  }

  if (existingMime && existingMime !== 'application/octet-stream' && existingMime !== 'application/download') {
    return existingMime;
  }

  return 'application/octet-stream';
}

// Helper to determine file category
function getCategoryFromMimeAndExt(mimeType: string, filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'tiff'];
  const videoExts = ['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'wmv', 'm4v', '3gp', 'ts'];
  const audioExts = ['mp3', 'ogg', 'wav', 'flac', 'm4a', 'aac', 'opus', 'wma', 'oga'];
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'tgz'];
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'json', 'csv', 'xml', 'html', 'js', 'ts', 'py', 'cpp', 'c', 'log'];

  if (mimeType.startsWith('image/') || imageExts.includes(ext)) return 'images';
  if (mimeType.startsWith('video/') || videoExts.includes(ext)) return 'videos';
  if (mimeType.startsWith('audio/') || audioExts.includes(ext)) return 'audio';
  if (archiveExts.includes(ext)) return 'archives';
  if (mimeType.startsWith('text/') || docExts.includes(ext) || mimeType.includes('pdf') || mimeType.includes('document')) return 'documents';
  
  return 'other';
}

// ----------------------------------------------------
// 1. Web App Authentication (Configured via .env)
// ----------------------------------------------------
app.post('/api/auth/web-login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!APP_USERNAME || !APP_PASSWORD) {
    // No credentials required if not configured
    res.cookie('telecloud_auth', 'authenticated', { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000 });
    return res.json({ success: true, message: 'Authenticated' });
  }

  if (username === APP_USERNAME && password === APP_PASSWORD) {
    res.cookie('telecloud_auth', 'authenticated', { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000 });
    return res.json({ success: true, message: 'Login successful' });
  }

  return res.status(401).json({ success: false, error: 'Invalid username or password' });
});

app.get('/api/auth/web-status', (req: Request, res: Response) => {
  const isAuthProtected = Boolean(APP_USERNAME && APP_PASSWORD);
  const isAuthenticated = !isAuthProtected || req.cookies?.telecloud_auth === 'authenticated';
  res.json({
    isAuthProtected,
    isAuthenticated,
    defaultApiId: process.env.TELEGRAM_API_ID ? Number(process.env.TELEGRAM_API_ID) : undefined,
    hasDefaultApiHash: Boolean(process.env.TELEGRAM_API_HASH),
  });
});

app.post('/api/auth/web-logout', (req: Request, res: Response) => {
  res.clearCookie('telecloud_auth');
  res.json({ success: true });
});

// Helper to parse and format Telegram RPC errors with friendly localized messages
function formatTelegramError(err: any): { error: string; code: string; help?: string } {
  const msg = (err?.errorMessage || err?.message || '').toString();
  
  if (msg.includes('API_ID_INVALID') || msg.includes('400: API_ID_INVALID')) {
    return {
      code: 'API_ID_INVALID',
      error: 'The Telegram API ID or API Hash is invalid. / شناسه API یا API Hash وارد شده نامعتبر است.',
      help: 'To get your free official API ID and Hash: 1. Go to https://my.telegram.org, 2. Log in with your phone, 3. Click "API development tools", 4. Create an app and copy your api_id (numbers only) & api_hash.',
    };
  }
  if (msg.includes('PHONE_NUMBER_INVALID')) {
    return {
      code: 'PHONE_NUMBER_INVALID',
      error: 'Phone number is invalid. Please include international country code (e.g. +989123456789 or +12025550123).',
    };
  }
  if (msg.includes('PHONE_CODE_INVALID')) {
    return {
      code: 'PHONE_CODE_INVALID',
      error: 'The verification code entered is incorrect. / کد تایید وارد شده نادرست است.',
    };
  }
  if (msg.includes('PHONE_CODE_EXPIRED')) {
    return {
      code: 'PHONE_CODE_EXPIRED',
      error: 'The verification code has expired. Please request a new code.',
    };
  }
  if (msg.includes('PHONE_NUMBER_BANNED')) {
    return {
      code: 'PHONE_NUMBER_BANNED',
      error: 'This phone number is banned on Telegram.',
    };
  }
  if (msg.includes('FLOOD_WAIT')) {
    return {
      code: 'FLOOD_WAIT',
      error: 'Telegram rate limit reached (FLOOD_WAIT). Please wait a few minutes before trying again.',
    };
  }
  if (msg.includes('PASSWORD_HASH_INVALID')) {
    return {
      code: 'PASSWORD_HASH_INVALID',
      error: 'Incorrect Two-Step Verification (2FA) password.',
    };
  }

  return {
    code: err?.errorMessage || 'UNKNOWN_ERROR',
    error: err?.errorMessage || err?.message || 'Failed to connect to Telegram servers',
  };
}

// ----------------------------------------------------
// 2. Telegram MTProto Authentication Flows
// ----------------------------------------------------

// Step 1: Send OTP code to phone number
app.post('/api/telegram/send-code', async (req: Request, res: Response) => {
  try {
    let { apiId, apiHash, phoneNumber } = req.body;
    
    // Fallback to environment variables if not supplied
    if (!apiId && process.env.TELEGRAM_API_ID) {
      apiId = process.env.TELEGRAM_API_ID;
    }
    if (!apiHash && process.env.TELEGRAM_API_HASH) {
      apiHash = process.env.TELEGRAM_API_HASH;
    }

    if (!apiId || !apiHash || !phoneNumber) {
      return res.status(400).json({ 
        code: 'MISSING_FIELDS',
        error: 'API ID, API Hash, and Phone Number are required. Get them from my.telegram.org.' 
      });
    }

    const cleanApiId = String(apiId).trim();
    const cleanApiHash = String(apiHash).trim();
    let cleanPhone = String(phoneNumber).trim().replace(/\s+/g, '');
    if (!cleanPhone.startsWith('+') && /^\d+$/.test(cleanPhone)) {
      cleanPhone = `+${cleanPhone}`;
    }

    const numericApiId = Number(cleanApiId);
    if (isNaN(numericApiId) || numericApiId <= 0) {
      return res.status(400).json({ 
        code: 'API_ID_INVALID',
        error: 'API ID must be a valid positive integer (numbers only, e.g. 12345678).' 
      });
    }

    if (cleanApiHash.length < 10) {
      return res.status(400).json({ 
        code: 'API_HASH_INVALID',
        error: 'API Hash must be a valid 32-character hexadecimal string from my.telegram.org.' 
      });
    }

    const sessionId = getSessionId(req) || `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const stringSession = new StringSession('');
    const client = new TelegramClient(stringSession, numericApiId, cleanApiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    const { phoneCodeHash, isCodeViaApp } = await client.sendCode(
      {
        apiId: numericApiId,
        apiHash: cleanApiHash,
      },
      cleanPhone
    );

    pendingAuthSessions.set(sessionId, {
      client,
      apiId: numericApiId,
      apiHash: cleanApiHash,
      stringSession: client.session.save() as unknown as string,
      phoneCodeHash,
      phoneNumber: cleanPhone,
      connectedAt: new Date(),
    });

    res.cookie('telecloud_sid', sessionId, { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000 });

    return res.json({
      success: true,
      sessionId,
      phoneCodeHash,
      isCodeViaApp,
      message: 'Verification code sent to your Telegram app / SMS',
    });
  } catch (err: any) {
    console.error('Error sending Telegram code:', err);
    const formatted = formatTelegramError(err);
    return res.status(400).json(formatted);
  }
});

// Step 2: Sign in with OTP Code & optional 2FA Cloud Password
app.post('/api/telegram/sign-in', async (req: Request, res: Response) => {
  try {
    const { phoneCode, password } = req.body;
    const sessionId = getSessionId(req);
    const session = pendingAuthSessions.get(sessionId) || activeSessions.get(sessionId);

    if (!session || !session.client || !session.phoneNumber || !session.phoneCodeHash) {
      return res.status(400).json({ error: 'No active login session found. Please request a verification code first.' });
    }

    const { client, phoneNumber, phoneCodeHash } = session;

    if (!client.connected) {
      await client.connect();
    }

    if (!session.awaiting2FA) {
      if (!phoneCode || !String(phoneCode).trim()) {
        return res.status(400).json({ error: 'Verification code is required.' });
      }
      try {
        await client.invoke(
          new Api.auth.SignIn({
            phoneNumber,
            phoneCodeHash,
            phoneCode: String(phoneCode).trim(),
          })
        );
      } catch (authError: any) {
        if (
          authError.message?.includes('SESSION_PASSWORD_NEEDED') ||
          authError.errorMessage === 'SESSION_PASSWORD_NEEDED'
        ) {
          session.awaiting2FA = true;
          if (!password || !String(password).trim()) {
            let passwordHint = '';
            try {
              const pwdInfo = await client.invoke(new Api.account.GetPassword());
              passwordHint = pwdInfo.hint || '';
            } catch {
              // ignore hint error
            }
            return res.status(401).json({
              needs2FA: true,
              hint: passwordHint,
              error: 'Two-Step Verification password (2FA) is required for this account.',
            });
          }
        } else {
          throw authError;
        }
      }
    }

    if (session.awaiting2FA) {
      if (!password || !String(password).trim()) {
        return res.status(401).json({
          needs2FA: true,
          error: 'Two-Step Verification password (2FA) is required for this account.',
        });
      }
      const passwordSrpResult = await client.invoke(new Api.account.GetPassword());
      const passwordSrpCheck = await computeCheck(passwordSrpResult, String(password).trim());
      await client.invoke(
        new Api.auth.CheckPassword({
          password: passwordSrpCheck,
        })
      );
      session.awaiting2FA = false;
    }

    const me = (await client.getMe()) as any;
    const savedString = client.session.save() as unknown as string;

    session.stringSession = savedString;
    session.user = {
      id: me.id?.toString() || 'me',
      firstName: me.firstName || 'Telegram User',
      lastName: me.lastName || '',
      username: me.username || '',
      phone: me.phone || session.phoneNumber,
    };

    pendingAuthSessions.delete(sessionId);
    activeSessions.set(sessionId, session);
    clientPool.set(savedString, client);
    if (session.user.id) {
      userClientMap.set(session.user.id, client);
    }

    // Generate encrypted remember token
    const encryptedToken = encryptSession({
      apiId: session.apiId,
      apiHash: session.apiHash,
      sessionString: savedString,
      user: session.user,
      createdAt: Date.now(),
    });

    res.cookie('telecloud_remember_token', encryptedToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 3600 * 1000,
      sameSite: 'lax',
    });

    return res.json({
      success: true,
      user: session.user,
      apiId: session.apiId,
      apiHash: session.apiHash,
      sessionString: savedString,
      encryptedToken,
      message: 'Successfully connected to Telegram!',
    });
  } catch (err: any) {
    console.error('Error signing into Telegram:', err);
    const formatted = formatTelegramError(err);
    return res.status(400).json(formatted);
  }
});

// Fast Session Login using exported Session String
app.post('/api/telegram/session-login', async (req: Request, res: Response) => {
  try {
    const { apiId, apiHash, sessionString } = req.body;
    if (!apiId || !apiHash || !sessionString) {
      return res.status(400).json({ error: 'API ID, API Hash, and Session String are required' });
    }

    const numericApiId = Number(apiId);
    const cleanHash = apiHash.trim();
    const cleanSessionStr = sessionString.trim();
    const sessionId = getSessionId(req) || `sess_${Date.now()}`;

    let client = clientPool.get(cleanSessionStr);
    if (!client) {
      const strSession = new StringSession(cleanSessionStr);
      client = new TelegramClient(strSession, numericApiId, cleanHash, {
        connectionRetries: 5,
      });
      await client.connect();
    } else if (!client.connected) {
      await client.connect();
    }

    const isAuthorized = await client.isUserAuthorized();
    if (!isAuthorized) {
      clientPool.delete(cleanSessionStr);
      return res.status(401).json({ error: 'Session is expired or invalid' });
    }

    const me = (await client.getMe()) as any;
    const userData = {
      id: me.id?.toString() || 'me',
      firstName: me.firstName || 'Telegram User',
      lastName: me.lastName || '',
      username: me.username || '',
      phone: me.phone || '',
    };

    clientPool.set(cleanSessionStr, client);
    if (userData.id) {
      userClientMap.set(userData.id, client);
    }

    activeSessions.set(sessionId, {
      client,
      apiId: numericApiId,
      apiHash: cleanHash,
      stringSession: cleanSessionStr,
      user: userData,
      connectedAt: new Date(),
    });

    res.cookie('telecloud_sid', sessionId, { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000 });

    const encryptedToken = encryptSession({
      apiId: numericApiId,
      apiHash: cleanHash,
      sessionString: cleanSessionStr,
      user: userData,
      createdAt: Date.now(),
    });

    res.cookie('telecloud_remember_token', encryptedToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 3600 * 1000,
      sameSite: 'lax',
    });

    return res.json({
      success: true,
      user: userData,
      apiId: numericApiId,
      apiHash: cleanHash,
      sessionString: cleanSessionStr,
      encryptedToken,
    });
  } catch (err: any) {
    console.error('Error logging in with session:', err);
    const formatted = formatTelegramError(err);
    return res.status(400).json(formatted);
  }
});

// Restore session from encrypted token (Remember Me & Fast Multi-Account Switch)
app.post('/api/telegram/restore-session', async (req: Request, res: Response) => {
  try {
    const token = req.body.token || req.cookies?.telecloud_remember_token || req.headers['x-telecloud-remember-token'];
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'No token provided' });
    }

    const payload = decryptSession(token);
    if (!payload || !payload.apiId || !payload.apiHash || !payload.sessionString) {
      return res.status(401).json({ success: false, error: 'Invalid or corrupted session token' });
    }

    const sessionId = getSessionId(req) || `sess_${Date.now()}`;
    let client = clientPool.get(payload.sessionString);

    if (!client) {
      const stringSession = new StringSession(payload.sessionString);
      client = new TelegramClient(stringSession, payload.apiId, payload.apiHash, {
        connectionRetries: 5,
      });
      await client.connect();
    } else if (!client.connected) {
      await client.connect();
    }

    const isAuthorized = await client.isUserAuthorized();
    if (!isAuthorized) {
      clientPool.delete(payload.sessionString);
      res.clearCookie('telecloud_remember_token');
      return res.status(401).json({ success: false, error: 'Saved Telegram session has expired' });
    }

    const me = (await client.getMe()) as any;
    const userData = {
      id: me.id?.toString() || payload.user?.id || 'me',
      firstName: me.firstName || payload.user?.firstName || 'Telegram User',
      lastName: me.lastName || payload.user?.lastName || '',
      username: me.username || payload.user?.username || '',
      phone: me.phone || payload.user?.phone || '',
    };

    clientPool.set(payload.sessionString, client);
    if (userData.id) {
      userClientMap.set(userData.id, client);
    }

    activeSessions.set(sessionId, {
      client,
      apiId: payload.apiId,
      apiHash: payload.apiHash,
      stringSession: payload.sessionString,
      user: userData,
      connectedAt: new Date(),
    });

    res.cookie('telecloud_sid', sessionId, { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000 });
    res.cookie('telecloud_remember_token', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 3600 * 1000,
      sameSite: 'lax',
    });

    return res.json({
      success: true,
      user: userData,
      apiId: payload.apiId,
      apiHash: payload.apiHash,
      sessionString: payload.sessionString,
      encryptedToken: token,
    });
  } catch (err: any) {
    console.error('Error restoring session:', err);
    return res.status(500).json({ success: false, error: 'Failed to restore session' });
  }
});

// Check Telegram Connection Status (with auto-restoration from cookie if in-memory session lost)
app.get('/api/telegram/status', async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  let session = activeSessions.get(sessionId);

  // If in-memory session is missing, attempt auto-restore from remember cookie
  if (!session || !session.client) {
    const rememberToken = req.cookies?.telecloud_remember_token;
    if (rememberToken && typeof rememberToken === 'string') {
      const payload = decryptSession(rememberToken);
      if (payload && payload.apiId && payload.apiHash && payload.sessionString) {
        try {
          let client = clientPool.get(payload.sessionString);
          if (!client) {
            const stringSession = new StringSession(payload.sessionString);
            client = new TelegramClient(stringSession, payload.apiId, payload.apiHash, { connectionRetries: 3 });
            await client.connect();
          } else if (!client.connected) {
            await client.connect();
          }
          if (await client.isUserAuthorized()) {
            const me = (await client.getMe()) as any;
            const userData = {
              id: me.id?.toString() || payload.user?.id || 'me',
              firstName: me.firstName || payload.user?.firstName || 'Telegram User',
              lastName: me.lastName || payload.user?.lastName || '',
              username: me.username || payload.user?.username || '',
              phone: me.phone || payload.user?.phone || '',
            };
            clientPool.set(payload.sessionString, client);
            if (userData.id) {
              userClientMap.set(userData.id, client);
            }
            activeSessions.set(sessionId, {
              client,
              apiId: payload.apiId,
              apiHash: payload.apiHash,
              stringSession: payload.sessionString,
              user: userData,
              connectedAt: new Date(),
            });
            return res.json({
              connected: true,
              user: userData,
              apiId: payload.apiId,
              apiHash: payload.apiHash,
              sessionString: payload.sessionString,
              encryptedToken: rememberToken,
              autoRestored: true,
            });
          }
        } catch (e) {
          // ignore auto-restore error
        }
      }
    }
    return res.json({ connected: false });
  }

  try {
    const isAuthorized = await session.client.isUserAuthorized();
    if (!isAuthorized) {
      activeSessions.delete(sessionId);
      res.clearCookie('telecloud_remember_token');
      return res.json({ connected: false });
    }

    const encryptedToken = encryptSession({
      apiId: session.apiId,
      apiHash: session.apiHash,
      sessionString: session.stringSession,
      user: session.user,
      createdAt: Date.now(),
    });

    return res.json({
      connected: true,
      user: session.user,
      apiId: session.apiId,
      apiHash: session.apiHash,
      sessionString: session.stringSession,
      encryptedToken,
    });
  } catch (err) {
    return res.json({ connected: false });
  }
});

// Full User Profile endpoint (Bio, Numeric ID, DC ID, Premium status)
app.get('/api/telegram/full-user', async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  const session = activeSessions.get(sessionId);

  if (!session || !session.client) {
    return res.status(401).json({ success: false, error: 'Not connected to Telegram' });
  }

  try {
    const isAuthorized = await session.client.isUserAuthorized();
    if (!isAuthorized) {
      return res.status(401).json({ success: false, error: 'Session expired' });
    }

    const me = (await session.client.getMe()) as any;
    let bio = '';
    let isPremium = false;

    try {
      const full = (await session.client.invoke(new Api.users.GetFullUser({ id: 'me' }))) as any;
      bio = full?.about || full?.fullUser?.about || '';
      if (me.premium || full?.fullUser?.premium) {
        isPremium = true;
      }
    } catch (e) {
      // If full user fails, fallback to basic me object
    }

    const fullUserData = {
      id: me.id?.toString() || 'me',
      firstName: me.firstName || 'Telegram User',
      lastName: me.lastName || '',
      username: me.username || '',
      phone: me.phone || session.phoneNumber || '',
      bio: bio,
      isPremium: isPremium || !!me.premium,
      dcId: (session.client as any).session?.dcId || 2,
      connectedAt: session.connectedAt.toISOString(),
    };

    session.user = {
      id: fullUserData.id,
      firstName: fullUserData.firstName,
      lastName: fullUserData.lastName,
      username: fullUserData.username,
      phone: fullUserData.phone,
    };

    if (fullUserData.id) {
      userClientMap.set(fullUserData.id, session.client);
    }

    return res.json({
      success: true,
      user: fullUserData,
    });
  } catch (err: any) {
    console.error('Error getting full user profile:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch full user info' });
  }
});

// Download / Stream User Profile Photo from Telegram (supports ?uid=... for multi-account avatars)
app.get('/api/telegram/profile-photo', async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  const session = activeSessions.get(sessionId);
  const requestedUid = typeof req.query.uid === 'string' ? req.query.uid.trim() : (session?.user?.id || '');

  // Check in-memory profile photo cache first
  if (requestedUid) {
    const cachedPhoto = profilePhotoCache.get(requestedUid);
    if (cachedPhoto && Date.now() - cachedPhoto.cachedAt < 3600000) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(cachedPhoto.buffer);
    }
  }

  const targetClient = (requestedUid && userClientMap.get(requestedUid)) || session?.client;

  if (!targetClient) {
    return res.status(404).send('Not connected');
  }

  try {
    const isAuthorized = await targetClient.isUserAuthorized();
    if (!isAuthorized) {
      return res.status(401).send('Unauthorized');
    }

    // Download profile photo using GramJS
    const buffer = (await targetClient.downloadProfilePhoto('me', {
      isBig: true,
    })) as Buffer | null;

    if (buffer && buffer.length > 0) {
      const nodeBuf = Buffer.from(buffer);
      if (requestedUid) {
        profilePhotoCache.set(requestedUid, { buffer: nodeBuf, cachedAt: Date.now() });
      }
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(nodeBuf);
    } else {
      return res.status(404).send('No profile photo');
    }
  } catch (err) {
    return res.status(404).send('No profile photo');
  }
});

// Telegram Logout (supports removing specific account or active session)
app.post('/api/telegram/logout', async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  const session = activeSessions.get(sessionId);
  const targetAccountId = req.body?.accountId ? String(req.body.accountId) : undefined;

  if (targetAccountId) {
    const clientForUser = userClientMap.get(targetAccountId);
    if (clientForUser) {
      userClientMap.delete(targetAccountId);
      profilePhotoCache.delete(targetAccountId);
      for (const [sessStr, pooledClient] of clientPool.entries()) {
        if (pooledClient === clientForUser) {
          clientPool.delete(sessStr);
        }
      }
      try {
        await clientForUser.disconnect();
      } catch (e) {}
    }
    if (session?.user?.id === targetAccountId) {
      activeSessions.delete(sessionId);
      res.clearCookie('telecloud_remember_token');
    }
    return res.json({ success: true, message: 'Account disconnected' });
  }

  if (session && session.client) {
    if (session.user?.id) {
      userClientMap.delete(session.user.id);
      profilePhotoCache.delete(session.user.id);
    }
    if (session.stringSession) {
      clientPool.delete(session.stringSession);
    }
    try {
      await session.client.disconnect();
    } catch (e) {
      // ignore disconnect errors
    }
    activeSessions.delete(sessionId);
  }

  res.clearCookie('telecloud_sid');
  res.clearCookie('telecloud_remember_token');
  return res.json({ success: true, message: 'Disconnected from Telegram' });
});

// Helper to parse target peer (Saved Messages 'me', channel/group/user id or username)
function getTargetPeer(peerParam: any): any {
  if (!peerParam || peerParam === 'me' || peerParam === 'self') return 'me';
  if (typeof peerParam === 'string' && peerParam.startsWith('@')) return peerParam;
  const num = Number(peerParam);
  if (!isNaN(num)) {
    return bigInt(num);
  }
  return peerParam;
}

// Get all user chats, channels, groups, and bots
app.get('/api/telegram/chats', async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);

    if (!client) {
      return res.status(401).json({ error: 'Not connected to Telegram' });
    }

    const dialogs = await client.getDialogs({ limit: 80 });
    const chats: any[] = [];

    chats.push({
      id: 'me',
      title: 'Saved Messages (پیام‌های ذخیره‌شده)',
      type: 'saved',
      username: 'me',
      unreadCount: 0,
    });

    for (const dialog of dialogs) {
      const entity = dialog.entity;
      if (!entity) continue;
      
      const id = entity.id?.toString();
      if (!id || id === 'me' || id === 'self') continue;

      let type = 'user';
      let title = '';
      let username = (entity as any).username || '';

      if ('title' in entity && entity.title) {
        title = entity.title;
        if ('megagroup' in entity && entity.megagroup) {
          type = 'supergroup';
        } else if ('broadcast' in entity && entity.broadcast) {
          type = 'channel';
        } else {
          type = 'group';
        }
      } else if ('firstName' in entity) {
        title = `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || 'User';
        if ('bot' in entity && entity.bot) {
          type = 'bot';
        } else {
          type = 'user';
        }
      }

      if (id === '777000' || title.includes('Telegram')) {
        type = 'service';
      }

      chats.push({
        id,
        title,
        type,
        username,
        unreadCount: dialog.unreadCount || 0,
      });
    }

    return res.json({ success: true, chats });
  } catch (err: any) {
    console.error('Error fetching chats:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch chats' });
  }
});

// ----------------------------------------------------
// 3. Saved Messages & Chat Cloud File Operations
// ----------------------------------------------------

// Fetch all media/documents from selected peer chat/channel/bot
app.get('/api/telegram/files', async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);

    if (!client) {
      return res.status(401).json({ error: 'Not connected to Telegram' });
    }

    const limit = Math.min(Number(req.query.limit) || 100, 300);
    const offsetId = Number(req.query.offsetId) || 0;
    const category = (req.query.category as string) || 'all';
    const searchQuery = (req.query.search as string)?.toLowerCase() || '';
    const peerParam = (req.query.peer as string) || 'me';
    const peer = getTargetPeer(peerParam);

    // Fetch messages from selected peer
    const messages = await client.getMessages(peer, {
      limit,
      offsetId,
    });

    const files: any[] = [];

    for (const msg of messages) {
      if (!msg || !msg.media) continue;

      let filename = 'file';
      let mimeType = 'application/octet-stream';
      let size = 0;
      let hasThumb = false;
      let duration = 0;
      let width = 0;
      let height = 0;
      let fileType = 'unknown';

      // 1. Document (Files, audio, video as doc, archives, etc.)
      if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
        const doc = msg.media.document;
        size = Number(doc.size || 0);
        mimeType = doc.mimeType || 'application/octet-stream';
        hasThumb = Boolean(doc.thumbs && doc.thumbs.length > 0);

        for (const attr of doc.attributes) {
          if (attr instanceof Api.DocumentAttributeFilename) {
            filename = attr.fileName;
          } else if (attr instanceof Api.DocumentAttributeVideo) {
            duration = attr.duration;
            width = attr.w;
            height = attr.h;
            fileType = 'video';
          } else if (attr instanceof Api.DocumentAttributeAudio) {
            duration = attr.duration;
            fileType = 'audio';
            if (attr.title) {
              filename = `${attr.performer ? attr.performer + ' - ' : ''}${attr.title}.${mimeType.split('/')[1] || 'mp3'}`;
            }
          } else if (attr instanceof Api.DocumentAttributeImageSize) {
            width = attr.w;
            height = attr.h;
            fileType = 'image';
          }
        }
      }
      // 2. Photo
      else if (msg.media instanceof Api.MessageMediaPhoto && msg.media.photo instanceof Api.Photo) {
        const photo = msg.media.photo;
        hasThumb = true;
        fileType = 'image';
        mimeType = 'image/jpeg';
        filename = `photo_${msg.id}.jpg`;
        // Estimate size from largest size item
        const largestSize = photo.sizes[photo.sizes.length - 1];
        if ('size' in largestSize && typeof largestSize.size === 'number') {
          size = largestSize.size;
        } else if ('sizes' in largestSize && Array.isArray(largestSize.sizes)) {
          size = largestSize.sizes[largestSize.sizes.length - 1] || 150000;
        } else {
          size = 250000; // estimated fallback
        }
      } else {
        continue;
      }

      const accurateMime = getAccurateMimeType(filename, mimeType);
      const fileCategory = getCategoryFromMimeAndExt(accurateMime, filename);

      // Filtering
      if (category !== 'all' && fileCategory !== category) {
        continue;
      }

      if (searchQuery && !filename.toLowerCase().includes(searchQuery) && !(msg.message && msg.message.toLowerCase().includes(searchQuery))) {
        continue;
      }

      const currentUid = activeSessions.get(sessionId)?.user?.id || sessionId;
      files.push({
        id: msg.id,
        filename,
        caption: msg.message || '',
        mimeType: accurateMime,
        size,
        category: fileCategory,
        hasThumb,
        date: msg.date * 1000,
        duration,
        width,
        height,
        directUrl: `/api/telegram/stream/${msg.id}/${encodeURIComponent(filename)}?peer=${encodeURIComponent(peerParam)}&uid=${encodeURIComponent(currentUid)}`,
        downloadUrl: `/api/telegram/download/${msg.id}/${encodeURIComponent(filename)}?peer=${encodeURIComponent(peerParam)}&uid=${encodeURIComponent(currentUid)}`,
        thumbnailUrl: hasThumb ? `/api/telegram/thumbnail/${msg.id}?peer=${encodeURIComponent(peerParam)}&uid=${encodeURIComponent(currentUid)}` : null,
      });
    }

    return res.json({
      success: true,
      files,
      count: files.length,
      nextOffsetId: messages.length > 0 && messages[messages.length - 1] ? messages[messages.length - 1].id : 0,
    });
  } catch (err: any) {
    console.error('Error fetching files from Telegram:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch files' });
  }
});

// Storage usage statistics by category
app.get('/api/telegram/stats', async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);

    if (!client) {
      return res.status(401).json({ error: 'Not connected to Telegram' });
    }

    const peer = getTargetPeer(req.query.peer);
    const messages = await client.getMessages(peer, { limit: 200 });

    const stats = {
      totalFiles: 0,
      totalSize: 0,
      categories: {
        images: { count: 0, size: 0 },
        videos: { count: 0, size: 0 },
        audio: { count: 0, size: 0 },
        documents: { count: 0, size: 0 },
        archives: { count: 0, size: 0 },
        other: { count: 0, size: 0 },
      },
    };

    for (const msg of messages) {
      if (!msg || !msg.media) continue;

      let filename = 'file';
      let mimeType = 'application/octet-stream';
      let size = 0;

      if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
        size = Number(msg.media.document.size || 0);
        mimeType = msg.media.document.mimeType || 'application/octet-stream';
        for (const attr of msg.media.document.attributes) {
          if (attr instanceof Api.DocumentAttributeFilename) filename = attr.fileName;
        }
      } else if (msg.media instanceof Api.MessageMediaPhoto && msg.media.photo instanceof Api.Photo) {
        size = 250000;
        mimeType = 'image/jpeg';
        filename = `photo_${msg.id}.jpg`;
      } else {
        continue;
      }

      const cat = getCategoryFromMimeAndExt(mimeType, filename) as keyof typeof stats.categories;
      if (stats.categories[cat]) {
        stats.categories[cat].count++;
        stats.categories[cat].size += size;
      }
      stats.totalFiles++;
      stats.totalSize += size;
    }

    return res.json({ success: true, stats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to calculate stats' });
  }
});

// In-Memory Thumbnail Cache to prevent repeated MTProto requests for identical small images
const thumbMemoryCache = new Map<string, { buffer: Buffer; mime: string; cachedAt: number }>();

// Stream Thumbnail directly from RAM
app.get('/api/telegram/thumbnail/:messageId', async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);
    const messageId = Number(req.params.messageId);

    if (!client || isNaN(messageId)) {
      return res.status(400).send('Invalid request');
    }

    const currentUid = activeSessions.get(sessionId)?.user?.id || sessionId;
    const peerParam = String(req.query.peer || 'me');
    const cacheKey = `${currentUid}_${peerParam}_${messageId}`;

    // Check RAM cache (expire after 1 hour)
    const cached = thumbMemoryCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < 3600000) {
      res.setHeader('Content-Type', cached.mime);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached.buffer);
    }

    const peer = getTargetPeer(req.query.peer);
    const messages = await client.getMessages(peer, { ids: [messageId] });
    const msg = messages?.[0];
    if (!msg || !msg.media) {
      return res.status(404).send('Not found');
    }

    const media = msg.media;
    const buffer = await client.downloadMedia(media, {
      thumb: 1, // Small/medium thumbnail
    });

    if (!buffer || !(buffer instanceof Buffer || buffer instanceof Uint8Array)) {
      return res.status(404).send('No thumbnail available');
    }

    const nodeBuf = Buffer.from(buffer);
    thumbMemoryCache.set(cacheKey, {
      buffer: nodeBuf,
      mime: 'image/jpeg',
      cachedAt: Date.now(),
    });

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(nodeBuf);
  } catch (err: any) {
    console.error('Thumbnail fetch error:', err);
    return res.status(500).send('Thumbnail error');
  }
});

// ----------------------------------------------------
// 4. Zero-Disk Direct File Streaming & Downloading
// ----------------------------------------------------
app.get(['/api/telegram/stream/:messageId/:filename?', '/api/telegram/download/:messageId/:filename?'], async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);
    const messageId = Number(req.params.messageId);
    const isDownloadRoute = req.path.includes('/download/');

    if (!client || isNaN(messageId)) {
      return res.status(401).json({ error: 'Session not authenticated or message ID invalid' });
    }

    const peer = getTargetPeer(req.query.peer);
    const messages = await client.getMessages(peer, { ids: [messageId] });
    const msg = messages?.[0];
    if (!msg || !msg.media) {
      return res.status(404).json({ error: 'File not found in chat/channel' });
    }

    const media = msg.media;
    let totalSize = 0;
    let mimeType = 'application/octet-stream';
    let filename = req.params.filename || `file_${messageId}`;

    if (media instanceof Api.MessageMediaDocument && media.document instanceof Api.Document) {
      totalSize = Number(media.document.size || 0);
      mimeType = media.document.mimeType || 'application/octet-stream';
      for (const attr of media.document.attributes) {
        if (attr instanceof Api.DocumentAttributeFilename) {
          filename = attr.fileName;
        }
      }
    } else if (media instanceof Api.MessageMediaPhoto && media.photo instanceof Api.Photo) {
      mimeType = 'image/jpeg';
      filename = filename.endsWith('.jpg') ? filename : `${filename}.jpg`;
    }

    const accurateMime = getAccurateMimeType(filename, mimeType);

    // Set content headers
    res.setHeader('Content-Type', accurateMime);
    res.setHeader('Accept-Ranges', 'bytes');

    if (isDownloadRoute || req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    }

    // Handle HTTP Range Requests (Essential for Video/Audio seeking in custom player)
    const rangeHeader = req.headers.range;

    if (rangeHeader && totalSize > 0) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunkSize = end - start + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', chunkSize);

      // Stream directly from Telegram MTProto into RAM chunks and pipe to HTTP response
      // Telegram downloads in 128KB / 512KB chunks
      let bytesSent = 0;
      for await (const chunk of client.iterDownload({
        file: media,
        offset: bigInt(start),
        limit: chunkSize,
        requestSize: 128 * 1024,
      })) {
        if (res.destroyed || res.writableEnded) break;
        res.write(chunk);
        bytesSent += chunk.length;
        if (bytesSent >= chunkSize) break;
      }
      return res.end();
    }

    if (totalSize > 0) {
      res.setHeader('Content-Length', totalSize);
    }

    // Full Stream directly from Telegram without disk buffering
    for await (const chunk of client.iterDownload({
      file: media,
      offset: bigInt(0),
      requestSize: 256 * 1024,
    })) {
      if (res.destroyed || res.writableEnded) break;
      res.write(chunk);
    }

    return res.end();
  } catch (err: any) {
    console.error('File streaming error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Error streaming file' });
    }
    return res.end();
  }
});

// --------------------------------------------------------------------------
// 4.1 Universal Live Transcoder (On-The-Fly WebM/MKV/AVI/FLV/WMV/MOV to MP4)
// --------------------------------------------------------------------------
app.get(['/api/telegram/transcode/:messageId/:filename?', '/api/telegram/transcode/:messageId'], async (req: Request, res: Response) => {
  let ffmpegProcess: any = null;
  try {
    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);
    const messageId = Number(req.params.messageId);
    const startTime = parseFloat(req.query.startTime as string || req.query.t as string || '0') || 0;
    const quality = (req.query.quality as string) || 'auto';
    const demoUrl = req.query.demoUrl as string;

    let media: Api.TypeMessageMedia | null = null;

    if (!demoUrl) {
      if (!client || isNaN(messageId)) {
        return res.status(401).json({ error: 'Not authenticated with Telegram' });
      }

      const peer = getTargetPeer(req.query.peer);
      const messages = await client.getMessages(peer, { ids: [messageId] });
      const msg = messages?.[0];
      if (!msg || !msg.media) {
        return res.status(404).json({ error: 'File not found' });
      }
      media = msg.media;
    }

    // Set streaming headers for fragmented MP4
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Connection', 'keep-alive');

    // Resolution scale filter
    let scaleFilter = '';
    if (quality === '1080p') scaleFilter = 'scale=-2:1080';
    else if (quality === '720p') scaleFilter = 'scale=-2:720';
    else if (quality === '480p') scaleFilter = 'scale=-2:480';
    else if (quality === '360p') scaleFilter = 'scale=-2:360';

    // Build FFmpeg Arguments
    const ffmpegArgs: string[] = [
      '-hide_banner',
      '-loglevel', 'error',
    ];

    if (startTime > 0) {
      ffmpegArgs.push('-ss', String(startTime));
    }

    if (demoUrl) {
      ffmpegArgs.push('-i', demoUrl);
    } else {
      ffmpegArgs.push('-i', 'pipe:0');
    }

    // Video conversion to universal H.264
    ffmpegArgs.push(
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-profile:v', 'baseline',
      '-level', '3.1',
      '-pix_fmt', 'yuv420p',
      '-crf', '23',
      '-g', '30',
      '-keyint_min', '15',
      '-sc_threshold', '0'
    );

    if (scaleFilter) {
      ffmpegArgs.push('-vf', scaleFilter);
    }

    // Audio conversion to universal AAC stereo
    ffmpegArgs.push(
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ac', '2',
      '-ar', '48000',
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
      'pipe:1'
    );

    ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    ffmpegProcess.stdin.on('error', () => {});
    ffmpegProcess.stdout.on('error', () => {});

    // Pipe FFmpeg output directly to browser HTTP response
    ffmpegProcess.stdout.pipe(res);

    ffmpegProcess.stderr.on('data', (data: Buffer) => {
      // FFmpeg status logs
    });

    ffmpegProcess.on('error', (err: any) => {
      console.error('FFmpeg process error:', err);
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
    });

    req.on('close', () => {
      if (ffmpegProcess) {
        try {
          ffmpegProcess.kill('SIGKILL');
        } catch {}
      }
    });

    // If demo URL, FFmpeg handles reading from URL directly
    if (demoUrl || !client || !media) {
      return;
    }

    // Stream Telegram data into FFmpeg stdin with backpressure management
    (async () => {
      try {
        for await (const chunk of client.iterDownload({
          file: media,
          offset: bigInt(0),
          requestSize: 256 * 1024,
        })) {
          if (ffmpegProcess.stdin.destroyed || res.destroyed || res.writableEnded) {
            break;
          }
          const canWrite = ffmpegProcess.stdin.write(chunk);
          if (!canWrite) {
            await new Promise((resolve) => ffmpegProcess.stdin.once('drain', resolve));
          }
        }
        if (!ffmpegProcess.stdin.destroyed) {
          ffmpegProcess.stdin.end();
        }
      } catch (streamErr) {
        console.error('Error feeding Telegram stream to FFmpeg:', streamErr);
        if (!ffmpegProcess.stdin.destroyed) {
          ffmpegProcess.stdin.destroy();
        }
      }
    })();

  } catch (err: any) {
    console.error('Live transcode route error:', err);
    if (ffmpegProcess) {
      try { ffmpegProcess.kill('SIGKILL'); } catch {}
    }
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Transcoder error' });
    }
    return res.end();
  }
});

// Delete a message/file from Saved Messages only (Other chats/channels are strictly Read-Only)
app.delete('/api/telegram/file/:messageId', async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);
    const messageId = Number(req.params.messageId);

    if (!client || isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID or not authenticated' });
    }

    const rawPeer = req.query.peer ? String(req.query.peer).trim() : 'me';
    if (rawPeer !== 'me') {
      return res.status(403).json({
        error: 'Read-only mode: Deleting files is only allowed in Saved Messages.',
      });
    }

    await client.deleteMessages('me', [messageId], { revoke: true });

    // Invalidate thumbnail cache
    const currentUid = activeSessions.get(sessionId)?.user?.id || sessionId;
    thumbMemoryCache.delete(`${currentUid}_me_${messageId}`);

    return res.json({ success: true, message: 'File deleted from Saved Messages' });
  } catch (err: any) {
    console.error('Delete error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete file' });
  }
});

// ----------------------------------------------------
// 5. Zero-Disk In-Memory Upload Strictly to Saved Messages ('me')
// ----------------------------------------------------
app.post('/api/telegram/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);

    if (!client) {
      return res.status(401).json({ error: 'Not connected to Telegram' });
    }

    const rawPeer = (req.body.peer || req.query.peer || 'me').toString().trim();
    if (rawPeer !== 'me') {
      return res.status(403).json({
        error: 'آپلود فایل فقط در سیو مسیج (Saved Messages) مجاز است و سایر کانال‌ها و چت‌ها فقط خواندنی هستند.',
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const caption = (req.body.caption as string) || '';
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8'); // Handle UTF-8 / Persian filenames correctly

    // Create a CustomFile in RAM without writing to disk
    const customFile = new CustomFile(originalName, file.size, '', file.buffer);

    // Upload strictly to Saved Messages ('me')
    const uploadedMessage = await client.sendFile('me', {
      file: customFile,
      caption: caption || originalName,
      forceDocument: !file.mimetype.startsWith('image/'),
      workers: 2,
    });

    const msgId = (uploadedMessage as any)?.id || Date.now();

    return res.json({
      success: true,
      messageId: msgId,
      filename: originalName,
      size: file.size,
      mimeType: file.mimetype,
      message: 'File successfully uploaded to Saved Messages!',
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Failed to upload file to Telegram' });
  }
});

// ----------------------------------------------------
// 6. Vite Integration / Static Assets for Production
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[TeleCloud] Server running on port ${PORT}`);
  });
}

startServer();
