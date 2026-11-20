'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { Drawer } from 'vaul';
import { useMediaQuery } from '@/client/hooks';
import { c, ease, font, mq, radius, shadow } from '@/styles/tokens';
import { IconButton } from './Button';

/**
 * Painel responsivo:
 *  - celular: bottom sheet com arrastar para fechar (Vaul, curva do iOS);
 *  - desktop: painel lateral ou modal centralizado (Radix Dialog).
 * Os dois herdam foco preso, Esc para fechar e rótulos acessíveis do Radix.
 */
interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: string;
  desktop?: 'side' | 'center';
  size?: 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
  headerExtra?: ReactNode;
}

export function Sheet({ open, onOpenChange, title, description, desktop = 'side', size = 'md', children, footer, headerExtra }: SheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <DialogOverlay />
          <DialogContent data-placement={desktop} data-size={size} {...(description ? {} : { 'aria-describedby': undefined })}>
            <Header>
              <Title as={Dialog.Title}>{title}</Title>
              {headerExtra}
              <Dialog.Close asChild>
                <IconButton aria-label="Fechar">
                  <X aria-hidden />
                </IconButton>
              </Dialog.Close>
            </Header>
            {description ? <Dialog.Description className="visually-hidden">{description}</Dialog.Description> : null}
            <Body>{children}</Body>
            {footer ? <Footer>{footer}</Footer> : null}
          </DialogContent>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <DrawerOverlay />
        <DrawerContent {...(description ? {} : { 'aria-describedby': undefined })}>
          <Handle />
          <Header>
            <Title as={Drawer.Title}>{title}</Title>
            {headerExtra}
            <Drawer.Close asChild>
              <IconButton aria-label="Fechar">
                <X aria-hidden />
              </IconButton>
            </Drawer.Close>
          </Header>
          {description ? <Drawer.Description className="visually-hidden">{description}</Drawer.Description> : null}
          <Body>{children}</Body>
          {footer ? <Footer>{footer}</Footer> : null}
        </DrawerContent>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const fadeOut = keyframes`from { opacity: 1; } to { opacity: 0; }`;
const slideIn = keyframes`from { transform: translateX(100%); } to { transform: translateX(0); }`;
const slideOut = keyframes`from { transform: translateX(0); } to { transform: translateX(100%); }`;
const popIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -47%) scale(0.97); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;
const popOut = keyframes`
  from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  to { opacity: 0; transform: translate(-50%, -48.5%) scale(0.98); }
`;

const overlayCss = `
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(23, 17, 13, 0.5);
`;

const DialogOverlay = styled(Dialog.Overlay)`
  ${overlayCss}
  &[data-state='open'] {
    animation: ${fadeIn} 220ms ${ease.out};
  }
  &[data-state='closed'] {
    animation: ${fadeOut} 180ms ease forwards;
  }
`;

const DrawerOverlay = styled(Drawer.Overlay)`
  ${overlayCss}
`;

const DialogContent = styled(Dialog.Content)`
  position: fixed;
  z-index: 61;
  display: flex;
  flex-direction: column;
  background: ${c.surface};
  color: ${c.ink};
  box-shadow: ${shadow.raised};
  outline: none;

  &[data-placement='side'] {
    top: 0;
    right: 0;
    bottom: 0;
    width: min(460px, 100vw);
    border-left: 1px solid ${c.line};
  }
  &[data-placement='side'][data-state='open'] {
    animation: ${slideIn} 340ms ${ease.drawer};
  }
  &[data-placement='side'][data-state='closed'] {
    animation: ${slideOut} 240ms ${ease.drawer} forwards;
  }

  &[data-placement='center'] {
    top: 50%;
    left: 50%;
    width: min(560px, calc(100vw - 32px));
    max-height: min(860px, calc(100dvh - 48px));
    border-radius: ${radius.lg};
    transform: translate(-50%, -50%);
  }
  &[data-placement='center'][data-size='lg'] {
    width: min(720px, calc(100vw - 32px));
  }
  &[data-placement='center'][data-state='open'] {
    animation: ${popIn} 240ms ${ease.out};
  }
  &[data-placement='center'][data-state='closed'] {
    animation: ${popOut} 160ms ease forwards;
  }
`;

const DrawerContent = styled(Drawer.Content)`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 61;
  display: flex;
  flex-direction: column;
  max-height: 94vh;
  max-height: 94dvh;
  background: ${c.surface};
  color: ${c.ink};
  border-radius: 16px 16px 0 0;
  box-shadow: ${shadow.sheet};
  outline: none;
`;

const Handle = styled(Drawer.Handle)`
  &[data-vaul-handle] {
    width: 40px;
    height: 4px;
    margin: 10px auto 2px;
    border-radius: 2px;
    background: ${c.lineStrong};
    opacity: 1;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 8px 20px;
  border-bottom: 1px solid ${c.line};
  min-height: 60px;

  ${mq.md} {
    padding: 12px 14px 12px 24px;
    min-height: 68px;
  }
`;

const Title = styled.h2`
  flex: 1;
  min-width: 0;
  font-family: ${font.display};
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.15;
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 16px 20px 24px;

  ${mq.md} {
    padding: 20px 24px 28px;
  }
`;

const Footer = styled.div`
  padding: 12px 20px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid ${c.line};
  background: ${c.surface};

  ${mq.md} {
    padding: 16px 24px;
  }
`;
