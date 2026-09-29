import http from 'http';
import https from 'https';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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

// Download / Stream User Profile Photo from Telegram (supports ?uid=...&token=... for multi-account avatars)
app.get('/api/telegram/profile-photo', async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  const session = activeSessions.get(sessionId);
  const requestedUid = typeof req.query.uid === 'string' ? req.query.uid.trim() : (session?.user?.id || '');
  const tokenParam = typeof req.query.token === 'string' ? req.query.token.trim() : '';

  // Check in-memory profile photo cache first
  if (requestedUid && requestedUid !== 'me') {
    const cachedPhoto = profilePhotoCache.get(requestedUid);
    if (cachedPhoto && Date.now() - cachedPhoto.cachedAt < 3600000) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.send(cachedPhoto.buffer);
    }
  }

  let targetClient: TelegramClient | undefined = undefined;

  if (requestedUid && requestedUid !== 'me' && userClientMap.has(requestedUid)) {
    targetClient = userClientMap.get(requestedUid);
  } else if (
    session?.client &&
    (!requestedUid || requestedUid === 'me' || session.user?.id === requestedUid)
  ) {
    targetClient = session.client;
  } else if (tokenParam) {
    const payload = decryptSession(tokenParam);
    if (payload && payload.apiId && payload.apiHash && payload.sessionString) {
      try {
        let pooled = clientPool.get(payload.sessionString);
        if (!pooled) {
          const strSession = new StringSession(payload.sessionString);
          pooled = new TelegramClient(strSession, payload.apiId, payload.apiHash, {
            connectionRetries: 3,
          });
          await pooled.connect();
          clientPool.set(payload.sessionString, pooled);
        } else if (!pooled.connected) {
          await pooled.connect();
        }
        if (requestedUid && requestedUid !== 'me') {
          userClientMap.set(requestedUid, pooled);
        }
        targetClient = pooled;
      } catch {}
    }
  }

  if (!targetClient) {
    return res.status(404).send('Not connected');
  }

  try {
    if (!targetClient.connected) {
      await targetClient.connect();
    }
    const isAuthorized = await targetClient.isUserAuthorized();
    if (!isAuthorized) {
      return res.status(401).send('Unauthorized');
    }

    // Download profile photo for this specific account's 'me'
    const buffer = (await targetClient.downloadProfilePhoto('me', {
      isBig: true,
    })) as Buffer | null;

    if (buffer && buffer.length > 0) {
      const nodeBuf = Buffer.from(buffer);
      if (requestedUid && requestedUid !== 'me') {
        profilePhotoCache.set(requestedUid, { buffer: nodeBuf, cachedAt: Date.now() });
      }
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=3600');
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

// Per-user entity cache so private channels, private groups, and PVs without usernames resolve with accessHash
const userPeerEntityCache = new Map<string, Map<string, any>>();
const userPeerRawEntityCache = new Map<string, Map<string, any>>();
const userDialogsCache = new Map<string, { chats: any[]; cachedAt: number }>();

export interface PeerPermissions {
  canUpload: boolean;
  canDelete: boolean;
  isAdmin: boolean;
  type: 'saved' | 'channel' | 'user' | 'bot' | 'group' | 'supergroup' | 'service';
}

function evaluatePeerPermissions(entity: any, explicitType?: string): PeerPermissions {
  if (!entity || entity === 'me' || entity === 'self' || (entity as any)?.self || explicitType === 'saved') {
    return { canUpload: true, canDelete: true, isAdmin: true, type: 'saved' };
  }

  const className = (entity as any).className || entity.constructor?.name || '';
  const rawEntityId = entity.id?.toString() || '';

  if (rawEntityId === '777000' || explicitType === 'service') {
    return { canUpload: false, canDelete: false, isAdmin: false, type: 'service' };
  }

  // Channel or Supergroup
  if (entity instanceof Api.Channel || className === 'Channel' || explicitType === 'channel' || explicitType === 'supergroup') {
    const isLeftOrKicked = Boolean((entity as any).left || (entity as any).kicked || (entity as any).deactivated);
    const isBroadcast = Boolean((entity as any).broadcast && !(entity as any).megagroup);
    const resolvedType = isBroadcast ? 'channel' : 'supergroup';

    if (isLeftOrKicked) {
      return { canUpload: false, canDelete: false, isAdmin: false, type: resolvedType };
    }

    const isCreator = Boolean((entity as any).creator);
    const adminRights = (entity as any).adminRights;
    const isAdmin = Boolean(isCreator || adminRights);

    if (isBroadcast) {
      // Broadcast channel: only admins can upload or delete
      const canUpload = Boolean(isCreator || adminRights?.postMessages || isAdmin);
      const canDelete = Boolean(isCreator || adminRights?.deleteMessages || adminRights?.postMessages || isAdmin);
      return { canUpload, canDelete, isAdmin, type: 'channel' };
    } else {
      // Supergroup: admins always have access; regular members have access unless restricted
      if (isAdmin) {
        return { canUpload: true, canDelete: true, isAdmin: true, type: 'supergroup' };
      }
      const banned = (entity as any).bannedRights;
      const defBanned = (entity as any).defaultBannedRights;
      const cannotSend =
        Boolean(banned?.viewMessages || banned?.sendMessages || banned?.sendMedia) ||
        Boolean(defBanned?.sendMessages || defBanned?.sendMedia);
      return {
        canUpload: !cannotSend,
        canDelete: !cannotSend,
        isAdmin: false,
        type: 'supergroup',
      };
    }
  }

  // Basic Group (Api.Chat)
  if (entity instanceof Api.Chat || className === 'Chat' || explicitType === 'group') {
    const isInactive = Boolean((entity as any).left || (entity as any).kicked || (entity as any).deactivated);
    if (isInactive) {
      return { canUpload: false, canDelete: false, isAdmin: false, type: 'group' };
    }
    const isCreator = Boolean((entity as any).creator);
    const adminRights = (entity as any).adminRights;
    const isAdmin = Boolean(isCreator || adminRights);
    if (isAdmin) {
      return { canUpload: true, canDelete: true, isAdmin: true, type: 'group' };
    }
    const defBanned = (entity as any).defaultBannedRights;
    const cannotSend = Boolean(defBanned?.sendMessages || defBanned?.sendMedia);
    return {
      canUpload: !cannotSend,
      canDelete: !cannotSend,
      isAdmin: false,
      type: 'group',
    };
  }

  // Bot or PV (Api.User)
  const isBot = Boolean((entity as any).bot || explicitType === 'bot');
  const isDeleted = Boolean((entity as any).deleted);
  return {
    canUpload: !isDeleted,
    canDelete: true,
    isAdmin: false,
    type: isBot ? 'bot' : 'user',
  };
}

function cachePeerEntityForUser(uid: string, keys: string[], targetEntity: any, rawEntity?: any) {
  if (!uid || !targetEntity) return;
  let map = userPeerEntityCache.get(uid);
  if (!map) {
    map = new Map<string, any>();
    userPeerEntityCache.set(uid, map);
  }
  let rawMap = userPeerRawEntityCache.get(uid);
  if (!rawMap) {
    rawMap = new Map<string, any>();
    userPeerRawEntityCache.set(uid, rawMap);
  }
  const actualRaw = rawEntity || targetEntity;
  for (const k of keys) {
    if (k) {
      const cleanKey = String(k).trim();
      if (!cleanKey) continue;
      map.set(cleanKey, targetEntity);
      map.set(cleanKey.toLowerCase(), targetEntity);
      rawMap.set(cleanKey, actualRaw);
      rawMap.set(cleanKey.toLowerCase(), actualRaw);
    }
  }
}

function getCachedRawEntity(peerParam: any, currentUid?: string): any {
  if (!peerParam || peerParam === 'me' || peerParam === 'self') return 'me';
  const peerStr = String(peerParam).trim();
  if (!peerStr || peerStr === 'me' || peerStr === 'self') return 'me';

  if (currentUid && userPeerRawEntityCache.has(currentUid)) {
    const rawMap = userPeerRawEntityCache.get(currentUid)!;
    const found = rawMap.get(peerStr) || rawMap.get(peerStr.toLowerCase());
    if (found) return found;
  }
  for (const rawMap of userPeerRawEntityCache.values()) {
    const found = rawMap.get(peerStr) || rawMap.get(peerStr.toLowerCase());
    if (found) return found;
  }
  return null;
}

// Helper to parse target peer (Saved Messages 'me', channel/group/user id or username)
function getTargetPeer(peerParam: any, currentUid?: string): any {
  if (!peerParam || peerParam === 'me' || peerParam === 'self') return 'me';
  const peerStr = String(peerParam).trim();
  if (!peerStr || peerStr === 'me' || peerStr === 'self') return 'me';

  // 1. Check cached inputEntity / entity for this user (essential for private groups/channels & PVs)
  if (currentUid && userPeerEntityCache.has(currentUid)) {
    const map = userPeerEntityCache.get(currentUid)!;
    const cached = map.get(peerStr) || map.get(peerStr.toLowerCase());
    if (cached) return cached;
  }
  // Also check across any active user maps as fallback
  for (const map of userPeerEntityCache.values()) {
    const cached = map.get(peerStr) || map.get(peerStr.toLowerCase());
    if (cached) return cached;
  }

  if (peerStr.startsWith('@')) return peerStr;
  if (/^-?\d+$/.test(peerStr)) {
    return bigInt(peerStr);
  }
  return peerStr;
}

async function resolveTargetPeerAndEntity(
  client: TelegramClient,
  peerParam: string,
  currentUid: string
): Promise<{ peer: any; rawEntity: any; permissions: PeerPermissions }> {
  const cleanPeer = (peerParam || 'me').toString().trim() || 'me';
  if (cleanPeer === 'me' || cleanPeer === 'self') {
    return {
      peer: 'me',
      rawEntity: 'me',
      permissions: { canUpload: true, canDelete: true, isAdmin: true, type: 'saved' },
    };
  }

  // Warm up dialog cache if entity not yet cached
  if (!getCachedRawEntity(cleanPeer, currentUid)) {
    try {
      const warmDialogs = await client.getDialogs({ limit: 350 });
      for (const d of warmDialogs) {
        if (!d.entity) continue;
        const rawId = d.entity.id?.toString();
        const dId = d.id?.toString();
        const className = (d.entity as any).className || d.entity.constructor?.name || '';
        let markedId = dId || rawId || '';
        if (d.entity instanceof Api.Channel || className === 'Channel') {
          const cId = (rawId || '').replace(/^-100|^-/, '');
          markedId = `-100${cId}`;
        } else if (d.entity instanceof Api.Chat || className === 'Chat') {
          const cId = (rawId || '').replace(/^-/, '');
          markedId = `-${cId}`;
        }
        const username = (d.entity as any).username || '';
        const keys = [markedId, dId || '', rawId || ''];
        if (username) keys.push(`@${username}`, username);
        cachePeerEntityForUser(currentUid, keys, d.inputEntity || d.entity, d.entity);
      }
    } catch {}
  }

  const peer = getTargetPeer(cleanPeer, currentUid);
  let rawEntity = getCachedRawEntity(cleanPeer, currentUid);

  if (!rawEntity) {
    try {
      rawEntity = await client.getEntity(peer);
      if (rawEntity) {
        cachePeerEntityForUser(currentUid, [cleanPeer], rawEntity, rawEntity);
      }
    } catch {}
  }

  const permissions = rawEntity
    ? evaluatePeerPermissions(rawEntity)
    : { canUpload: true, canDelete: true, isAdmin: false, type: 'user' as const };

  return { peer, rawEntity, permissions };
}

// Get all user chats, channels, groups, PVs, and bots (including private channels/groups without username)
app.get('/api/telegram/chats', async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);

    if (!client) {
      return res.status(401).json({ error: 'Not connected to Telegram' });
    }

    const currentUid = String(activeSessions.get(sessionId)?.user?.id || sessionId);
    const forceRefresh = req.query.refresh === '1';

    if (!forceRefresh) {
      const cached = userDialogsCache.get(currentUid);
      if (cached && Date.now() - cached.cachedAt < 90000 && cached.chats.length > 1) {
        return res.json({ success: true, chats: cached.chats });
      }
    }

    // Fetch up to 500 dialogs (includes all PVs, private groups, private channels, public channels, bots)
    const mainDialogs = await client.getDialogs({ limit: 500 });
    let archivedDialogs: any[] = [];
    try {
      archivedDialogs = await client.getDialogs({ limit: 200, archived: true });
    } catch {
      // ignore if archived folder is empty or unsupported
    }

    const allDialogs = [...mainDialogs, ...archivedDialogs];
    const seenChatIds = new Set<string>(['me', 'self']);
    const chats: any[] = [];

    chats.push({
      id: 'me',
      title: 'Saved Messages (پیام‌های ذخیره‌شده)',
      type: 'saved',
      username: 'me',
      unreadCount: 0,
      isPrivate: true,
      isArchived: false,
      canUpload: true,
      canDelete: true,
      isAdmin: true,
    });

    for (const dialog of allDialogs) {
      const entity = dialog.entity;
      if (!entity) continue;

      const rawEntityId = entity.id?.toString();
      if (!rawEntityId || rawEntityId === 'me' || rawEntityId === 'self') continue;
      if ((entity as any).self || rawEntityId === currentUid) continue;

      const className = (entity as any).className || entity.constructor?.name || '';
      let markedId = dialog.id?.toString() || rawEntityId;

      if (entity instanceof Api.Channel || className === 'Channel') {
        const cleanId = rawEntityId.replace(/^-100|^-/, '');
        markedId = `-100${cleanId}`;
      } else if (entity instanceof Api.Chat || className === 'Chat') {
        const cleanId = rawEntityId.replace(/^-/, '');
        markedId = `-${cleanId}`;
      } else {
        markedId = rawEntityId;
      }

      if (seenChatIds.has(markedId)) continue;
      seenChatIds.add(markedId);

      // Extract active username (supports both legacy .username and newer .usernames array)
      let username = (entity as any).username || '';
      if (!username && Array.isArray((entity as any).usernames) && (entity as any).usernames.length > 0) {
        const activeObj =
          (entity as any).usernames.find((u: any) => u?.active && u?.username) ||
          (entity as any).usernames[0];
        if (activeObj?.username) username = activeObj.username;
      }

      // Cache entity & inputEntity so private channels/groups and PVs work seamlessly
      const peerTarget = dialog.inputEntity || entity;
      const cacheKeys = [markedId, rawEntityId];
      if (username) {
        cacheKeys.push(`@${username}`, username);
      }
      cachePeerEntityForUser(currentUid, cacheKeys, peerTarget, entity);

      let type: string = 'user';
      let title = '';

      if (
        entity instanceof Api.Channel ||
        className === 'Channel' ||
        entity instanceof Api.Chat ||
        className === 'Chat' ||
        'title' in entity
      ) {
        title = (entity as any).title || dialog.title || dialog.name || `Chat ${rawEntityId}`;
        if ((entity as any).megagroup) {
          type = 'supergroup';
        } else if ((entity as any).broadcast) {
          type = 'channel';
        } else {
          type = 'group';
        }
      } else {
        // User / PV / Bot
        if ((entity as any).deleted) {
          title = 'Deleted Account (حساب حذف‌شده)';
        } else {
          const fullName = `${(entity as any).firstName || ''} ${(entity as any).lastName || ''}`.trim();
          title =
            fullName ||
            dialog.title ||
            dialog.name ||
            (username ? `@${username}` : '') ||
            ((entity as any).phone ? `+${(entity as any).phone}` : `User ${rawEntityId}`);
        }

        if ((entity as any).bot) {
          type = 'bot';
        } else {
          type = 'user';
        }
      }

      if (rawEntityId === '777000' || title === 'Telegram') {
        type = 'service';
      }

      const isArchived = Boolean(
        (dialog as any).archived || (dialog.dialog as any)?.folderId === 1
      );

      const perms = evaluatePeerPermissions(entity, type);

      chats.push({
        id: markedId,
        title,
        type,
        username,
        unreadCount: dialog.unreadCount || 0,
        isPrivate: !username,
        isArchived,
        canUpload: perms.canUpload,
        canDelete: perms.canDelete,
        isAdmin: perms.isAdmin,
      });
    }

    // Also include saved contacts (PVs) that might not be in the recent dialog list
    try {
      const contactsRes: any = await client.invoke(
        new Api.contacts.GetContacts({ hash: bigInt(0) })
      );
      if (contactsRes && Array.isArray(contactsRes.users)) {
        for (const u of contactsRes.users) {
          if (!u || (u as any).self || (u as any).deleted) continue;
          const uidStr = u.id?.toString();
          if (!uidStr || uidStr === currentUid || seenChatIds.has(uidStr)) continue;
          seenChatIds.add(uidStr);

          let username = (u as any).username || '';
          if (!username && Array.isArray((u as any).usernames) && (u as any).usernames.length > 0) {
            const activeObj =
              (u as any).usernames.find((item: any) => item?.active && item?.username) ||
              (u as any).usernames[0];
            if (activeObj?.username) username = activeObj.username;
          }

          const cacheKeys = [uidStr];
          if (username) cacheKeys.push(`@${username}`, username);
          cachePeerEntityForUser(currentUid, cacheKeys, u, u);

          const fullName = `${(u as any).firstName || ''} ${(u as any).lastName || ''}`.trim();
          const title =
            fullName ||
            (username ? `@${username}` : '') ||
            ((u as any).phone ? `+${(u as any).phone}` : `User ${uidStr}`);

          const chatType = (u as any).bot ? 'bot' : 'user';
          const perms = evaluatePeerPermissions(u, chatType);

          chats.push({
            id: uidStr,
            title,
            type: chatType,
            username,
            unreadCount: 0,
            isPrivate: !username,
            isArchived: false,
            canUpload: perms.canUpload,
            canDelete: perms.canDelete,
            isAdmin: perms.isAdmin,
          });
        }
      }
    } catch {
      // Ignore contacts fetch error if restricted
    }

    userDialogsCache.set(currentUid, { chats, cachedAt: Date.now() });

    return res.json({ success: true, chats });
  } catch (err: any) {
    console.error('Error fetching chats:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch chats' });
  }
});

