import path from 'node:path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendTemplatePath = path.resolve(__dirname, '../frontend/src/utils/operationalInspectionTemplate.js');
const { OPERATIONAL_INSPECTION_TEMPLATE } = await import('file://' + frontendTemplatePath);

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const SESSION_SECRET = process.env.SESSION_SECRET || 'copmec-dev-session-secret-change-me';
const SESSION_TTL = process.env.SESSION_TTL_SECONDS || 12 * 60 * 60;

async function upsert() {
  try {
    // create a master session token and send it as cookie so the backend accepts the request
    const token = jwt.sign({ type: 'master', userId: 'bootstrap-master' }, SESSION_SECRET, {
      expiresIn: Number(SESSION_TTL) || 12 * 60 * 60,
      issuer: 'copmec-api',
      audience: 'copmec-web',
    });
    const resp = await fetch(`${BACKEND_URL}/api/warehouse/process-audits/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `copmec_session=${token}` },
      body: JSON.stringify({ template: OPERATIONAL_INSPECTION_TEMPLATE }),
    });
    const text = await resp.text();
    console.log('HTTP', resp.status, resp.statusText);
    const ctype = String(resp.headers.get('content-type') || '').toLowerCase();
    if (!resp.ok) {
      console.error('Non-OK response body:', text.slice(0, 2000));
      process.exit(2);
    }
    if (ctype.includes('application/json')) {
      const data = JSON.parse(text);
      console.log('Template upserted, templateId:', data?.templateId);
      process.exit(0);
    }
    console.log('Response (non-JSON):', text.slice(0, 2000));
    process.exit(0);
    process.exit(0);
  } catch (err) {
    console.error('Upsert failed:', err.message || err);
    process.exit(3);
  }
}

upsert();
