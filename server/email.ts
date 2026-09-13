import nodemailer from 'nodemailer';

export type SendLoginCode = (address: string, code: string) => Promise<void>;

export function createLoginCodeSender(env: NodeJS.ProcessEnv): SendLoginCode {
  return async (address, code) => {
    const user = env.SMTP_USER, password = env.SMTP_PASSWORD?.replace(/\s/g, '');
    if (!user || !password || user.toLowerCase() !== address.toLowerCase() || address.toLowerCase() !== (env.RECOVERY_EMAIL || '').toLowerCase()) {
      throw Object.assign(new Error('Email provider not configured.'), { status: 503 });
    }
    const port = Number(env.SMTP_PORT || 465);
    const transport = nodemailer.createTransport({ host: env.SMTP_HOST || 'smtp.gmail.com', port, secure: port === 465,
      requireTLS: port !== 465, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      auth: { user, pass: password } });
    try {
      await transport.sendMail({ from: { name: 'CultoGen', address }, to: address,
        subject: 'Seu código de confirmação do CultoGen',
        text: `Seu código de confirmação é ${code}. Ele expira em 10 minutos. Se você não solicitou este acesso, ignore este email.`,
        disableFileAccess: true, disableUrlAccess: true });
    } finally { transport.close(); }
  };
}