// ----------------------------------------------------
// 3. Saved Messages & Chat Cloud File Operations
// ----------------------------------------------------

// Fetch all media/documents from selected peer chat/channel/bot with deep pagination
app.get('/api/telegram/files', async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);

    if (!client) {
      return res.status(401).json({ error: 'Not connected to Telegram' });
    }

    const limit = Math.min(Number(req.query.limit) || 250, 500);
    let currentOffsetId = Number(req.query.offsetId) || 0;
    const category = (req.query.category as string) || 'all';
    const searchQuery = (req.query.search as string)?.toLowerCase() || '';
    const peerParam = (req.query.peer as string) || 'me';
    const currentUid = String(activeSessions.get(sessionId)?.user?.id || sessionId);
    const { peer, permissions: peerPermissions } = await resolveTargetPeerAndEntity(
      client,
      peerParam,
      currentUid
    );

    const files: any[] = [];
    const seenIds = new Set<number>();
    let hasMore = false;
    let totalFetchedMessages = 0;
    const maxInternalIterations = 3; // Scan up to 3 chunks if a channel has many text-only posts

    for (let step = 0; step < maxInternalIterations; step++) {
      const getMessagesParams: any = { limit };
      if (currentOffsetId > 0) {
        getMessagesParams.offsetId = currentOffsetId;
      }

      const messages = await client.getMessages(peer, getMessagesParams);
      if (!messages || messages.length === 0) {
        hasMore = false;
        currentOffsetId = 0;
        break;
      }

      totalFetchedMessages += messages.length;
      const oldestMsg = messages[messages.length - 1];
      const nextId = oldestMsg && typeof oldestMsg.id === 'number' ? oldestMsg.id : 0;

      for (const msg of messages) {
        if (!msg || !msg.media || seenIds.has(msg.id)) continue;

        let filename = '';
        let mimeType = 'application/octet-stream';
        let size = 0;
        let hasThumb = false;
        let duration = 0;
        let width = 0;
        let height = 0;
        let fileType = 'unknown';

        // 1. Document (Files, audio, video as doc, voice, video notes, archives, etc.)
        if (
          (msg.media instanceof Api.MessageMediaDocument || (msg.media as any)?.className === 'MessageMediaDocument') &&
          ((msg.media as any)?.document instanceof Api.Document || (msg.media as any)?.document?.className === 'Document')
        ) {
          const doc = (msg.media as any).document;
          size = Number(doc.size || 0);
          mimeType = doc.mimeType || 'application/octet-stream';
          hasThumb = Boolean(doc.thumbs && doc.thumbs.length > 0);

          for (const attr of doc.attributes || []) {
            if (attr instanceof Api.DocumentAttributeFilename || attr?.className === 'DocumentAttributeFilename') {
              filename = attr.fileName;
            } else if (attr instanceof Api.DocumentAttributeVideo || attr?.className === 'DocumentAttributeVideo') {
              duration = attr.duration || 0;
              width = attr.w || 0;
              height = attr.h || 0;
              fileType = 'video';
            } else if (attr instanceof Api.DocumentAttributeAudio || attr?.className === 'DocumentAttributeAudio') {
              duration = attr.duration || 0;
              fileType = 'audio';
              if (attr.title && !filename) {
                const subExt = (mimeType.split('/')[1] || 'mp3').replace('mpeg', 'mp3');
                filename = `${attr.performer ? attr.performer + ' - ' : ''}${attr.title}.${subExt}`;
              }
            } else if (attr instanceof Api.DocumentAttributeImageSize || attr?.className === 'DocumentAttributeImageSize') {
              width = attr.w || 0;
              height = attr.h || 0;
              fileType = 'image';
            } else if (attr instanceof Api.DocumentAttributeAnimated || attr?.className === 'DocumentAttributeAnimated') {
              fileType = 'video';
            }
          }

          // Skip stickers unless they are regular files
          const isSticker = (doc.attributes || []).some(
            (a: any) => a instanceof Api.DocumentAttributeSticker || a?.className === 'DocumentAttributeSticker'
          );
          if (isSticker && mimeType === 'application/x-tgsticker') {
            continue;
          }

          if (!filename) {
            const rawSub = (mimeType.split('/')[1] || '').split(';')[0].trim();
            const extMap: Record<string, string> = {
              mp4: 'mp4',
              'x-matroska': 'mkv',
              quicktime: 'mov',
              webm: 'webm',
              mpeg: 'mp3',
              ogg: 'ogg',
              opus: 'ogg',
              mp3: 'mp3',
              wav: 'wav',
              flac: 'flac',
              pdf: 'pdf',
              zip: 'zip',
              'x-rar-compressed': 'rar',
              'x-7z-compressed': '7z',
              jpeg: 'jpg',
              png: 'png',
              gif: 'gif',
            };
            const fallbackExt =
              extMap[rawSub] ||
              (fileType === 'video' ? 'mp4' : fileType === 'audio' ? 'mp3' : fileType === 'image' ? 'jpg' : rawSub || 'bin');
            const prefix = fileType !== 'unknown' ? fileType : 'file';
            filename = `${prefix}_${msg.id}.${fallbackExt}`;
          }
        }
        // 2. Photo
        else if (
          (msg.media instanceof Api.MessageMediaPhoto || (msg.media as any)?.className === 'MessageMediaPhoto') &&
          ((msg.media as any)?.photo instanceof Api.Photo || (msg.media as any)?.photo?.className === 'Photo')
        ) {
          const photo = (msg.media as any).photo;
          hasThumb = true;
          fileType = 'image';
          mimeType = 'image/jpeg';
          filename = `photo_${msg.id}.jpg`;
          const sizes = photo.sizes || [];
          const largestSize = sizes[sizes.length - 1];
          if (largestSize && 'size' in largestSize && typeof largestSize.size === 'number') {
            size = largestSize.size;
          } else if (largestSize && 'sizes' in largestSize && Array.isArray(largestSize.sizes)) {
            size = largestSize.sizes[largestSize.sizes.length - 1] || 150000;
          } else {
            size = 250000;
          }
        } else {
          continue;
        }

        const accurateMime = getAccurateMimeType(filename, mimeType);
        const fileCategory = getCategoryFromMimeAndExt(accurateMime, filename);

        if (category !== 'all' && fileCategory !== category) {
          continue;
        }

        if (
          searchQuery &&
          !filename.toLowerCase().includes(searchQuery) &&
          !(msg.message && msg.message.toLowerCase().includes(searchQuery))
        ) {
          continue;
        }

        seenIds.add(msg.id);
        const isOutgoing = Boolean((msg as any).out);
        const fileCanDelete =
          peerPermissions.type === 'saved' ||
          peerPermissions.type === 'bot' ||
          peerPermissions.type === 'user' ||
          peerPermissions.isAdmin ||
          (peerPermissions.canDelete && (isOutgoing || peerPermissions.type === 'group' || peerPermissions.type === 'supergroup'));

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
          originPeer: peerParam,
          canDelete: fileCanDelete,
          isOutgoing,
          directUrl: `/api/telegram/stream/${msg.id}/${encodeURIComponent(filename)}?peer=${encodeURIComponent(peerParam)}&uid=${encodeURIComponent(currentUid)}`,
          downloadUrl: `/api/telegram/download/${msg.id}/${encodeURIComponent(filename)}?peer=${encodeURIComponent(peerParam)}&uid=${encodeURIComponent(currentUid)}`,
          thumbnailUrl: hasThumb
            ? `/api/telegram/thumbnail/${msg.id}?peer=${encodeURIComponent(peerParam)}&uid=${encodeURIComponent(currentUid)}`
            : null,
        });
      }

      if (!nextId || nextId <= 1 || nextId === currentOffsetId || messages.length < 5) {
        hasMore = false;
        currentOffsetId = 0;
        break;
      }

      currentOffsetId = nextId;
      hasMore = true;

      // If we already gathered a good batch of media files, return immediately for fast UI response
      if (files.length >= 80) {
        break;
      }
    }

    return res.json({
      success: true,
      files,
      count: files.length,
      nextOffsetId: hasMore ? currentOffsetId : 0,
      hasMore,
      scannedMessages: totalFetchedMessages,
      permissions: peerPermissions,
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

    const currentUid = String(activeSessions.get(sessionId)?.user?.id || sessionId);
    const peer = getTargetPeer(req.query.peer, currentUid);
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

// Helper to parse Telegram URL (supports public channels, /s/ preview URLs, private /c/ links, and topic links)
function parseTelegramLinkInfo(linkStr: string): { peerParam: string; peer: any; messageId: number; isPrivate: boolean } | null {
  try {
    const clean = linkStr
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('?')[0]
      .split('#')[0];

    // 1. Match private channel/supergroup: t.me/c/1234567890/123 or t.me/c/1234567890/topicId/123
    const privateMatch = clean.match(/(?:t\.me|telegram\.me|telegram\.dog)\/c\/(\d+)(?:\/\d+)?\/(\d+)/i);
    if (privateMatch) {
      const channelNum = privateMatch[1];
      const msgId = parseInt(privateMatch[2], 10);
      const fullChannelId = channelNum.startsWith('-100') ? channelNum : `-100${channelNum}`;
      return { peerParam: fullChannelId, peer: bigInt(fullChannelId), messageId: msgId, isPrivate: true };
    }

    // 2. Match public channel/group (including /s/ web view or topic thread):
    // e.g. t.me/Grove_Street_channel/30790 or t.me/s/Grove_Street_channel/30790 or t.me/group/12/30790
    const publicMatch = clean.match(
      /(?:t\.me|telegram\.me|telegram\.dog)\/(?:s\/)?([a-zA-Z0-9_]{3,})(?:\/\d+)?\/(\d+)/i
    );
    if (publicMatch && publicMatch[1].toLowerCase() !== 'c') {
      const username = publicMatch[1];
      const msgId = parseInt(publicMatch[2], 10);
      return { peerParam: `@${username}`, peer: `@${username}`, messageId: msgId, isPrivate: false };
    }

    return null;
  } catch (e) {
    return null;
  }
}

// Helper to extract peer and messageId from internal /api/telegram/stream or /download URLs
function parseInternalStreamUrl(urlStr: string): { peerParam: string; messageId: number } | null {
  try {
    if (!urlStr || typeof urlStr !== 'string') return null;
    const match = urlStr.match(/\/api\/telegram\/(?:stream|download)\/(\d+)/i);
    if (!match) return null;
    const messageId = parseInt(match[1], 10);
    if (isNaN(messageId)) return null;
    const peerMatch = urlStr.match(/[?&]peer=([^&]+)/i);
    const peerParam = peerMatch && peerMatch[1] ? decodeURIComponent(peerMatch[1]) : 'me';
    return { peerParam, messageId };
  } catch {
    return null;
  }
}

// ----------------------------------------------------
// Parse and inspect any Telegram message link for media
// ----------------------------------------------------
app.post('/api/telegram/parse-link', async (req: Request, res: Response) => {
  try {
    const { link } = req.body;
    if (!link || typeof link !== 'string' || !link.trim()) {
      return res.status(400).json({ success: false, error: 'لینک معتبری وارد نشده است.' });
    }

    const cleanLink = link.trim();
    const parsed = parseTelegramLinkInfo(cleanLink);

    // If NOT a t.me link, check if it is a Direct Download URL (HTTP/HTTPS)
    if (!parsed) {
      if (cleanLink.startsWith('http://') || cleanLink.startsWith('https://')) {
        try {
          // Inspect direct URL via HEAD request
          let filename = 'downloaded_file';
          let mimeType = 'application/octet-stream';
          let size = 0;

          try {
            const headRes = await fetch(cleanLink, { method: 'HEAD', redirect: 'follow' });
            if (headRes.ok) {
              const ct = headRes.headers.get('content-type');
              if (ct) mimeType = ct.split(';')[0].trim();

              const cl = headRes.headers.get('content-length');
              if (cl) size = parseInt(cl, 10) || 0;

              const cd = headRes.headers.get('content-disposition');
              if (cd && cd.includes('filename=')) {
                const match = cd.match(/filename=["']?([^"';]+)["']?/i);
                if (match && match[1]) filename = match[1].trim();
              }
            }
          } catch (headErr) {
            // If HEAD fails, proceed with URL pathname
          }

          if (filename === 'downloaded_file') {
            try {
              const urlObj = new URL(cleanLink);
              const pathBase = path.basename(urlObj.pathname);
              if (pathBase && pathBase.includes('.')) {
                filename = decodeURIComponent(pathBase);
              }
            } catch (e) {}
          }

          const accurateMime = getAccurateMimeType(filename, mimeType);
          const fileCategory = getCategoryFromMimeAndExt(accurateMime, filename);

          const directMedia = {
            id: Date.now(),
            isDirectUrl: true,
            filename,
            caption: `فایل استخراج‌شده از لینک مستقیم:\n${cleanLink}`,
            mimeType: accurateMime,
            size,
            category: fileCategory,
            hasThumb: false,
            date: Date.now(),
            telegramLink: cleanLink,
            directUrl: cleanLink,
            downloadUrl: cleanLink,
            thumbnailUrl: accurateMime.startsWith('image/') ? cleanLink : null,
          };

          return res.json({ success: true, media: directMedia, isDirectUrl: true });
        } catch (directErr: any) {
          return res.status(400).json({
            success: false,
            error: 'امکان بررسی لینک مستقیم وجود ندارد یا لینک غیرقابل دسترس است.',
          });
        }
      }

      return res.status(400).json({
        success: false,
        error: 'فرمت لینک وارد شده صحیح نیست. لطفاً یک لینک تلگرام (t.me) یا لینک مستقیم دانلود (http/https) وارد کنید.',
      });
    }

    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);
    const currentUid = String(activeSessions.get(sessionId)?.user?.id || sessionId);

    // If client is connected, fetch real message via MTProto
    if (client) {
      try {
        let targetPeer = getTargetPeer(parsed.peerParam, currentUid);
        let messages: any[] = [];
        try {
          messages = await client.getMessages(targetPeer, { ids: [parsed.messageId] });
        } catch {
          // If private channel is not yet cached in GramJS, warm up dialogs once and retry
          try {
            const warmDialogs = await client.getDialogs({ limit: 300 });
            for (const d of warmDialogs) {
              if (!d.entity) continue;
              const rawId = d.entity.id?.toString();
              const dId = d.id?.toString();
              if (rawId || dId) {
                cachePeerEntityForUser(
                  currentUid,
                  [dId || '', rawId || '', rawId ? `-100${rawId}` : '', rawId ? `-${rawId}` : ''],
                  d.inputEntity || d.entity
                );
              }
            }
            targetPeer = getTargetPeer(parsed.peerParam, currentUid);
            messages = await client.getMessages(targetPeer, { ids: [parsed.messageId] });
          } catch {}
        }

        const msg = messages?.[0];

        if (!msg) {
          return res.status(404).json({
            success: false,
            error: 'پیام مورد نظر یافت نشد یا دسترسی به آن امکان‌پذیر نیست.',
          });
        }

        if (!msg.media) {
          return res.status(404).json({
            success: false,
            error: 'این لینک حاوی هیچ فایل یا رسانه‌ای (عکس، ویدیو، موزیک یا سند) نیست.',
          });
        }

        let filename = 'file';
        let mimeType = 'application/octet-stream';
        let size = 0;
        let hasThumb = false;
        let duration = 0;
        let width = 0;
        let height = 0;

        const mediaObj: any = msg.media;
        const docObj: any =
          mediaObj instanceof Api.MessageMediaDocument || mediaObj?.className === 'MessageMediaDocument'
            ? mediaObj.document
            : mediaObj?.webpage?.document || null;
        const photoObj: any =
          mediaObj instanceof Api.MessageMediaPhoto || mediaObj?.className === 'MessageMediaPhoto'
            ? mediaObj.photo
            : mediaObj?.webpage?.photo || null;

        if (docObj && (docObj instanceof Api.Document || docObj?.className === 'Document')) {
          size = Number(docObj.size || 0);
          mimeType = docObj.mimeType || 'application/octet-stream';
          hasThumb = Boolean(docObj.thumbs && docObj.thumbs.length > 0);

          for (const attr of docObj.attributes || []) {
            if (attr instanceof Api.DocumentAttributeFilename || attr?.className === 'DocumentAttributeFilename') {
              filename = attr.fileName;
            } else if (attr instanceof Api.DocumentAttributeVideo || attr?.className === 'DocumentAttributeVideo') {
              duration = attr.duration || 0;
              width = attr.w || 0;
              height = attr.h || 0;
            } else if (attr instanceof Api.DocumentAttributeAudio || attr?.className === 'DocumentAttributeAudio') {
              duration = attr.duration || 0;
              if (attr.title) {
                filename = `${attr.performer ? attr.performer + ' - ' : ''}${attr.title}.${mimeType.split('/')[1] || 'mp3'}`;
              }
            } else if (attr instanceof Api.DocumentAttributeImageSize || attr?.className === 'DocumentAttributeImageSize') {
              width = attr.w || 0;
              height = attr.h || 0;
            }
          }
          if (!filename || filename === 'file') {
            const ext = (mimeType.split('/')[1] || 'bin').split(';')[0];
            filename = `telegram_${msg.id}.${ext}`;
          }
        } else if (photoObj && (photoObj instanceof Api.Photo || photoObj?.className === 'Photo')) {
          hasThumb = true;
          mimeType = 'image/jpeg';
          filename = `photo_${msg.id}.jpg`;
          const sizes = photoObj.sizes || [];
          const largestSize = sizes[sizes.length - 1];
          if (largestSize && 'size' in largestSize && typeof largestSize.size === 'number') {
            size = largestSize.size;
          } else {
            size = 250000;
          }
        } else {
          return res.status(404).json({
            success: false,
            error: 'فرمت رسانه این پیام پشتیبانی نمی‌شود.',
          });
        }

        try {
          if (filename.includes('%')) filename = decodeURIComponent(filename);
        } catch {}

        const accurateMime = getAccurateMimeType(filename, mimeType);
        const fileCategory = getCategoryFromMimeAndExt(accurateMime, filename);

        const media = {
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
          telegramLink: link.trim(),
          peerParam: parsed.peerParam,
          chatTitle: typeof parsed.peer === 'string' ? parsed.peer : 'کانال تلگرام',
          directUrl: `/api/telegram/stream/${msg.id}/${encodeURIComponent(filename)}?peer=${encodeURIComponent(parsed.peerParam)}&uid=${encodeURIComponent(currentUid)}`,
          downloadUrl: `/api/telegram/download/${msg.id}/${encodeURIComponent(filename)}?peer=${encodeURIComponent(parsed.peerParam)}&uid=${encodeURIComponent(currentUid)}`,
          thumbnailUrl: hasThumb ? `/api/telegram/thumbnail/${msg.id}?peer=${encodeURIComponent(parsed.peerParam)}&uid=${encodeURIComponent(currentUid)}` : null,
        };

        return res.json({ success: true, media });
      } catch (mtprotoErr: any) {
        console.error('MTProto link fetch error:', mtprotoErr);
      }
    }

    // Fallback or Demo Mode link resolution
    // Generates a mock media object matching the requested link so users can test preview/copy/download
    const linkHash = Math.abs(link.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0));
    const isVideo = link.includes('video') || linkHash % 3 === 0;
    const isAudio = link.includes('audio') || link.includes('music') || linkHash % 3 === 1;

    let demoFileName = isVideo ? 'Telegram_Video_Stream.mp4' : isAudio ? 'Telegram_Audio_Track.mp3' : 'Telegram_Media_Photo.jpg';
    let demoMime = isVideo ? 'video/mp4' : isAudio ? 'audio/mpeg' : 'image/jpeg';
    let demoCategory = isVideo ? 'videos' : isAudio ? 'audio' : 'images';
    let demoSize = isVideo ? 42500000 : isAudio ? 8400000 : 1200000;
    let demoDirectUrl = isVideo 
      ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' 
      : isAudio 
      ? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
      : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop';

    const demoMedia = {
      id: parsed.messageId || 101,
      filename: demoFileName,
      caption: `رسانه استخراج‌شده از لینک تلگرام (${parsed.peerParam})\n${link}`,
      mimeType: demoMime,
      size: demoSize,
      category: demoCategory,
      hasThumb: true,
      date: Date.now(),
      duration: isVideo ? 120 : isAudio ? 240 : undefined,
      width: isVideo ? 1280 : undefined,
      height: isVideo ? 720 : undefined,
      telegramLink: link.trim(),
      peerParam: parsed.peerParam,
      chatTitle: parsed.peerParam,
      directUrl: demoDirectUrl,
      downloadUrl: demoDirectUrl,
      thumbnailUrl: isVideo ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop' : null,
      isDemoFallback: true,
    };

    return res.json({
      success: true,
      media: demoMedia,
      notice: !client ? 'برای دسترسی مستقیم با اکانت خود، لاگین کنید.' : undefined,
    });
  } catch (err: any) {
    console.error('Parse link error:', err);
    return res.status(500).json({ success: false, error: err.message || 'خطا در بررسی لینک تلگرام' });
  }
});

