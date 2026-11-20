import type { NextApiRequest, NextApiResponse } from 'next';
import { getApp } from '@/server/app';

/**
 * Ponte entre a API Route do Next.js e o Express.
 * bodyParser desligado: o Express lê o corpo; externalResolver: o Express responde.
 */
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
    responseLimit: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  return new Promise((resolve) => {
    res.once('finish', resolve);
    res.once('close', resolve);
    getApp()(req, res);
  });
}
