'use client';

import { Eye, EyeOff, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { ApiError, apiFetch } from '@/client/api';
import { unlockAudio } from '@/client/sound';
import { c, ease, font, mq, radius } from '@/styles/tokens';
import { Logo } from '../site/Logo';
import { Button, IconButton } from '../ui/Button';
import { ErrorText, FieldWrap, Input, Label, TextField } from '../ui/Field';

interface Captcha {
  token: string;
  image: string;
}

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [answer, setAnswer] = useState('');
  const [spins, setSpins] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCaptcha = useCallback(async () => {
    try {
      const next = await apiFetch<Captcha>('/api/auth/captcha');
      setCaptcha(next);
      setAnswer('');
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Não foi possível gerar o desafio.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const first = async () => {
      try {
        const next = await apiFetch<Captcha>('/api/auth/captcha');
        if (!cancelled) setCaptcha(next);
      } catch (error) {
        if (!cancelled) setFormError(error instanceof ApiError ? error.message : 'Não foi possível gerar o desafio.');
      }
    };
    void first();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = () => {
    setSpins((n) => n + 1);
    setCaptcha(null);
    void loadCaptcha();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Informe o e-mail de acesso';
    if (!password) next.password = 'Informe a senha';
    if (!/^-?\d{1,4}$/.test(answer.trim())) next.captchaAnswer = 'Digite o resultado da conta';
    setErrors(next);
    if (Object.keys(next).length || !captcha) return;

    const website = (new FormData(event.currentTarget).get('website') as string | null) ?? '';
    setSubmitting(true);
    try {
      // O clique de login libera o áudio do navegador para o alerta de pedidos.
      void unlockAudio();
      await apiFetch('/api/auth/login', {
        method: 'POST',
        json: { email: email.trim(), password, captchaToken: captcha.token, captchaAnswer: answer.trim(), website },
      });
      router.replace('/admin/pedidos');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setErrors(error.fields);
      } else {
        setFormError('Não foi possível entrar. Tente de novo.');
      }
      setSubmitting(false);
      refresh();
    }
  };

  return (
    <Page>
      <Brand>
        <div>
          <Logo size={88} tone="light" showName={false} />
          <h1>Painel da SR Burguer</h1>
          <p>Pedidos em tempo real, cardápio, promoções e horário da loja em um só lugar.</p>
        </div>
        <Secure>
          <ShieldCheck aria-hidden />
          Acesso restrito à equipe da loja. Tentativas repetidas bloqueiam o acesso por 15 minutos.
        </Secure>
      </Brand>

      <FormSide>
        {/* method="post": mesmo sem JavaScript, a senha nunca vai para a URL. */}
        <Card method="post" onSubmit={submit} noValidate aria-labelledby="titulo-login">
          <CardHead>
            <span>
              <LockKeyhole aria-hidden />
            </span>
            <h2 id="titulo-login">Entrar no painel</h2>
          </CardHead>

          <TextField
            label="E-mail"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            value={email}
            error={errors.email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <FieldWrap>
            <Label htmlFor="senha">Senha</Label>
            <PasswordRow>
              <Input
                id="senha"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                aria-invalid={errors.password ? true : undefined}
                onChange={(e) => setPassword(e.target.value)}
              />
              <IconButton type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              </IconButton>
            </PasswordRow>
            {errors.password ? <ErrorText role="alert">{errors.password}</ErrorText> : null}
          </FieldWrap>

          <FieldWrap>
            <Label htmlFor="desafio">Verificação</Label>
            <CaptchaRow>
              <CaptchaImage aria-live="polite">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {captcha ? <img src={captcha.image} alt="Desafio visual: uma conta para resolver" width={240} height={64} /> : <span>Gerando desafio...</span>}
              </CaptchaImage>
              <Refresh type="button" aria-label="Gerar outro desafio" onClick={refresh} style={{ ['--spins' as string]: spins }}>
                <RefreshCw aria-hidden />
              </Refresh>
            </CaptchaRow>
            <Input
              id="desafio"
              name="captcha"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Resultado da conta"
              value={answer}
              maxLength={5}
              aria-invalid={errors.captchaAnswer ? true : undefined}
              onChange={(e) => setAnswer(e.target.value.replace(/[^\d-]/g, ''))}
            />
            {errors.captchaAnswer ? <ErrorText role="alert">{errors.captchaAnswer}</ErrorText> : null}
          </FieldWrap>

          {/* Campo isca: invisível para pessoas, preenchido por robôs. */}
          <Honeypot aria-hidden="true">
            <label>
              Site
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </Honeypot>

          {formError ? (
            <FormError role="alert" aria-live="assertive">
              {formError}
            </FormError>
          ) : null}

          <Button type="submit" data-size="lg" data-block="true" data-loading={submitting} disabled={submitting || !captcha}>
            Entrar no painel
          </Button>
        </Card>
      </FormSide>
    </Page>
  );
}

const Page = styled.main`
  display: grid;
  min-height: 100svh;
  background: ${c.paper};

  ${mq.lg} {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
`;

const Brand = styled.section`
  display: none;
  background: ${c.night};
  color: ${c.cream};
  padding: 56px;

  ${mq.lg} {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  div {
    display: grid;
    gap: 20px;
    max-width: 440px;
    margin-top: 12vh;
  }

  h1 {
    font-size: clamp(2.25rem, 1.6rem + 2vw, 3.25rem);
    color: ${c.cream};
  }

  p {
    font-size: 1.125rem;
    color: ${c.creamMuted};
  }
`;

const Secure = styled.p`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  max-width: 420px;
  font-size: 0.9375rem;
  color: ${c.creamMuted};

  svg {
    flex: none;
    width: 20px;
    height: 20px;
    color: ${c.amber};
  }
`;

const FormSide = styled.section`
  display: grid;
  place-items: center;
  padding: 32px 16px;
`;

const Card = styled.form`
  display: grid;
  gap: 18px;
  width: min(420px, 100%);
  padding: 28px;
  border: 1px solid ${c.line};
  border-radius: ${radius.lg};
  background: ${c.surface};
  box-shadow: 0 24px 60px -32px rgba(23, 17, 13, 0.35);

  ${mq.md} {
    padding: 36px;
  }
`;

const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;

  span {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: ${radius.md};
    background: ${c.ink};
    color: ${c.amber};
  }

  svg {
    width: 20px;
    height: 20px;
  }

  h2 {
    font-family: ${font.display};
    font-size: 1.5rem;
  }
`;

const PasswordRow = styled.div`
  display: flex;
  gap: 8px;

  button {
    width: 48px;
    height: 48px;
    border-color: ${c.lineStrong};
  }
`;

const CaptchaRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: stretch;
`;

const CaptchaImage = styled.div`
  flex: 1;
  display: grid;
  place-items: center;
  min-height: 64px;
  overflow: hidden;
  border: 1px solid ${c.line};
  border-radius: ${radius.md};
  background: #f7f1e6;
  font-size: 0.875rem;
  color: ${c.muted};

  img {
    width: 100%;
    height: 64px;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
  }
`;

const Refresh = styled(IconButton)`
  width: 48px;
  height: auto;
  border-color: ${c.lineStrong};

  svg {
    transform: rotate(calc(var(--spins, 0) * 360deg));
    transition: transform 520ms ${ease.out};
  }
`;

const Honeypot = styled.div`
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
`;

const FormError = styled.p`
  padding: 10px 12px;
  border-radius: ${radius.sm};
  background: ${c.redSoft};
  color: ${c.red};
  font-size: 0.9375rem;
  font-weight: 500;
`;