// ----------------------------------------------------
// Real-time Remote Transfer: Stream direct URL or Telegram post into Saved Messages ('me')
// ----------------------------------------------------
interface RemoteTask {
  id: string;
  url: string;
  filename: string;
  caption: string;
  totalSize: number;
  loadedSize: number;
  progress: number; // 0..100
  speed: string;
  speedBytesPerSec: number;
  phase: string;
  status: string;
  messageId?: number;
  error?: string;
  startedAt: number;
}

const remoteTasksMap = new Map<string, RemoteTask>();

function formatSpeedBytes(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '0 B/s';
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

// 1. Start Async Remote Upload Task (supports both direct HTTP/HTTPS URLs and Telegram Post Links)
app.post('/api/telegram/start-remote-upload', async (req: Request, res: Response) => {
  try {
    const {
      url,
      telegramLink,
      peerParam: bodyPeerParam,
      messageId: bodyMessageId,
      isDemoFallback,
      totalSize: bodyTotalSize,
      filename,
      caption,
    } = req.body;

    // Determine if this is a Telegram post transfer or a direct HTTP/HTTPS URL transfer
    let tgSource: { peerParam: string; messageId: number } | null = null;

    if (!isDemoFallback) {
      if (bodyPeerParam && bodyMessageId && !isNaN(Number(bodyMessageId))) {
        tgSource = { peerParam: String(bodyPeerParam), messageId: Number(bodyMessageId) };
      } else if (telegramLink && typeof telegramLink === 'string') {
        const parsedTg = parseTelegramLinkInfo(telegramLink);
        if (parsedTg) {
          tgSource = { peerParam: parsedTg.peerParam, messageId: parsedTg.messageId };
        }
      }
      if (!tgSource && url && typeof url === 'string') {
        const parsedFromUrl = parseTelegramLinkInfo(url) || parseInternalStreamUrl(url);
        if (parsedFromUrl) {
          tgSource = { peerParam: parsedFromUrl.peerParam, messageId: parsedFromUrl.messageId };
        }
      }
    }

    const isHttpUrl =
      typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));

    if (!tgSource && !isHttpUrl) {
      return res.status(400).json({
        success: false,
        error: 'لینک معتبر تلگرام یا لینک مستقیم دانلود وارد نشده است.',
      });
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    let finalName = filename || 'downloaded_file';
    if (finalName === 'downloaded_file' && isHttpUrl) {
      try {
        const urlObj = new URL(url);
        const base = path.basename(urlObj.pathname);
        if (base && base.includes('.')) finalName = decodeURIComponent(base);
      } catch (e) {}
    }

    const effectiveUrl = typeof url === 'string' && url ? url : telegramLink || '';

    const task: RemoteTask = {
      id: taskId,
      url: effectiveUrl,
      filename: finalName,
      caption: caption ?? (tgSource ? '' : `فایل دریافت شده از لینک مستقیم:\n${effectiveUrl}`),
      totalSize: Number(bodyTotalSize) || 0,
      loadedSize: 0,
      progress: 0,
      speed: '0 MB/s',
      speedBytesPerSec: 0,
      phase: 'downloading',
      status: 'running',
      startedAt: Date.now(),
    };

    remoteTasksMap.set(taskId, task);

    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);
    const currentUid = String(activeSessions.get(sessionId)?.user?.id || sessionId);

    // Run execution in background without blocking response
    executeRemoteTransfer(
      taskId,
      client,
      effectiveUrl,
      finalName,
      caption,
      tgSource,
      currentUid
    ).catch((err) => {
      console.error('Remote transfer background error:', err);
      const t = remoteTasksMap.get(taskId);
      if (t) {
        t.status = 'failed';
        t.phase = 'failed';
        t.error = err.message || 'خطا در دریافت و ارسال فایل';
      }
    });

    return res.json({ success: true, taskId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'خطا در ایجاد ساختار دانلود' });
  }
});


