'use client';

import { useLayoutEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';

/** Grows the field to fit its wrapped text. */
const fit = (el: HTMLTextAreaElement) => {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

/**
 * A single-line search box that wraps long queries onto new lines and grows
 * to fit them, instead of scrolling text sideways. Enter submits the form.
 */
export function SearchField({
  id,
  name,
  className,
  defaultValue,
  maxLength,
  placeholder,
}: {
  id: string;
  name: string;
  className?: string;
  defaultValue?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    fit(el);
    const observer = new ResizeObserver(() => fit(el));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onInput = (event: FormEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget;
    // Queries are one line; pasted line breaks become spaces.
    if (/[\r\n]/.test(el.value)) el.value = el.value.replace(/[\r\n]+/g, ' ');
    fit(el);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <textarea
      ref={ref}
      id={id}
      name={name}
      className={className}
      rows={1}
      defaultValue={defaultValue}
      maxLength={maxLength}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck={false}
      enterKeyHint="search"
      onInput={onInput}
      onKeyDown={onKeyDown}
    />
  );
}
