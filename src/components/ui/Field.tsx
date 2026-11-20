'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import styled from 'styled-components';
import { c, ease, font, mq, radius } from '@/styles/tokens';

export const FieldWrap = styled.div`
  display: grid;
  gap: 6px;
  min-width: 0;
`;

export const Label = styled.label`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${c.ink};

  span[data-optional] {
    font-weight: 400;
    color: ${c.muted};
    margin-left: 4px;
  }
`;

export const Hint = styled.p`
  font-size: 0.875rem;
  color: ${c.muted};
`;

export const ErrorText = styled.p`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${c.red};
`;

const controlCss = `
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid var(--line-strong);
  border-radius: ${radius.md};
  background: var(--surface);
  color: var(--ink);
  font-family: ${font.text};
  font-size: 16px;
  line-height: 1.4;
  transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
  &::placeholder { color: #9a8b7c; }
  &:focus { outline: none; border-color: var(--ink); box-shadow: 0 0 0 3px rgba(150, 80, 15, 0.22); }
  &[aria-invalid='true'] { border-color: var(--red); }
  &[aria-invalid='true']:focus { box-shadow: 0 0 0 3px rgba(184, 50, 32, 0.18); }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

export const Input = styled.input`
  ${controlCss}
`;

export const Textarea = styled.textarea`
  ${controlCss}
  min-height: 96px;
  resize: vertical;
`;

export const NativeSelect = styled.select`
  ${controlCss}
  appearance: none;
  padding-right: 40px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%231C1611' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
`;

interface FieldProps {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
}

type TextFieldProps = FieldProps & InputHTMLAttributes<HTMLInputElement>;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, optional, className, id, ...props },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  const describedBy = [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null].filter(Boolean).join(' ') || undefined;
  return (
    <FieldWrap className={className}>
      <Label htmlFor={fieldId}>
        {label}
        {optional ? <span data-optional>(opcional)</span> : null}
      </Label>
      <Input ref={ref} id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
      {hint && !error ? <Hint id={`${fieldId}-hint`}>{hint}</Hint> : null}
      {error ? (
        <ErrorText id={`${fieldId}-error`} role="alert">
          {error}
        </ErrorText>
      ) : null}
    </FieldWrap>
  );
});

type TextAreaFieldProps = FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, error, hint, optional, className, id, ...props },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldWrap className={className}>
      <Label htmlFor={fieldId}>
        {label}
        {optional ? <span data-optional>(opcional)</span> : null}
      </Label>
      <Textarea ref={ref} id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined} {...props} />
      {hint && !error ? <Hint id={`${fieldId}-hint`}>{hint}</Hint> : null}
      {error ? (
        <ErrorText id={`${fieldId}-error`} role="alert">
          {error}
        </ErrorText>
      ) : null}
    </FieldWrap>
  );
});

type SelectFieldProps = FieldProps & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({ label, error, hint, optional, className, id, children, ...props }: SelectFieldProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldWrap className={className}>
      <Label htmlFor={fieldId}>
        {label}
        {optional ? <span data-optional>(opcional)</span> : null}
      </Label>
      <NativeSelect id={fieldId} aria-invalid={error ? true : undefined} {...props}>
        {children}
      </NativeSelect>
      {hint && !error ? <Hint>{hint}</Hint> : null}
      {error ? <ErrorText role="alert">{error}</ErrorText> : null}
    </FieldWrap>
  );
}

/** Grupo de opções exclusivas em formato de botões (rádio acessível). */
const SegmentRoot = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: ${radius.md};
  background: ${c.paper2};
`;

const SegmentOption = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: ${radius.sm};
  font-weight: 600;
  font-size: 0.9375rem;
  color: ${c.muted};
  cursor: pointer;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease,
    transform 160ms ${ease.out};
  user-select: none;

  svg {
    width: 18px;
    height: 18px;
  }

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  &:has(input:checked) {
    background: ${c.surface};
    color: ${c.ink};
    box-shadow: 0 1px 2px rgba(28, 22, 17, 0.12);
  }

  &:has(input:focus-visible) {
    outline: 2px solid ${c.focus};
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.98);
  }

  ${mq.hover} {
    &:hover:not(:has(input:checked)) {
      color: ${c.ink};
    }
  }
`;

interface SegmentedProps<T extends string> {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: ReactNode; disabled?: boolean }[];
  ariaLabel: string;
}

export function Segmented<T extends string>({ name, value, onChange, options, ariaLabel }: SegmentedProps<T>) {
  return (
    <SegmentRoot role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <SegmentOption key={option.value} aria-disabled={option.disabled || undefined}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={() => onChange(option.value)}
          />
          {option.icon}
          {option.label}
        </SegmentOption>
      ))}
    </SegmentRoot>
  );
}