// List all active or recent remote tasks
app.get('/api/telegram/remote-uploads', (req: Request, res: Response) => {
  const tasks = Array.from(remoteTasksMap.values()).map((task) => ({
    id: task.id,
    filename: task.filename,
    totalSize: task.totalSize,
    loadedSize: task.loadedSize,
    progress: task.progress,
    speed: task.speed,
    phase: task.phase,
    status: task.status,
    messageId: task.messageId,
    error: task.error,
    startedAt: task.startedAt,
  }));
  return res.json({ success: true, tasks });
});

// 2. Cancel Remote Upload Task
app.post(['/api/telegram/cancel-remote-upload/:taskId', '/api/telegram/cancel-remote-upload'], (req: Request, res: Response) => {
  const taskId = req.params.taskId || req.body?.taskId;
  if (!taskId) {
    return res.status(400).json({ success: false, error: 'Task ID required' });
  }

  const task = remoteTasksMap.get(taskId);
  if (task) {
    task.status = 'failed';
    task.phase = 'failed';
    task.error = 'انتقال فایل توسط کاربر لغو شد.';
    return res.json({ success: true, message: 'انتقال لغو شد.' });
  }

  return res.status(404).json({ success: false, error: 'تسک یافت نشد.' });
});

// Background Transfer Execution Helper
async function executeRemoteTransfer(
  taskId: string,
  client: TelegramClient | null,
  url: string,
  filename: string,
  caption?: string,
  tgSource?: { peerParam: string; messageId: number } | null,
  currentUid?: string
) {
  const task = remoteTasksMap.get(taskId);
  if (!task) return;

  // Handle Demo Mode / Unconnected
  if (!client) {
    const simulatedTotal = task.totalSize > 0 ? task.totalSize : 35 * 1024 * 1024;
    task.totalSize = simulatedTotal;

    const startTime = Date.now();
    for (let i = 1; i <= 10; i++) {
      if (task.status === 'failed' || task.phase === 'failed') return;
      await new Promise((r) => setTimeout(r, 220));
      if (task.status === 'failed' || task.phase === 'failed') return;
      const elapsed = (Date.now() - startTime) / 1000 || 0.1;
      task.loadedSize = (simulatedTotal / 10) * i;
      task.progress = i * 10;
      const bytesPerSec = task.loadedSize / elapsed;
      task.speedBytesPerSec = bytesPerSec;
      task.speed = formatSpeedBytes(bytesPerSec);
      if (i === 5) {
        task.phase = 'uploading';
      }
    }

    task.progress = 100;
    task.status = 'completed';
    task.phase = 'completed';
    task.messageId = Date.now();
    return;
  }

  // Case A: Transferring a Telegram Post (e.g. https://t.me/Grove_Street_channel/30790) to Saved Messages ('me')
  if (tgSource) {
    let tempFilePath = '';
    try {
      const targetPeer = getTargetPeer(tgSource.peerParam, currentUid);
      const messages = await client.getMessages(targetPeer, { ids: [tgSource.messageId] });
      const srcMsg = messages?.[0];

      if (!srcMsg || !srcMsg.media) {
        throw new Error('پیام یا رسانه مورد نظر در این لینک تلگرام یافت نشد.');
      }

      const mediaObj: any = srcMsg.media;
      const targetMedia =
        mediaObj?.webpage?.document || mediaObj?.webpage?.photo || srcMsg.media;

      const finalCaption = caption !== undefined ? caption : srcMsg.message || '';

      // 1. Try instant Telegram Cloud copy to Saved Messages ('me')
      try {
        task.phase = 'uploading';
        task.progress = 65;
        task.speed = 'Cloud Direct';

        const sentMsg = await client.sendMessage('me', {
          file: targetMedia,
          message: finalCaption,
        });

        if (task.status === 'failed' || task.phase === 'failed') return;

        if (task.totalSize > 0) {
          task.loadedSize = task.totalSize;
        }
        task.progress = 100;
        task.status = 'completed';
        task.phase = 'completed';
        task.messageId = (sentMsg as any)?.id || Date.now();
        return;
      } catch (cloudCopyErr: any) {
        // Fallback: If channel has restricted forwards (CHAT_FORWARDS_RESTRICTED) or cloud copy fails,
        // stream download via MTProto and re-upload to 'me'
        console.log('Direct cloud copy restricted, falling back to MTProto stream:', cloudCopyErr?.message);
      }

      // 2. Fallback: Stream download via MTProto iterDownload -> Upload to 'me'
      task.phase = 'downloading';
      task.progress = 1;
      tempFilePath = path.join(
        '/tmp',
        `tg_tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`
      );

      const writeStream = fs.createWriteStream(tempFilePath, { highWaterMark: 1024 * 1024 });
      let downloadedBytes = 0;
      const dlStart = Date.now();

      for await (const chunk of client.iterDownload({
        file: targetMedia,
        offset: bigInt(0),
        requestSize: 256 * 1024,
      })) {
        if (task.status === 'failed' || task.phase === 'failed') {
          writeStream.destroy();
          return;
        }
        const buf = Buffer.from(chunk);
        const canWrite = writeStream.write(buf);
        if (!canWrite) {
          await new Promise<void>((resolve) => writeStream.once('drain', () => resolve()));
        }

        downloadedBytes += buf.length;
        task.loadedSize = downloadedBytes;
        if (task.totalSize > 0) {
          task.progress = Math.min(Math.round((downloadedBytes / task.totalSize) * 50), 49);
        } else {
          task.progress = 25;
        }
        const elapsedSec = (Date.now() - dlStart) / 1000 || 0.1;
        const bps = downloadedBytes / elapsedSec;
        task.speedBytesPerSec = bps;
        task.speed = formatSpeedBytes(bps);
      }

      await new Promise<void>((resolve, reject) => {
        writeStream.end(() => resolve());
        writeStream.on('error', reject);
      });

      if (task.status === 'failed' || task.phase === 'failed') return;

      task.totalSize = downloadedBytes;
      task.loadedSize = downloadedBytes;
      task.phase = 'uploading';

      const fileMime = getAccurateMimeType(filename);
      const customFile = new CustomFile(filename, downloadedBytes, tempFilePath);
      const uploadStart = Date.now();

      const uploadedMsg = await client.sendFile('me', {
        file: customFile,
        caption: finalCaption,
        forceDocument: !fileMime.startsWith('image/'),
        workers: 16,
        progressCallback: (progressFraction: number) => {
          if (task.status === 'failed' || task.phase === 'failed') {
            throw new Error('CANCELLED');
          }
          const p = Math.max(0, Math.min(1, progressFraction));
          task.progress = 50 + Math.round(p * 50);

          const uploadedBytes = Math.round(p * downloadedBytes);
          const elapsedSec = (Date.now() - uploadStart) / 1000 || 0.1;
          const bytesPerSec = uploadedBytes / elapsedSec;
          task.speedBytesPerSec = bytesPerSec;
          task.speed = formatSpeedBytes(bytesPerSec);
          task.loadedSize = uploadedBytes;
        },
      });

      if (task.status === 'failed' || task.phase === 'failed') return;

      task.progress = 100;
      task.status = 'completed';
      task.phase = 'completed';
      task.messageId = (uploadedMsg as any)?.id || Date.now();
      return;
    } catch (err: any) {
      if (err?.message === 'CANCELLED' || task.status === 'failed') {
        return;
      }
      task.status = 'failed';
      task.phase = 'failed';
      task.error = err?.message || 'خطا در انتقال پست تلگرام به سیو مسیج';
      return;
    } finally {
      if (tempFilePath) {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch {}
      }
    }
  }

  async function downloadStreamToFile(
    targetUrl: string,
    destPath: string,
    task: RemoteTask,
    maxRedirects = 10
  ): Promise<{ downloadedBytes: number; contentType: string; totalSize: number }> {
    return new Promise((resolve, reject) => {
      function doFetch(currentUrl: string, redirectsLeft: number) {
        if (redirectsLeft <= 0) {
          return reject(new Error('تعداد تغییر مسیرها (Redirects) بیش از حد مجاز است'));
        }

        let parsedUrl: URL;
        try {
          parsedUrl = new URL(currentUrl);
        } catch (e) {
          return reject(new Error('آدرس URL نامعتبر است'));
        }

        const httpClient = parsedUrl.protocol === 'https:' ? https : http;
        const req = httpClient.get(
          currentUrl,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              Accept: '*/*',
              'Accept-Encoding': 'identity',
              Connection: 'keep-alive',
            },
            timeout: 120000,
          },
          (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              const nextUrl = new URL(res.headers.location, currentUrl).toString();
              res.resume();
              return doFetch(nextUrl, redirectsLeft - 1);
            }

            if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
              res.resume();
              return reject(new Error(`خطا در دریافت فایل از سرور مقصد (کد: ${res.statusCode})`));
            }

            const contentLength = res.headers['content-length'];
            const totalSize = contentLength ? parseInt(contentLength, 10) || 0 : 0;
            const contentType = (res.headers['content-type'] as string) || '';

            if (totalSize > 0) {
              task.totalSize = totalSize;
            }

            const writeStream = fs.createWriteStream(destPath, { highWaterMark: 1024 * 1024 });
            let downloadedBytes = 0;
            const downloadStart = Date.now();

            res.on('data', (chunk: Buffer) => {
              if (task.status === 'failed' || task.phase === 'failed') {
                req.destroy();
                res.destroy();
                writeStream.destroy();
                return;
              }

              downloadedBytes += chunk.length;
              task.loadedSize = downloadedBytes;

              if (task.totalSize > 0) {
                task.progress = Math.min(Math.round((downloadedBytes / task.totalSize) * 50), 49);
              } else {
                task.progress = 25;
              }

              const elapsedSec = (Date.now() - downloadStart) / 1000 || 0.1;
              const bytesPerSec = downloadedBytes / elapsedSec;
              task.speedBytesPerSec = bytesPerSec;
              task.speed = formatSpeedBytes(bytesPerSec);
            });

            res.pipe(writeStream);

            writeStream.on('finish', () => {
              writeStream.close(() => {
                resolve({ downloadedBytes, contentType, totalSize });
              });
            });

            writeStream.on('error', (err) => {
              req.destroy();
              res.destroy();
              reject(err);
            });

            res.on('error', (err) => {
              writeStream.destroy();
              reject(err);
            });
          }
        );

        req.on('error', (err) => {
          reject(err);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('اتصال به سرور مقصد زمان‌بر شد (Timeout)'));
        });
      }

      doFetch(targetUrl, maxRedirects);
    });
  }

  // Case B: Real MTProto & Remote Direct HTTP/HTTPS Stream Execution
  const tempFilePath = path.join('/tmp', `remote_tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);

  try {
    const { downloadedBytes, contentType } = await downloadStreamToFile(url, tempFilePath, task);

    if (task.status === 'failed' || task.phase === 'failed') return;

    task.loadedSize = downloadedBytes;
    task.totalSize = downloadedBytes;
    task.phase = 'uploading';

    // Phase 2: Upload File to Telegram Saved Messages ('me')
    const fileMime = contentType || getAccurateMimeType(filename);
    const customFile = new CustomFile(filename, downloadedBytes, tempFilePath);

    const uploadStart = Date.now();

    const uploadedMsg = await client.sendFile('me', {
      file: customFile,
      caption: caption || `فایل دریافت‌شده از لینک مستقیم:\n${url}`,
      forceDocument: !fileMime.startsWith('image/'),
      workers: 16,
      progressCallback: (progressFraction: number) => {
        if (task.status === 'failed' || task.phase === 'failed') {
          throw new Error('CANCELLED');
        }
        const p = Math.max(0, Math.min(1, progressFraction));
        task.progress = 50 + Math.round(p * 50);

        const uploadedBytes = Math.round(p * downloadedBytes);
        const elapsedSec = (Date.now() - uploadStart) / 1000 || 0.1;
        const bytesPerSec = uploadedBytes / elapsedSec;
        task.speedBytesPerSec = bytesPerSec;
        task.speed = formatSpeedBytes(bytesPerSec);
        task.loadedSize = uploadedBytes;
      },
    });

    if (task.status === 'failed' || task.phase === 'failed') return;

    task.progress = 100;
    task.status = 'completed';
    task.phase = 'completed';
    task.messageId = (uploadedMsg as any)?.id || Date.now();
  } catch (err: any) {
    if (err?.message === 'CANCELLED' || task.status === 'failed') {
      return;
    }
    task.status = 'failed';
    task.phase = 'failed';
    task.error = err?.message || 'خطا در دانلود و انتقال لینک مستقیم';
  } finally {
    if (tempFilePath) {
      try { await fs.promises.unlink(tempFilePath); } catch {}
    }
  }
}

// 2. Poll Remote Transfer Task Progress & Speed
app.get('/api/telegram/remote-upload-status/:taskId', (req: Request, res: Response) => {
  const taskId = req.params.taskId;
  const task = remoteTasksMap.get(taskId);

  if (!task) {
    return res.status(404).json({ success: false, error: 'تسک پیدا نشد' });
  }

  return res.json({
    success: true,
    task: {
      id: task.id,
      filename: task.filename,
      totalSize: task.totalSize,
      loadedSize: task.loadedSize,
      progress: task.progress,
      speed: task.speed,
      phase: task.phase,
      status: task.status,
      messageId: task.messageId,
      error: task.error,
    },
  });
});

// Legacy synchronous remote-upload endpoint
app.post('/api/telegram/remote-upload', async (req: Request, res: Response) => {
  try {
    const { url, telegramLink, peerParam: bodyPeerParam, messageId: bodyMessageId, filename, caption } = req.body;
    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);
    const currentUid = String(activeSessions.get(sessionId)?.user?.id || sessionId);

    let tgSource: { peerParam: string; messageId: number } | null = null;
    if (bodyPeerParam && bodyMessageId && !isNaN(Number(bodyMessageId))) {
      tgSource = { peerParam: String(bodyPeerParam), messageId: Number(bodyMessageId) };
    } else if (telegramLink && typeof telegramLink === 'string') {
      const parsedTg = parseTelegramLinkInfo(telegramLink);
      if (parsedTg) tgSource = { peerParam: parsedTg.peerParam, messageId: parsedTg.messageId };
    } else if (url && typeof url === 'string') {
      const parsedFromUrl = parseTelegramLinkInfo(url) || parseInternalStreamUrl(url);
      if (parsedFromUrl) tgSource = { peerParam: parsedFromUrl.peerParam, messageId: parsedFromUrl.messageId };
    }

    const isHttpUrl = typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
    if (!tgSource && !isHttpUrl) {
      return res.status(400).json({ success: false, error: 'لینک معتبر تلگرام یا لینک مستقیم وارد نشده است.' });
    }

    if (!client) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return res.json({
        success: true,
        messageId: Date.now(),
        filename: filename || 'remote_file.mp4',
        message: 'فایل با موفقیت در محیط آزمایشی ثبت شد. جهت ذخیره در تلگرام واقعی، لاگین کنید.',
      });
    }

    if (tgSource) {
      const peer = getTargetPeer(tgSource.peerParam, currentUid);
      const msgs = await client.getMessages(peer, { ids: [tgSource.messageId] });
      const srcMsg = msgs?.[0];
      if (!srcMsg || !srcMsg.media) {
        return res.status(404).json({ success: false, error: 'رسانه‌ای در این پست تلگرام یافت نشد.' });
      }
      const sent = await client.sendMessage('me', {
        file: srcMsg.media,
        message: caption !== undefined ? caption : srcMsg.message || '',
      });
      return res.json({
        success: true,
        messageId: (sent as any)?.id || Date.now(),
        filename: filename || 'telegram_media',
        message: 'فایل با موفقیت به سیو مسیج تلگرام ارسال شد!',
      });
    }

    const fetchRes = await fetch(url, { redirect: 'follow' });
    if (!fetchRes.ok) {
      return res.status(400).json({
        success: false,
        error: `خطا در دریافت فایل از لینک (کد وضعیت: ${fetchRes.status})`,
      });
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let finalName = filename || 'downloaded_file';
    if (finalName === 'downloaded_file') {
      try {
        const urlObj = new URL(url);
        const base = path.basename(urlObj.pathname);
        if (base && base.includes('.')) {
          finalName = decodeURIComponent(base);
        }
      } catch (e) {}
    }

    const contentType = fetchRes.headers.get('content-type') || getAccurateMimeType(finalName);
    const tempFilePath = path.join('/tmp', `remote_up_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);
    await fs.promises.writeFile(tempFilePath, buffer);

    try {
      const customFile = new CustomFile(finalName, buffer.length, tempFilePath);

      const uploadedMessage = await client.sendFile('me', {
        file: customFile,
        caption: caption || `فایل دریافتی از لینک مستقیم:\n${url}`,
        forceDocument: !contentType.startsWith('image/'),
        workers: 16,
      });

      const msgId = (uploadedMessage as any)?.id || Date.now();

      return res.json({
        success: true,
        messageId: msgId,
        filename: finalName,
        size: buffer.length,
        mimeType: contentType,
        message: 'فایل با موفقیت به سیو مسیج تلگرام ارسال شد!',
      });
    } finally {
      if (tempFilePath) {
        try { await fs.promises.unlink(tempFilePath); } catch {}
      }
    }
  } catch (err: any) {
    console.error('Remote upload error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'خطا در دریافت فایل از لینک و ارسال به تلگرام',
    });
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

    const currentUid = String(activeSessions.get(sessionId)?.user?.id || sessionId);
    const peerParam = String(req.query.peer || 'me');
    const cacheKey = `${currentUid}_${peerParam}_${messageId}`;

    // Check RAM cache (expire after 1 hour)
    const cached = thumbMemoryCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < 3600000) {
      res.setHeader('Content-Type', cached.mime);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached.buffer);
    }

    const peer = getTargetPeer(req.query.peer, currentUid);
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

    const currentUid = String(activeSessions.get(sessionId)?.user?.id || sessionId);
    const peer = getTargetPeer(req.query.peer, currentUid);
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
      const start = Math.max(0, parseInt(parts[0], 10) || 0);
      const end = parts[1] ? Math.min(totalSize - 1, parseInt(parts[1], 10)) : totalSize - 1;
      const chunkSize = end - start + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', chunkSize);

      // Telegram MTProto requires offsets and request sizes to be aligned to 4KB (4096 bytes)
      const STREAM_CHUNK_SIZE = 128 * 1024; // 128KB
      const alignedStart = Math.floor(start / STREAM_CHUNK_SIZE) * STREAM_CHUNK_SIZE;
      let skipOffset = start - alignedStart;
      let bytesRemaining = chunkSize;

      for await (const chunk of client.iterDownload({
        file: media,
        offset: bigInt(alignedStart),
        requestSize: STREAM_CHUNK_SIZE,
      })) {
        if (res.destroyed || res.writableEnded) break;

        let chunkData = chunk;

        if (skipOffset > 0) {
          if (skipOffset >= chunkData.length) {
            skipOffset -= chunkData.length;
            continue;
          }
          chunkData = chunkData.subarray(skipOffset);
          skipOffset = 0;
        }

        if (chunkData.length > bytesRemaining) {
          chunkData = chunkData.subarray(0, bytesRemaining);
        }

        res.write(chunkData);
        bytesRemaining -= chunkData.length;

        if (bytesRemaining <= 0) break;
      }
      return res.end();
    }

    if (totalSize > 0) {
      res.setHeader('Content-Length', totalSize);
    }

    // Full Stream directly from Telegram without disk buffering
    const FULL_STREAM_CHUNK_SIZE = 256 * 1024;
    for await (const chunk of client.iterDownload({
      file: media,
      offset: bigInt(0),
      requestSize: FULL_STREAM_CHUNK_SIZE,
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

      const currentUid = String(activeSessions.get(sessionId)?.user?.id || sessionId);
      const peer = getTargetPeer(req.query.peer, currentUid);
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

// Delete a message/file from Saved Messages, Bots, PVs, Admin Channels, and Accessible Groups
app.delete('/api/telegram/file/:messageId', async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);
    const messageId = Number(req.params.messageId);

    if (!client || isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID or not authenticated' });
    }

    const rawPeer = req.query.peer ? String(req.query.peer).trim() : 'me';
    const currentUid = String(activeSessions.get(sessionId)?.user?.id || sessionId);

    const { peer: targetPeer, permissions } = await resolveTargetPeerAndEntity(
      client,
      rawPeer,
      currentUid
    );

    if (!permissions.canDelete) {
      return res.status(403).json({
        success: false,
        error: 'شما در این کانال یا گروه دسترسی لازم برای حذف فایل را ندارید.',
      });
    }

    let delRes: any;
    try {
      delRes = await client.deleteMessages(targetPeer, [messageId], { revoke: true });
    } catch (revokeErr) {
      // Fallback if revoke=true is not permitted for a specific chat type
      delRes = await client.deleteMessages(targetPeer, [messageId], { revoke: false });
    }

    // In supergroups/channels, if user is not an admin and tries to delete someone else's message,
    // Telegram returns ptsCount === 0 without throwing an exception. Verify actual deletion:
    if (
      rawPeer !== 'me' &&
      (permissions.type === 'supergroup' || permissions.type === 'channel') &&
      Array.isArray(delRes) &&
      delRes.length > 0 &&
      delRes[0]?.ptsCount === 0
    ) {
      try {
        const verifyMsgs = await client.getMessages(targetPeer, { ids: [messageId] });
        if (verifyMsgs && verifyMsgs[0] && verifyMsgs[0].media) {
          return res.status(403).json({
            success: false,
            error: 'در این گروه/کانال فقط امکان حذف فایل‌های ارسالی خودتان وجود دارد (نیاز به دسترسی ادمین حذف پیام).',
          });
        }
      } catch {}
    }

    // Invalidate thumbnail cache
    thumbMemoryCache.delete(`${currentUid}_${rawPeer}_${messageId}`);
    thumbMemoryCache.delete(`${currentUid}_me_${messageId}`);

    return res.json({ success: true, message: 'File deleted successfully' });
  } catch (err: any) {
    console.error('Delete error:', err);
    const msg = (err?.errorMessage || err?.message || '').toString();
    if (msg.includes('MESSAGE_DELETE_FORBIDDEN') || msg.includes('CHAT_ADMIN_REQUIRED')) {
      return res.status(403).json({
        success: false,
        error: 'شما دسترسی لازم برای حذف این فایل را در تلگرام ندارید.',
      });
    }
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete file' });
  }
});

// ----------------------------------------------------
// 5. Zero-Disk Upload to Saved Messages, Bots, PVs, Admin Channels & Accessible Groups
// ----------------------------------------------------
app.post('/api/telegram/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const client = getActiveClient(sessionId);

    if (!client) {
      return res.status(401).json({ error: 'Not connected to Telegram' });
    }

    const rawPeer = (req.body.peer || req.query.peer || 'me').toString().trim() || 'me';
    const currentUid = String(activeSessions.get(sessionId)?.user?.id || sessionId);

    const { peer: targetPeer, permissions } = await resolveTargetPeerAndEntity(
      client,
      rawPeer,
      currentUid
    );

    if (!permissions.canUpload) {
      return res.status(403).json({
        error: 'شما در این کانال یا گروه دسترسی ادمین یا مجوز ارسال فایل را ندارید.',
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const caption = (req.body.caption as string) || '';
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8'); // Handle UTF-8 / Persian filenames correctly

    const tempFilePath = path.join('/tmp', `up_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);
    await fs.promises.writeFile(tempFilePath, file.buffer);

    try {
      const customFile = new CustomFile(originalName, file.size, tempFilePath);

      let uploadedMessage: any;
      try {
        uploadedMessage = await client.sendFile(targetPeer, {
          file: customFile,
          caption: caption || originalName,
          forceDocument: !file.mimetype.startsWith('image/'),
          workers: 2,
        });
      } catch (sendErr: any) {
        const sendErrMsg = (sendErr?.errorMessage || sendErr?.message || '').toString();
        // If sending as photo is restricted in a group, retry sending as document
        if (sendErrMsg.includes('CHAT_SEND_PHOTOS_FORBIDDEN') && file.mimetype.startsWith('image/')) {
          const retryFile = new CustomFile(originalName, file.size, tempFilePath);
          uploadedMessage = await client.sendFile(targetPeer, {
            file: retryFile,
            caption: caption || originalName,
            forceDocument: true,
            workers: 2,
          });
        } else {
          throw sendErr;
        }
      }

      const msgId = (uploadedMessage as any)?.id || Date.now();

      return res.json({
        success: true,
        messageId: msgId,
        filename: originalName,
        size: file.size,
        mimeType: file.mimetype,
        peer: rawPeer,
        message: 'File successfully uploaded!',
      });
    } finally {
      if (tempFilePath) {
        try { await fs.promises.unlink(tempFilePath); } catch {}
      }
    }
  } catch (err: any) {
    console.error('Upload error:', err);
    const msg = (err?.errorMessage || err?.message || '').toString();
    if (
      msg.includes('CHAT_WRITE_FORBIDDEN') ||
      msg.includes('CHAT_SEND_MEDIA_FORBIDDEN') ||
      msg.includes('CHAT_SEND_DOCS_FORBIDDEN') ||
      msg.includes('CHAT_ADMIN_REQUIRED')
    ) {
      return res.status(403).json({
        error: 'ارسال فایل در این گفتگو یا کانال توسط تلگرام محدود شده است (نیاز به دسترسی ادمین یا مجوز ارسال رسانه).',
      });
    }
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
